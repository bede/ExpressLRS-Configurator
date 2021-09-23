import { Service } from 'typedi';
import { LoggerService } from '../../logger';
import Device from '../../models/Device';
import Target from '../../models/Target';
import DeviceJSON from '../../../../../devices.json';
import FlashingMethod from '../../models/enum/FlashingMethod';
import UserDefineKey from '../../library/FirmwareBuilder/Enum/UserDefineKey';

export interface IDevices {
  getDevices(): Device[];
}

@Service()
export default class DeviceService implements IDevices {
  devices: Device[];

  constructor(private logger: LoggerService) {
    this.devices = this.loadDevices();
  }

  loadDevices(): Device[] {
    const userDefinesByKey = (Object.keys(
      UserDefineKey
    ) as (keyof typeof UserDefineKey)[]).reduce(
      (previousValue, currentValue) => {
        previousValue[currentValue.toString().toUpperCase()] =
          UserDefineKey[currentValue];
        return previousValue;
      },
      {} as {
        [key: string]: UserDefineKey;
      }
    );

    const flashingMethodKeys = (Object.keys(
      FlashingMethod
    ) as (keyof typeof FlashingMethod)[]).reduce(
      (previousValue, currentValue) => {
        previousValue[currentValue.toString().toUpperCase()] =
          FlashingMethod[currentValue];
        return previousValue;
      },
      {} as {
        [key: string]: FlashingMethod;
      }
    );

    return DeviceJSON.devices.map((value) => {
      try {
        if (!value.name) {
          throw new Error(`all devices must have a name property!`);
        }
        if (!value.category) {
          throw new Error(`category property is required!`);
        }
        if (!value.targets || value.targets.length === 0) {
          throw new Error(`devices must have a list of targets defined!`);
        }
        if (!value.userDefines || value.userDefines.length === 0) {
          throw new Error(
            `devices must have a list of supported user defines!`
          );
        }

        const targets: Target[] = value.targets.map((item) => {
          if (!item.name) {
            throw new Error(`target must have a name property`);
          }

          const flashingMethod =
            flashingMethodKeys[item.flashingMethod.toUpperCase()];

          if (!flashingMethod) {
            throw new Error(
              `error parsing target "${item.name}": "${item.flashingMethod}" is not a valid flashing method`
            );
          }

          return {
            name: item.name,
            flashingMethod,
          };
        });

        const userDefines = value.userDefines.map((item) => {
          const userDefineKey = userDefinesByKey[item.toUpperCase()];
          if (!userDefineKey) {
            throw new Error(`"${item}" is not a valid User Define`);
          }
          return userDefineKey;
        });

        const device: Device = {
          id: value.name,
          name: value.name,
          category: value.category,
          targets,
          userDefines,
          wikiUrl: value.wikiUrl,
        };

        return device;
      } catch (error: any) {
        const errormessage = `Issue encountered while parsing device "${value.name}" in the device configuration file devices.json: ${error.message}`;
        this.logger.error(errormessage);
        throw new Error(errormessage);
      }
    });
  }

  getDevices() {
    return this.devices;
  }
}
