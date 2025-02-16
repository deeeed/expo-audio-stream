# Audio Playground

A demo application showcasing real-time audio processing and visualization capabilities using **@siteed/expo-audio-stream**. 

## Features

- Live audio recording with waveform visualization
- On-device speech transcription
- Background recording support
- Rich notification controls with live waveform

This open-source app demonstrates implementation examples for developers building audio applications with React Native and Expo.

## Try it online

Visit the web demo: https://deeeed.github.io/expo-audio-stream/


## Development Setup

### Environment Configuration

1. Create a `.env.development` file in the project root with required variables:
```bash
APPLE_TEAM_ID=your_team_id
EAS_PROJECT_ID=your_project_id
APPLE_APP_ID=your_app_id
```

2. Configure EAS environment variables:
```bash
eas secret:create --scope project --name APPLE_TEAM_ID --value "your_team_id" --type string
eas secret:create --scope project --name EAS_PROJECT_ID --value "your_project_id" --type string
eas secret:create --scope project --name APPLE_APP_ID --value "your_app_id" --type string
```

3. Verify environment setup:
```bash
eas env:list
```

### Local Development

1. Set custom port for development:
```bash
./setPort.sh
```

2. For Android Debugging
```bash
adb reverse tcp:7365 tcp:7365
```

### Building with EAS

The project includes several build profiles:

#### Development Build

```bash
eas build --profile development --platform ios # for iOS
eas build --profile development --platform android # for Android
```

#### Production Build

```bash
yarn build:ios:production --auto-submit
```

### Building Local Shareable Builds

#### Android APK
1. Development APK:
```bash
eas build --platform android --profile development --local
```

2. Preview APK (optimized, unsigned):
```bash
eas build --platform android --profile preview --local
```

The APK will be available in the `android/app/build/outputs/apk/` directory.

#### iOS IPA
2. For development testing on specific devices:
```bash
eas device:create # Register test devices first
eas build --platform ios --profile development --local
```

Note: Local iOS builds require:
- Xcode installed
- Valid Apple Developer account
- Provisioning profiles and certificates set up
- Registered test devices (for development builds)

The IPA will be available in `~/Library/Developer/Xcode/Archives/`
