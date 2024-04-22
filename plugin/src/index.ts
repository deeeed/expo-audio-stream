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
    return config;
  });

  return config;
};

export default withRecordingPermission;
