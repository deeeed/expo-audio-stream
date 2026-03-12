const IS_PRODUCTION = process.env.APP_VARIANT === 'production';
const APP_NAME = IS_PRODUCTION ? 'SherpaVoice' : 'SherpaVoiceDev';
const ANDROID_AVD = process.env.ANDROID_AVD || 'medium';

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
      binaryPath: `ios/build/Build/Products/Debug-iphonesimulator/${APP_NAME}.app`,
      build: `xcodebuild -workspace ios/${APP_NAME}.xcworkspace -scheme ${APP_NAME} -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build`
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: `ios/build/Build/Products/Release-iphonesimulator/${APP_NAME}.app`,
      build: `xcodebuild -workspace ios/${APP_NAME}.xcworkspace -scheme ${APP_NAME} -configuration Release -sdk iphonesimulator -derivedDataPath ios/build`
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [
        7500, 7501
      ]
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
      reversePorts: [
        7500, 7501
      ]
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        name: 'SherpaVoice-Dev'
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
        avdName: ANDROID_AVD
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
    }
  }
};
