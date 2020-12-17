// IFTTT Platform plugin for HomeBridge
//
// Remember to add platform to config.json. Example:
//   "platforms": [
//     {
//       "platform": "IFTTT",
//       "name": "IFTTT",
//       "makerkey": "PUT KEY OF YOUR MAKER CHANNEL HERE",
//       "accessories": [
//         {
//           "name": "Accessory 1",
//           "buttons": [
//             {
//               "caption": "A1-1",
//               "triggerOn": "T1-1On",
//               "triggerOff": "T1-1Off",
//               "delayOn": 4,
//               "delayOff": 3,
//               "stateful": true
//             },
//             {
//               "caption": "A1-1 with Values",
//               "triggerOn": "T1-1On-Values",
//               "triggerOff": "T1-1Off-Values",
//               "delayOn": 4,
//               "delayOff": 3,
//               "valuesOn": {
//                 "value1": "test-on-value-1",
//                 "value2": "test-on-value-2",
//                 "value3": "test-on-value-3"
//               },
//               "valuesOff": {
//                 "value1": "test-off-value-1",
//                 "value2": "test-off-value-2",
//                 "value3": "test-off-value-3"
//               },
//               "stateful": true
//             },
//             {
//               "caption": "A1-2",
//               "triggerOn": "T1-2On",
//               "triggerOff": "T1-2Off",
//               "delayOff": 1
//             },
//             {
//               "caption": "A1-2 with Values",
//               "triggerOn": "T1-2On-Values",
//               "triggerOff": "T1-2Off-Values",
//               "delayOff": 1,
//               "valuesOff": {
//                 "value1": "test-off-value-1",
//                 "value2": "test-off-value-2"
//               }
//             },
//             {
//               "caption": "A1-3",
//               "trigger": "T1-3",
//               "delayOn": 5
//             },
//             {
//               "caption": "A1-3 with Values",
//               "trigger": "T1-3-Values",
//               "delayOn": 5,
//               "values": {
//                 "value1": "test-value-1"
//               }
//             },
//             {
//               "caption": "A1-4",
//               "trigger": "T1-4"
//             },
//             {
//               "caption": "A1-4 with Values",
//               "trigger": "T1-4-values",
//               "values": {
//                 "value1": "test-value-1"
//               }
//             }
//           ]
//         },
//         {
//           "name": "Accessory 2",
//           "buttons": [
//             {
//               "caption": "A2-1",
//               "trigger": "T2-1"
//             },
//             {
//               "caption": "A2-2",
//               "trigger": "T2-2"
//             },
//             {
//               "caption": "A2-3",
//               "trigger": "T2-3"
//             },
//             {
//               "caption": "A2-4",
//               "trigger": "T2-4"
//             }
//           ]
//         },
//         {
//           "name": "Accessory 3",
//           "buttons": [
//             {
//               "caption": "A3-1",
//               "trigger": "T3-1",
//               "values": {
//                 "value1": "A"
//               }
//             },
//             {
//               "caption": "A3-2",
//               "trigger": "T3-1",
//               "values": {
//                 "value1": "B"
//               }
//             },
//             {
//               "caption": "A3-3",
//               "trigger": "T3-1",
//               "values": {
//                 "value1": "C"
//               }
//             }
//           ]
//         },
//         {
//           "name": "Accessory 4",
//           "buttons": [
//             {
//               "caption": "A4-1",
//               "trigger": "T4-1",
//               "valuesOn": {
//                 "value1": "A"
//               },
//               "valuesOff": {
//                 "value1": "B"
//               }
//             }
//           ]
//         }
//       ]
//     }
//   ]
//
// If you specify both "triggerOn" and "triggerOff" values to a button configuration, it will
// generate different triggers for the two different statuses of the switch.
// If you only specify the "trigger" value to a button configuration, it will behave like a
// push button generating the trigger after the selection of the button and automatically
// returning to the off status.
//
// You can send up to 3 values (IFTTT limit) alone with a button press.
// Use "values" to specify which values to send.
// If you'd like to send different values for "triggerOn" and "triggerOff",
// use "valuesOn" and "valuesOff" respectively instead.
// You can also just use "valuesOn" and "valuesOff" with "trigger".
//
// You can delay triggers using "delayOn" and "delayOff".
// If you have a button with "triggerOn" and "triggerOff", the actions can be delayed
// by "delayOn" and "delayOff" respectively.
//
// If you have a button with only "trigger" specified, the trigger can be delayed using "delayOn".
//
// If you leave out "delayOn" or "delayOff" it will be treated as if there is no delay.
// This means you can have "delayOn" without "delayOff" and vice versa or even leave both values out.
// All delay values are specified in seconds.
//
// If you use the optional "stateful" config, the switch will maintain state across shutdown/reboots.
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.

