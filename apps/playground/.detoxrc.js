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
      // Use the standard paths that Gradle generates regardless of APP_NAME value
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro Max'
      }
    },
    ipadPro: {
      type: 'ios.simulator',
      device: {
        type: 'iPad Pro 13-inch (M4)'
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
        avdName: 'medium'
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
    'ios.iPadPro.debug': {
      device: 'ipadPro',
      app: 'ios.debug'
    },
    'ios.iPadPro.release': {
      device: 'ipadPro',
      app: 'ios.release'
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
