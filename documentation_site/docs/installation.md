---
id: installation
title: Installation
sidebar_label: Installation
---

# Installation

## Installing the library

To install `@siteed/expo-audio-stream`, add it to your project using npm or Yarn:

```bash
npm install @siteed/expo-audio-stream
# or
yarn add @siteed/expo-audio-stream
```

## Configuring with app.json

To ensure expo-audio-stream works correctly with Expo, you must add it as a plugin in your app.json configuration file. You can add it with default configuration or customize its behavior using options:

### Basic Configuration

```json
{
    "expo": {
        "plugins": ["@siteed/expo-audio-stream"]
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
                "@siteed/expo-audio-stream",
                {
                    "enablePhoneStateHandling": true,
                    "enableNotifications": true,
                    "enableBackgroundAudio": true,
                    "iosBackgroundModes": {
                        "useVoIP": false,
                        "useAudio": false,
                        "useProcessing": true
                    },
                    "iosConfig": {
                        "backgroundProcessingTitle": "Audio Recording",
                        "keepAliveInBackground": true
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
  - Adds notification permissions on both platforms
  - Adds POST_NOTIFICATIONS permission on Android

- **enableBackgroundAudio** (default: `true`):
  - Enables background audio recording capabilities
  - Adds FOREGROUND_SERVICE and FOREGROUND_SERVICE_MICROPHONE permissions on Android

#### iOS Background Modes
- **iosBackgroundModes**:
  - `useVoIP` (default: `false`): Enable VoIP background mode
  - `useAudio` (default: `false`): Enable audio background mode
  - `useProcessing` (default: `false`): Enable background processing mode
  - `useLocation` (default: `false`): Enable location updates in background
  - `useExternalAccessory` (default: `false`): Enable external audio accessories

#### iOS Specific Configuration
- **iosConfig**:
  - `allowBackgroundAudioControls` (default: `false`): Show audio controls in control center
  - `backgroundProcessingTitle` (default: `'Audio Recording'`): Description for background processing
  - `keepAliveInBackground` (default: `true`): Enable background keep-alive mechanisms

### App Store Submission Notes

When submitting to the App Store, it's important to configure the background modes appropriately to avoid rejection:

1. If your app only needs background recording without playback:
   - Set `useAudio` to `false`
   - Use `useProcessing` instead for background operation

2. If your app doesn't use VoIP features:
   - Set `useVoIP` to `false`
   - Use alternative background modes like `useProcessing` for background operation

Make sure to run `npx expo prebuild` after modifying the plugin configuration in your app.json file.

## Requesting Permissions

To request microphone permissions in your Expo project, you can use the following method:

```tsx
import {
    ExpoAudioStreamModule,
} from '@siteed/expo-audio-stream'

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