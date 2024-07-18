import "expo-router/entry";
import { Platform } from "react-native";

if (Platform.OS === "web") {
  // Keep polyfills at the top
  localStorage.debug = "expo-audio-stream:*";
}
