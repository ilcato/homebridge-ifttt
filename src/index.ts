'use strict';

import { bind } from 'module';

let Service, Characteristic, HomebridgeAPI;
import superagent = require('superagent');
import storage = require('node-persist');


module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerPlatform('homebridge-ifttt', 'IFTTT', IFTTTPlatform);
};

class IFTTTPlatform {
  log: (format: string, message: any) => void;
  api: any;
  makerkey: string;
  IFTTTaccessories: any;
  cacheDirectory: any;

  constructor(log: (format: string, message: any) => void, config: any, api: any) {
    this.log = log;
    this.api = api;
    this.makerkey = config['makerkey'];
    this.IFTTTaccessories = config['accessories'];
  }

  accessories(callback) {
    this.log('Loading accessories...', '');

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    const foundAccessories: any = [];
    if (!this.IFTTTaccessories || this.IFTTTaccessories.length === 0) {
      callback(foundAccessories);
      return;
    }

    this.cacheDirectory = HomebridgeAPI.user.persistPath();
    storage.init({ dir: this.cacheDirectory, forgiveParseErrors: true });

    const subtypes: any = [];

    function generateSubtype(button) {
      function valuesToString(values) {
        return JSON.stringify(values) ? JSON.stringify(values).replace(/\W/g, '') : null;
      }
      let result =
        (button.trigger || button.triggerOn + button.triggerOff) +
        (button.values ? '-v' + valuesToString(button.values) : '') +
        (button.valuesOn ? '-vOn' + valuesToString(button.valuesOn) : '') +
        (button.valuesOff ? '-vOff' + valuesToString(button.valuesOff) : '');
      const duplicateSubtype: any = subtypes.find((subtype: any) => subtype.indexOf(result) === 0);
      if (duplicateSubtype) {
        let num = duplicateSubtype.replace(/^.*___(\d+)$/, '$1');
        num = parseInt(num === result ? '1' : num);
        result += '___' + (num + 1);
      }
      subtypes.unshift(result);
      return result;
    }

    this.IFTTTaccessories.map((s) => {
      this.log('Found: ', s.name);
      let accessory: any = null;
      if (s.buttons.length !== 0) {
        const services = s.buttons.map((button) => {
          const service = {
            controlService: new Service.Switch(button.caption),
            characteristics: [Characteristic.On],
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
            const cachedState = storage.getItemSync(service.controlService.displayName);
            service.controlService.onoffstate = !(cachedState === undefined || cachedState === false);
            this.log(
              'Loading service: ', service.controlService.displayName +
              ', subtype: ' +
              service.controlService.subtype +
              ', RestoredState: ' +
            service.controlService.onoffstate,
            );
          } else {
            service.controlService.onoffstate = false;
            this.log(
              'Loading service: ', service.controlService.displayName + ', subtype: ' + service.controlService.subtype,
            );
          }
          return service;
        });
        accessory = new IFTTTAccessory(services);
      }
      if (accessory) {
        accessory.getServices = function () {
          return that.getServices(accessory);
        };
        accessory.platform = this;
        accessory.remoteAccessory = s;
        accessory.name = s.name;
        accessory.model = 'IFTTT';
        accessory.manufacturer = 'IFTTT';
        accessory.serialNumber = 'IFTTT-' + s.name;
        foundAccessories.push(accessory);
      }
    });
    callback(foundAccessories);
  }

  async command(trigger, homebridgeAccessory) {
    const url = 'https://maker.ifttt.com/trigger/' + trigger.eventName + '/with/key/' + this.makerkey;

    try {
      await superagent
        .post(url)
        .send(trigger.values || {})
        .set('Content-type', 'application/json');
      homebridgeAccessory.platform.log(homebridgeAccessory.name + ' sent command ' + trigger.eventName);
      homebridgeAccessory.platform.log(url);
      if (trigger.values) {
        homebridgeAccessory.platform.log(trigger.values);
      }

    } catch (err) {
      homebridgeAccessory.platform.log(
        'There was a problem sending command ' + trigger.eventName + ' to ' + homebridgeAccessory.name,
      );
    }
  }

