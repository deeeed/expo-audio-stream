import "ts-node/register"; // Add this to import TypeScript files
import { ExpoConfig } from "@expo/config";

const isDev = process.env.NODE_ENV === "development";

const config: ExpoConfig = {
  name: "audio-playground",
  slug: "audio-playground",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "net.siteed.audiostream.example",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "net.siteed.audiostream.audioplayground",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "net.siteed.audiostream.audioplayground",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  experiments: {
    baseUrl: isDev ? "" : "/expo-audio-stream/",
  },
  plugins: [
    [
      "../app.plugin.js",
      {
        apiKey: "custom_secret_api",
      },
    ],
    "expo-localization",
    [
      "expo-asset",
      {
        assets: ["./public/audio_samples/recorder_hello_world.wav"],
      },
    ],
    "expo-router",
  ],
};

export default config;
