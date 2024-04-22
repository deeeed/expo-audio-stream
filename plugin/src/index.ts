import {
  AndroidConfig,
  ConfigPlugin,
  IOSConfig,
  createRunOncePlugin,
} from "@expo/config-plugins";

const pkg = require("@siteed/expo-audio-stream/package.json");
const MICROPHONE_USAGE = "Allow $(PRODUCT_NAME) to access your microphone";

const withRecordingPermission: ConfigPlugin<{
  microphonePermission: string | false | undefined;
}> = (config, { microphonePermission }) => {
  IOSConfig.Permissions.createPermissionsPlugin({
    NSMicrophoneUsageDescription: MICROPHONE_USAGE,
  })(config, {
    NSMicrophoneUsageDescription: microphonePermission,
  });

  return AndroidConfig.Permissions.withPermissions(
    config,
    [
      microphonePermission !== false && "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS",
    ].filter(Boolean) as string[],
  );
};

export default createRunOncePlugin(
  withRecordingPermission,
  pkg.name,
  pkg.version,
);
