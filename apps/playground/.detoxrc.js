/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  session: {
    debugSynchronization: 10000,
    debug: true,
    autoStart: true,
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/AudioDevPlayground.app',
      build: 'xcodebuild -workspace ios/AudioDevPlayground.xcworkspace -scheme AudioDevPlayground -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/AudioPlayground.app',
      build: 'xcodebuild -workspace ios/AudioPlayground.xcworkspace -scheme AudioPlayground -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [
        7365
      ]
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'yarn build:android:production'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    iphone15ProMax: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro Max'
      }
    },
    ipadPro: {
      type: 'ios.simulator',
      device: {
        type: 'iPad Pro (12.9-inch) (6th generation)'
      }
    },
    iphone15: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_8_Pro_API_35'
      }
    },
    iosDevice: {
      type: 'ios.device',
      device: {
        udid: undefined
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release'
    },
    'ios.iphone15ProMax.debug': {
      device: 'iphone15ProMax',
      app: 'ios.debug'
    },
    'ios.iPadPro.debug': {
      device: 'ipadPro',
      app: 'ios.debug'
    },
    'ios.iphone15.debug': {
      device: 'iphone15',
      app: 'ios.debug'
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug'
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    },
    'ios.device.debug': {
      device: 'iosDevice',
      app: 'ios.debug'
    }
  }
};
