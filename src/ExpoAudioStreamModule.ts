import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import {
  ExpoAudioStreamWeb,
  ExpoAudioStreamWebProps,
} from "./ExpoAudioStream.web";

let ExpoAudioStreamModule: any;

if (Platform.OS === "web") {
  ExpoAudioStreamModule = (webProps: ExpoAudioStreamWebProps) => {
    return new ExpoAudioStreamWeb(webProps);
  };
} else {
  ExpoAudioStreamModule = requireNativeModule("ExpoAudioStream");
}

export default ExpoAudioStreamModule;
