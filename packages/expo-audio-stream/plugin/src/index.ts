import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withInfoPlist,
} from "@expo/config-plugins";

const MICROPHONE_USAGE = "Allow $(PRODUCT_NAME) to access your microphone";

const withRecordingPermission: ConfigPlugin<{
  microphonePermission: string;
}> = (config, existingPerms) => {
  if (!existingPerms) {
    console.warn("No previous permissions provided");
  }
  config = withInfoPlist(config, (config) => {
    config.modResults["NSMicrophoneUsageDescription"] = MICROPHONE_USAGE;

    // Add audio to UIBackgroundModes to allow background audio recording
    const existingBackgroundModes = config.modResults.UIBackgroundModes || [];
    if (!existingBackgroundModes.includes("audio")) {
      existingBackgroundModes.push("audio");
    }
    config.modResults.UIBackgroundModes = existingBackgroundModes;

    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      "android.permission.RECORD_AUDIO",
      MICROPHONE_USAGE,
    );

    // Add FOREGROUND_SERVICE permission for handling background recording
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      "android.permission.FOREGROUND_SERVICE",
      "This apps needs access to the foreground service to record audio in the background",
    );

    return config;
  });

  return config;
};

export default withRecordingPermission;
