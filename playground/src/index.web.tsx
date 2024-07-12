import "@expo/metro-runtime";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";

import { isWeb } from "./utils/utils";

if (isWeb) {
  // Keep polyfills at the top
  localStorage.debug = "expo-audio-stream::*";
}

LoadSkiaWeb()
  .then(async () => {
    renderRootComponent(App);
    return true;
  })
  .catch((error) => {
    console.error("Failed to load Skia", error);
  });
