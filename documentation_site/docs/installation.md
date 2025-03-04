---
id: installation
title: Installation
sidebar_label: Installation
---

# Installation

## Installing the library

To install `@siteed/expo-audio-studio`, add it to your project using npm or Yarn:

```bash
npm install @siteed/expo-audio-studio
# or
yarn add @siteed/expo-audio-studio
```

## Configuring with app.json

To ensure expo-audio-stream works correctly with Expo, you must add it as a plugin in your app.json configuration file. You can add it with default configuration or customize its behavior using options:

### Basic Configuration

```json
{
    "expo": {
        "plugins": ["@siteed/expo-audio-studio"]
    }
}
```

### Advanced Configuration

You can customize the plugin's behavior by providing options:

```json
{
    "expo": {
        "plugins": [
            [
                "@siteed/expo-audio-studio",
                {
                    "enablePhoneStateHandling": true,
                    "enableNotifications": true,
                    "enableBackgroundAudio": true,
                    "iosBackgroundModes": {
                        "useVoIP": false,
                        "useAudio": false,
                        "useProcessing": false,
                        "useLocation": false,
                        "useExternalAccessory": false
                    },
                    "iosConfig": {
                        "allowBackgroundAudioControls": false,
                        "backgroundProcessingTitle": "Audio Recording",
                        "microphoneUsageDescription": "Custom microphone usage message",
                        "notificationUsageDescription": "Custom notification usage message"
                    }
                }
            ]
        ]
    }
}
```

### Configuration Options

#### Core Options
- **enablePhoneStateHandling** (default: `true`): 
  - Enables handling of phone state changes (calls, etc.)
  - Adds telephony capabilities on iOS
  - Adds READ_PHONE_STATE permission on Android

- **enableNotifications** (default: `true`):
  - Enables recording notifications and controls
  - Adds notification permissions on iOS
  - Adds POST_NOTIFICATIONS permission on Android

- **enableBackgroundAudio** (default: `true`):
  - Enables background audio recording capabilities
  - Adds FOREGROUND_SERVICE and FOREGROUND_SERVICE_MICROPHONE permissions on Android

#### iOS Background Modes
- **iosBackgroundModes**:
  - `useVoIP` (default: `false`): Enable VoIP background mode
  - `useAudio` (default: `false`): Enable audio background mode (Note: This is primarily for audio playback, not recording)
  - `useProcessing` (default: `false`): Enable background processing mode (Required for background recording)
  - `useLocation` (default: `false`): Enable location updates in background
  - `useExternalAccessory` (default: `false`): Enable external audio accessories

#### iOS Specific Configuration
- **iosConfig**:
  - `allowBackgroundAudioControls` (default: `false`): Show audio controls in control center and enables remote-notification background mode
  - `backgroundProcessingTitle` (default: `undefined`): Description for background processing
  - `microphoneUsageDescription` (default: `"Allow $(PRODUCT_NAME) to access your microphone"`): Custom message for microphone permission dialog
  - `notificationUsageDescription` (default: `"Show recording notifications and controls"`): Custom message for notification permission dialog

### iOS Configuration Details

When configuring for iOS, note the following important details:

1. For background audio recording, you should enable `useProcessing: true` in the `iosBackgroundModes` section. The plugin will warn you if you enable `useAudio` without `useProcessing`.

2. The `microphoneUsageDescription` and `notificationUsageDescription` options allow you to customize the permission request messages shown to users.

3. If you enable `allowBackgroundAudioControls`, the plugin will add the `remote-notification` background mode to support audio controls in the iOS control center.

### Android Manifest Permissions

The plugin automatically adds the following permissions to your Android manifest:
```xml
<!-- Base Permissions (Always Added) -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Optional Permissions (Based on Configuration) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
```

### Android Service Components

The plugin also adds necessary service components to your Android manifest:
```xml
<!-- Recording Action Receiver -->
<receiver
    android:name=".RecordingActionReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="PAUSE_RECORDING" />
        <action android:name="RESUME_RECORDING" />
        <action android:name="STOP_RECORDING" />
    </intent-filter>
</receiver>

<!-- Audio Recording Service -->
<service
    android:name=".AudioRecordingService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="microphone" />
```

Make sure to run `npx expo prebuild` after modifying the plugin configuration in your app.json file.

## Requesting Permissions

To request microphone permissions in your Expo project, you can use the following method:

```tsx
import {
    ExpoAudioStreamModule,
} from '@siteed/expo-audio-studio'

const requestPermissions = async () => {
    const { granted } =
        await ExpoAudioStreamModule.requestPermissionsAsync()
    if (granted) {
        console.log('Microphone permissions granted')
    } else {
        console.log('Microphone permissions denied')
    }
}

requestPermissions();
```

Note that the plugin automatically configures the necessary permissions in your app's configuration, but you still need to request them at runtime using the `requestPermissionsAsync()` method.