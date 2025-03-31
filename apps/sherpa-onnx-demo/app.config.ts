import 'ts-node/register';

// Deps
import { ConfigContext, ExpoConfig } from '@expo/config';
import { version as packageVersion } from './package.json';

// Add a helper function for logging
function logConfig(config: Record<string, unknown>, prefix = '') {
  console.log('\n🔧 Configuration:');
  console.log('-----------------------------');
  Object.entries(config).forEach(([key, value]) => {
    if (value !== undefined) {
      console.log(`${prefix}${key}: ${value}`);
    }
  });
  console.log('-----------------------------\n');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  // Log important configuration
  logConfig({
    'App Name': 'sherpa-onnx-demo',
    'App Version': packageVersion,
    'Environment': process.env.NODE_ENV || 'development',
  });

  return {
    ...config,
    name: "sherpa-onnx-demo",
    slug: "sherpa-onnx-demo",
    version: packageVersion,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.deeeed.sherpaonnxdemo",
      infoPlist: {
        "UIBackgroundModes": ["audio"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.deeeed.sherpaonnxdemo"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-av",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone",
          "recordAudioAndPlaybackInBackgroundPermission": "Allow $(PRODUCT_NAME) to use Audio"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "15.1"
          },
          "android": {
            "extraProguardRules": "-keep class com.facebook.hermes.unicode.** { *; }",
            "extraMavenRepos": ["https://www.jitpack.io"],
            "gradleProperties": {
              "org.gradle.jvmargs": "-Xmx2048m",
              "reactNativeDevServerPort": "7500"
            }
          }
        }
      ]
    ],
    scheme: "sherpa-onnx-demo"
  };
}; 