'use strict';

var Service, Characteristic, HomebridgeAPI;
var request = require('request');


function IFTTTPlatform(log, config) {
  this.log = log;
  this.makerkey = config['makerkey'];
  this.IFTTTaccessories = config['accessories'];
}

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerPlatform('homebridge-ifttt', 'IFTTT', IFTTTPlatform);
};

IFTTTPlatform.prototype = {
  accessories: function (callback) {
    this.log('Loading accessories...');
    
    var that = this;
    var foundAccessories = [];
    if (this.IFTTTaccessories == null || this.IFTTTaccessories.length == 0) {
      callback(foundAccessories);
      return;
    }
    
    this.cacheDirectory = HomebridgeAPI.user.persistPath();
    this.storage = require('node-persist');
    this.storage.initSync({dir: this.cacheDirectory, forgiveParseErrors: true});
    
    var subtypes = [];
    
    function generateSubtype(button) {
      function valuesToString(values) {
        return JSON.stringify(values).replace(/\W/g, '');
      }
      var result = (button.trigger || (button.triggerOn + button.triggerOff)) +
        (button.values != null ? '-v' + valuesToString(button.values) : '') +
        (button.valuesOn != null ? '-vOn' + valuesToString(button.valuesOn) : '') +
        (button.valuesOff != null ? '-vOff' + valuesToString(button.valuesOff) : '');
      var duplicateSubtype = subtypes.find(function (subtype) {
        return subtype.indexOf(result) === 0;
      });
      if (duplicateSubtype) {
        var num = duplicateSubtype.replace(/^.*___(\d+)$/, '$1');
        num = parseInt(num == result ? '1' : num);
        result += '___' + (num + 1);
      }
      subtypes.unshift(result);
      return result;
    }
    
    this.IFTTTaccessories.map(function (s) {
        that.log('Found: ' + s.name);
        var accessory = null;
        if (s.buttons.length != 0) {
          var services = s.buttons.map(function (button) {
            var service = {
              controlService: new Service.Switch(button.caption),
              characteristics: [Characteristic.On]
            };
            service.controlService.subtype = generateSubtype(button);
            service.controlService.trigger = button.trigger;
            service.controlService.triggerOn = button.triggerOn;
            service.controlService.triggerOff = button.triggerOff;
            service.controlService.values = button.values;
            service.controlService.valuesOn = button.valuesOn;
            service.controlService.valuesOff = button.valuesOff;
            service.controlService.delayOn = button.delayOn;
            service.controlService.delayOff = button.delayOff;
            service.controlService.stateful = button.stateful;
            // Read saved state and set initial
            if (service.controlService.stateful) {
              var cachedState = that.storage.getItemSync(service.controlService.displayName);
              service.controlService.onoffstate = !((cachedState === undefined) || (cachedState === false));
              that.log('Loading service: ' + service.controlService.displayName + ', subtype: ' + service.controlService.subtype + ', RestoredState: ' + service.controlService.onoffstate);
            } else {
              service.controlService.onoffstate = false;
              that.log('Loading service: ' + service.controlService.displayName + ', subtype: ' + service.controlService.subtype);
            }
            return service;
          });
          accessory = new IFTTTAccessory(services);
        }
        if (accessory != null) {
          accessory.getServices = function () {
            return that.getServices(accessory);
          };
          accessory.platform = that;
          accessory.remoteAccessory = s;
          accessory.name = s.name;
          accessory.model = 'IFTTT';
          accessory.manufacturer = 'IFTTT';
          accessory.serialNumber = '<unknown>';
          foundAccessories.push(accessory);
          
        }
      }
    );
    callback(foundAccessories);
  },
  command: function (trigger, value, homebridgeAccessory) {
    var url = 'https://maker.ifttt.com/trigger/' + trigger.eventName + '/with/key/' + this.makerkey;
    request({
      url: url,
      method: 'post',
      body: JSON.stringify(trigger.values || {}),
      headers: {'Content-type': 'application/json'}
    }, function (err, response) {
      if (err)
        homebridgeAccessory.platform.log('There was a problem sending command ' + trigger.eventName + ' to ' + homebridgeAccessory.name);
      else
        homebridgeAccessory.platform.log(homebridgeAccessory.name + ' sent command ' + trigger.eventName);
      homebridgeAccessory.platform.log(url);
      if (trigger.values != null)
        homebridgeAccessory.platform.log(trigger.values);
    });
  },
  getInformationService: function (homebridgeAccessory) {
    var informationService = new Service.AccessoryInformation();
    informationService
    .setCharacteristic(Characteristic.Name, homebridgeAccessory.name)
    .setCharacteristic(Characteristic.Manufacturer, homebridgeAccessory.manufacturer)
    .setCharacteristic(Characteristic.Model, homebridgeAccessory.model)
    .setCharacteristic(Characteristic.SerialNumber, homebridgeAccessory.serialNumber);
    return informationService;
  },
  bindCharacteristicEvents: function (characteristic, service, homebridgeAccessory) {
    characteristic
    .on('set', function (value, callback, context) {
      if (context !== 'fromSetValue') {
        var trigger = { eventName, values };
        if (service.controlService.trigger != null) {
          trigger.eventName = service.controlService.trigger;
          if (service.controlService.values != null)
            trigger.values = service.controlService.values;
          else if (value == 0)
            trigger.values = service.controlService.valuesOff;
          else if (value == 1)
            trigger.values = service.controlService.valuesOn;
        } else if (value == 0) {
          trigger.eventName = service.controlService.triggerOff;
          service.controlService.onoffstate = false;
          if (service.controlService.valuesOff != null)
            trigger.values = service.controlService.valuesOff;
          else if (service.controlService.values != null)
            trigger.values = service.controlService.values;
        } else {
          trigger.eventName = service.controlService.triggerOn;
          service.controlService.onoffstate = true;
          if (service.controlService.valuesOn != null)
            trigger.values = service.controlService.valuesOn;
          else if (service.controlService.values != null)
            trigger.values = service.controlService.values;
        }
        
        var delayOn = service.controlService.delayOn;
        var delayOff = service.controlService.delayOff;
        if (shouldDelayCommand(value, delayOn, delayOff)) {
          homebridgeAccessory.platform.log(trigger.eventName + ' scheduled to run in ' + getDelay(value, delayOn, delayOff) / 1000 + ' seconds.');
          setTimeout(function () {
            homebridgeAccessory.platform.command(trigger, '', homebridgeAccessory);
          }, getDelay(value, delayOn, delayOff));
        } else {
          homebridgeAccessory.platform.command(trigger, '', homebridgeAccessory);
        }
        
        if (service.controlService.trigger != null && service.controlService.valuesOn == null && service.controlService.valuesOff == null) {
          // In order to behave like a push button reset the status to off
          setTimeout(function () {
            characteristic.setValue(false, undefined, 'fromSetValue');
          }, 100);
        }
        // Save state
        if (service.controlService.stateful) {
          this.storage.setItemSync(service.controlService.displayName, value);
        }
      }
      callback();
    }.bind(this));
    characteristic
    .on('get', function (callback) {
      if (service.controlService.trigger != null)
        // a push button is normally off
        callback(undefined, false);
      else {
        callback(undefined, service.controlService.onoffstate);
      }
    }.bind(this));
  },
  getServices: function (homebridgeAccessory) {
    var services = [];
    var informationService = homebridgeAccessory.platform.getInformationService(homebridgeAccessory);
    services.push(informationService);
    for (var s = 0; s < homebridgeAccessory.services.length; s++) {
      var service = homebridgeAccessory.services[s];
      for (var i = 0; i < service.characteristics.length; i++) {
        var characteristic = service.controlService.getCharacteristic(service.characteristics[i]);
        if (characteristic == undefined)
          characteristic = service.controlService.addCharacteristic(service.characteristics[i]);
        homebridgeAccessory.platform.bindCharacteristicEvents(characteristic, service, homebridgeAccessory);
      }
      services.push(service.controlService);
    }
    return services;
  }
};

function IFTTTAccessory(services) {
  this.services = services;
}

function shouldDelayCommand(value, delayOn, delayOff) {
  if (value === 1)
    return delayOn;
  else if (value === 0)
    return delayOff;
  return false;
}

function getDelay(value, delayOn, delayOff) {
  var multiplier = 1000;
  if (value === 1 && delayOn)
    return delayOn * multiplier;
  else if (value === 0 && delayOff)
    return delayOff * multiplier;
  return 0;
}
