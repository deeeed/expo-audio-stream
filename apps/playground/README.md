# Audio Playground

A demo application showcasing real-time audio processing and visualization capabilities using **@siteed/expo-audio-studio**. 

[![Web Demo](https://img.shields.io/badge/Demo-Web-blue)](https://deeeed.github.io/expo-audio-stream/)

## Features

- Live audio recording with waveform visualization
- On-device speech transcription
- Background recording support
- Rich notification controls with live waveform
- Multi-platform support (iOS, Android, Web)

This open-source app demonstrates implementation examples for developers building audio applications with React Native and Expo.

## Quick Start

Get up and running quickly:

```bash
# Install dependencies
yarn install

# Start development server
yarn start

# Run on specific platforms
yarn ios     # iOS
yarn android # Android
yarn web     # Web
```

## Development Setup

### Prerequisites

- Node.js 18+ and Yarn
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode and CocoaPods
- Android: Android Studio and SDK

### Environment Configuration

1. Create a `.env.development` file in the project root:
```bash
APPLE_TEAM_ID=your_team_id
EAS_PROJECT_ID=your_project_id
```

2. For EAS builds, configure environment variables:
```bash
eas secret:create --scope project --name APPLE_TEAM_ID --value "your_team_id" --type string
eas secret:create --scope project --name EAS_PROJECT_ID --value "your_project_id" --type string
```

### Development Workflow

1. Set custom port for development (if needed):
```bash
./setPort.sh
```

2. For Android debugging with custom port:
```bash
adb reverse tcp:7365 tcp:7365
```

3. Run the development server:
```bash
yarn start
```

## Building and Testing

I use EAS (Expo Application Services) for building.

### Development Builds

Development builds include developer tools and debugging capabilities:

```bash
# Local development builds
yarn build:ios:development     # iOS
yarn build:android:development # Android
```

### Testing Builds

Create optimized builds for testing:

```bash
# Preview builds (optimized but with testing features)
yarn build:ios:preview     # iOS
yarn build:android:preview # Android

# Get a shareable Android APK
yarn build:android:preview_apk
```

## Deploying

I've created a streamlined deployment process through an interactive script:

```bash
# Run the deployment script
yarn publish
```

This script will:
1. Guide you through version updates
2. Let you select the target platform
3. Handle building and publishing to appropriate channels

For detailed deployment options, see [PUBLISH_STORE.md](./PUBLISH_STORE.md).

## Troubleshooting

### Common Issues

**Metro bundler port conflicts**
```bash
# Change the Metro port
yarn start --port 8088
```

**iOS build fails**
- Ensure Xcode is up to date
- Run `pod install` in the `ios` directory
- Check Apple Developer account has correct provisioning profiles

**Android build fails**
- Ensure Android SDK is properly configured
- Check gradle version compatibility
- Run `cd android && ./gradlew clean` then try again
