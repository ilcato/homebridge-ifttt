// IFTTT Platform plugin for HomeBridge
//
// Remember to add platform to config.json. Example:
// "platforms": [
//             {
//             "platform": "IFTTT",
//             "name": "IFTTT",
//             "makerkey": "PUT KEY OF YOUR MAKER CHANNEL HERE",
//             "accessories": [{
//                     "name": "Accessory 1",
//                     "buttons": [
//                     	{
//                     		"caption": "A1-1",
//                     		"triggerOn": "T1-1On",
//                     		"triggerOff": "T1-1Off",
//                      	"delayOn": 4,
//                      	"delayOff": 3,
//                      	"stateful": true
//                     	},{
//                     		"caption": "A1-2",
//                     		"triggerOn": "T1-2On",
//                     		"triggerOff": "T1-2Off",
//                      	"delayOff": 1
//                     	},{
//                     		"caption": "A1-3",
//                     		"trigger": "T1-3",
//                      	"delayOn": 5
//                     	},{
//                     		"caption": "A1-4",
//                     		"trigger": "T1-4"
//                     	}
//                     ]
//             	}, {
//                     "name": "Accessory 2",
//                     "buttons": [
//                     	{
//                     		"caption": "A2-1",
//                     		"trigger": "T2-1"
//                     	},{
//                     		"caption": "A2-2",
//                     		"trigger": "T2-2"
//                     	},{
//                     		"caption": "A2-3",
//                     		"trigger": "T2-3"
//                     	},{
//                     		"caption": "A2-4",
//                     		"trigger": "T2-4"
//                     	}
//                     ]
//             	}
//             ]
//         }
// ],
//
// If you specify both "triggerOn" and "triggerOff" values to a button it will generate
// different triggers for the two different status of the switch.
// If you only specify the "trigger" value to a button it behaves like a push button
// generating the trigger after the selection of the button and automatically returning
// to the off status.
//
// You can delay triggers using delayOn and delayOff.
// If you have a button with triggerOn and triggerOff, the actions can be delayed
// by delayOn and delayOff respectively.
//
// If you have a button with only "trigger" specified, the trigger can be delayed using delayOn.
//
// If you leave out delayOn or delayOff it will be treated as if there is no delay.
// This means you can have delayOn without delayOff and vice versa or even leave both values out.
// All delay values are specified in seconds.
//
// If you use the optional "stateful" config, the switch will maintain state across shutdown/reboots.
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.

'use strict';

var Service, Characteristic, HomebridgeAPI;
var request = require("request");


function IFTTTPlatform(log, config){
  	this.log          = log;
  	this.makerkey     = config["makerkey"];
  	this.IFTTTaccessories = config["accessories"];
}

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerPlatform("homebridge-ifttt", "IFTTT", IFTTTPlatform);
}

