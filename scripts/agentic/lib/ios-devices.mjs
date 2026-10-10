import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function connectedIOSDevices() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'audiolab-ios-devices-'));
  const file = path.join(directory, 'devices.json');
  try {
    execFileSync('/usr/bin/xcrun', ['devicectl', 'list', 'devices', '--json-output', file], {
      stdio: ['ignore', 'ignore', 'pipe'], timeout: 10000,
    });
    return JSON.parse(fs.readFileSync(file, 'utf8')).result.devices
      .filter(device => device.hardwareProperties.reality === 'physical'
        && device.connectionProperties.pairingState === 'paired')
      .map(device => ({ name: device.deviceProperties.name, udid: device.hardwareProperties.udid,
        identifier: device.identifier }));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

export function selectIOSDevice({ udid, name } = {}, devices = connectedIOSDevices()) {
  const matches = devices.filter(device => {
    if (udid && device.udid !== udid && device.identifier !== udid) return false;
    return !name || device.name.toLowerCase() === name.toLowerCase();
  });
  if (matches.length !== 1) throw new Error('Select one connected physical iOS device with IOS_DEVICE_UDID.');
  return matches[0];
}

export function physicalIOSDeviceForTarget(target, devices) {
  const logicalId = target.reactNative?.logicalDeviceId;
  const identified = devices.filter(device => device.udid === logicalId || device.identifier === logicalId);
  if (identified.length === 1) return identified[0];
  const named = devices.filter(device => device.name.toLowerCase() === (target.deviceName || '').toLowerCase());
  if (named.length === 1) return named[0];
  // iOS can report the generic "iPhone" without the device-name entitlement.
  // That fallback is attributable only while one physical device is connected.
  if (devices.length === 1) return devices[0];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(selectIOSDevice({ udid: process.env.IOS_DEVICE_UDID })));
}
