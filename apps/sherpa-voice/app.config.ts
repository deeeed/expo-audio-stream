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

const IS_PRODUCTION = process.env.APP_VARIANT === 'production';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Log important configuration
  logConfig({
    'App Name': 'Sherpa Voice',
    'App Version': packageVersion,
    'Environment': process.env.NODE_ENV || 'development',
  });

  return {
    ...config,
    name: "Sherpa Voice",
    slug: "sherpa-voice",
    version: packageVersion,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
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
      bundleIdentifier: "net.siteed.sherpavoice",
      infoPlist: {
        "UIBackgroundModes": ["audio"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "net.siteed.sherpavoice"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    experiments: {
        baseUrl:
            IS_PRODUCTION
                ? '/expo-audio-stream/sherpa-voice/'
                : '',
    },
    plugins: [
      ["./plugins/withMetroPort.cjs", { port: 7500 }],
      "./plugins/withCustomGradleConfig.cjs",
      "expo-router",
      [
        "expo-audio",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
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
            "extraMavenRepos": [],
            "gradleProperties": {
              "org.gradle.jvmargs": "-Xmx2048m",
              "reactNativeDevServerPort": "7500"
            }
          }
        }
      ]
    ],
    scheme: "sherpa-voice"
  };
};