IFTTTPlatform.prototype = {
  accessories: function(callback) {
      this.log("Loading accessories...");

      var that = this;
      var foundAccessories = [];
      if (this.IFTTTaccessories == null || this.IFTTTaccessories.length == 0) {
      	callback(foundAccessories);
      	return;
      }

      this.cacheDirectory = HomebridgeAPI.user.persistPath();
      this.storage = require('node-persist');
      this.storage.initSync({dir:this.cacheDirectory, forgiveParseErrors: true});

	  this.IFTTTaccessories.map(function(s) {
		that.log("Found: " + s.name);
			var accessory = null;
			if (s.buttons.length != 0) {
				var services = [];
				for (var b = 0; b < s.buttons.length; b++) {
					var service = {
						controlService: new Service.Switch(s.buttons[b].caption),
						characteristics: [Characteristic.On]
					};
					service.controlService.subtype = s.buttons[b].trigger != null ? s.buttons[b].trigger : s.buttons[b].triggerOn + s.buttons[b].triggerOff;
					service.controlService.trigger = s.buttons[b].trigger;
					service.controlService.triggerOn = s.buttons[b].triggerOn;
					service.controlService.triggerOff = s.buttons[b].triggerOff;
					service.controlService.delayOn = s.buttons[b].delayOn;
          service.controlService.delayOff = s.buttons[b].delayOff;
          service.controlService.stateful = s.buttons[b].stateful;
          // Read saved state and set initial
          if (service.controlService.stateful) {
            var cachedState = that.storage.getItemSync(service.controlService.displayName);
            if((cachedState === undefined) || (cachedState === false)) {
              service.controlService.onoffstate = false;
            } else {
              service.controlService.onoffstate = true;
            }
            that.log("Loading service: " + service.controlService.displayName + ", subtype: " + service.controlService.subtype + ", RestoredState: " + service.controlService.onoffstate);
          } else {
            service.controlService.onoffstate = false;
            that.log("Loading service: " + service.controlService.displayName + ", subtype: " + service.controlService.subtype);
          }
          services.push(service);
				}
				accessory = new IFTTTAccessory(services);
			}
			if (accessory != null) {
				accessory.getServices = function() {
						return that.getServices(accessory);
				};
				accessory.platform 			= that;
				accessory.remoteAccessory	= s;
				accessory.name				= s.name;
				accessory.model				= "IFTTT";
				accessory.manufacturer		= "IFTTT";
				accessory.serialNumber		= "<unknown>";
				foundAccessories.push(accessory);

			}
		}
  )
      callback(foundAccessories);
  },
  command: function(c,value, that) {
    var url = "https://maker.ifttt.com/trigger/"+c+"/with/key/"+this.makerkey;
	var method = "get";
    request({
	    url: url,
		method: method
    }, function(err, response) {
      if (err) {
        that.platform.log("There was a problem sending command " + c + " to" + that.name);
        that.platform.log(url);
      } else {
        that.platform.log(that.name + " sent command " + c);
        that.platform.log(url);
      }
    });
  },
  getInformationService: function(homebridgeAccessory) {
    var informationService = new Service.AccessoryInformation();
    informationService
                .setCharacteristic(Characteristic.Name, homebridgeAccessory.name)
				.setCharacteristic(Characteristic.Manufacturer, homebridgeAccessory.manufacturer)
			    .setCharacteristic(Characteristic.Model, homebridgeAccessory.model)
			    .setCharacteristic(Characteristic.SerialNumber, homebridgeAccessory.serialNumber);
  	return informationService;
  },
  bindCharacteristicEvents: function(characteristic, service, homebridgeAccessory) {
  	var onOff = characteristic.props.format == "bool" ? true : false;
    	characteristic
		.on('set', function(value, callback, context) {
            if (context !== 'fromSetValue') {
							var trigger = null;
							var delayOn = service.controlService.delayOn;
							var delayOff = service.controlService.delayOff;
							if (service.controlService.trigger != null)
								trigger = service.controlService.trigger;
							else if (value == 0) {
								trigger = service.controlService.triggerOff;
								service.controlService.onoffstate = false;
							} else {
								trigger = service.controlService.triggerOn;
								service.controlService.onoffstate = true;
							}

							if(shouldDelayCommand(value, delayOn, delayOff)){
								homebridgeAccessory.platform.log(trigger + " scheduled to run in " + getDelay(value, delayOn, delayOff)/1000 + " seconds.");
								setTimeout(function() {
									homebridgeAccessory.platform.command(trigger, "", homebridgeAccessory);
								}, getDelay(value, delayOn, delayOff));
							} else {
								homebridgeAccessory.platform.command(trigger, "", homebridgeAccessory);
							}

							if (service.controlService.trigger != null) {
								// In order to behave like a push button reset the status to off
								setTimeout( function(){
									characteristic.setValue(false, undefined, 'fromSetValue');
								}, 100 );
							}
              // Save state
              if (service.controlService.stateful) {
                this.storage.setItemSync(service.controlService.displayName, value);
              }
            }
						callback();
				   }.bind(this) );
    characteristic
        .on('get', function(callback) {
        				if (service.controlService.trigger != null)
							// a push button is normally off
							callback(undefined, false);
						else {
							callback(undefined, service.controlService.onoffstate);
						}
                   }.bind(this) );
  },
  getServices: function(homebridgeAccessory) {
  	var services = [];
  	var informationService = homebridgeAccessory.platform.getInformationService(homebridgeAccessory);
  	services.push(informationService);
  	for (var s = 0; s < homebridgeAccessory.services.length; s++) {
		var service = homebridgeAccessory.services[s];
		for (var i=0; i < service.characteristics.length; i++) {
			var characteristic = service.controlService.getCharacteristic(service.characteristics[i]);
			if (characteristic == undefined)
				characteristic = service.controlService.addCharacteristic(service.characteristics[i]);
			homebridgeAccessory.platform.bindCharacteristicEvents(characteristic, service, homebridgeAccessory);
		}
		services.push(service.controlService);
    }
    return services;
  }
}

function IFTTTAccessory(services) {
    this.services = services;
}

function shouldDelayCommand(value, delayOn, delayOff){
	if(value === 1){
		return delayOn;
	} else if (value === 0){
		return delayOff;
	}
	return false;
}

function getDelay(value, delayOn, delayOff){
	var multiplier = 1000;
	if(value === 1 && delayOn){
		var result = delayOn * multiplier;
		return result;
	} else if (value === 0 && delayOff){
		var result = delayOff * multiplier;
		return result;
	}
	return 0;
}