  getInformationService(homebridgeAccessory) {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Name, homebridgeAccessory.name)
      .setCharacteristic(Characteristic.Manufacturer, homebridgeAccessory.manufacturer)
      .setCharacteristic(Characteristic.Model, homebridgeAccessory.model)
      .setCharacteristic(Characteristic.SerialNumber, homebridgeAccessory.serialNumber);
    return informationService;
  }

  bindCharacteristicEvents(characteristic, service, homebridgeAccessory) {
    characteristic.on(
      'set',
      (value, callback, context) => {
        if (context !== 'fromSetValue') {
          let eventName: any;
          let values: any;
          const trigger = { eventName, values };
          if (service.controlService.trigger) {
            trigger.eventName = service.controlService.trigger;
            if (service.controlService.values) {
              trigger.values = service.controlService.values;
            } else if (value === 0) {
              trigger.values = service.controlService.valuesOff;
            } else if (value === 1) {
              trigger.values = service.controlService.valuesOn;
            }
          } else if (value === false) {
            trigger.eventName = service.controlService.triggerOff;
            service.controlService.onoffstate = false;
            if (service.controlService.valuesOff) {
              trigger.values = service.controlService.valuesOff;
            } else if (service.controlService.values) {
              trigger.values = service.controlService.values;
            }
          } else {
            trigger.eventName = service.controlService.triggerOn;
            service.controlService.onoffstate = true;
            if (service.controlService.valuesOn) {
              trigger.values = service.controlService.valuesOn;
            } else if (service.controlService.values) {
              trigger.values = service.controlService.values;
            }
          }

          const delayOn = service.controlService.delayOn;
          const delayOff = service.controlService.delayOff;
          if (shouldDelayCommand(value, delayOn, delayOff)) {
            homebridgeAccessory.platform.log(
              trigger.eventName + ' scheduled to run in ' + getDelay(value, delayOn, delayOff) / 1000 + ' seconds.',
            );
            setTimeout(() => {
              homebridgeAccessory.platform.command(trigger, homebridgeAccessory);
            }, getDelay(value, delayOn, delayOff));
          } else {
            homebridgeAccessory.platform.command(trigger, homebridgeAccessory);
          }

          if (
            service.controlService.trigger &&
            !service.controlService.valuesOn &&
            !service.controlService.valuesOff
          ) {
            // In order to behave like a push button reset the status to off
            setTimeout(() => {
              characteristic.setValue(false, undefined, 'fromSetValue');
            }, 100);
          }
          // Save state
          if (service.controlService.stateful) {
            storage.setItemSync(service.controlService.displayName, value);
          }
        }
        callback();
      },
      bind(this),
    );
    characteristic.on(
      'get',
      (callback) => {
        if (service.controlService.trigger) {
          // a push button is normally off
          callback(undefined, false);
        } else {
          callback(undefined, service.controlService.onoffstate);
        }
      }, bind(this),
    );
  }

  getServices(homebridgeAccessory) {
    const services: any = [];
    const informationService = homebridgeAccessory.platform.getInformationService(homebridgeAccessory);
    services.push(informationService);
    for (let s = 0; s < homebridgeAccessory.services.length; s++) {
      const service = homebridgeAccessory.services[s];
      for (let i = 0; i < service.characteristics.length; i++) {
        let characteristic = service.controlService.getCharacteristic(service.characteristics[i]);
        if (!characteristic) {
          characteristic = service.controlService.addCharacteristic(service.characteristics[i]);
        }
        homebridgeAccessory.platform.bindCharacteristicEvents(characteristic, service, homebridgeAccessory);
      }
      services.push(service.controlService);
    }
    return services;
  }
}


class IFTTTAccessory {
  services: any;

  constructor(services) {
    this.services = services;
  }
}

function shouldDelayCommand(value, delayOn, delayOff) {
  if (value === 1 || value === true) {
    return delayOn;
  } else if (value === 0 || value === false) {
    return delayOff;
  }
}

function getDelay(value, delayOn, delayOff) {
  const multiplier = 1000;
  if (value === 1 && delayOn) {
    return delayOn * multiplier;
  } else if (value === 0 && delayOff) {
    return delayOff * multiplier;
  }
  return 0;
}
