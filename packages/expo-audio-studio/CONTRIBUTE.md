# Contributing to @siteed/expo-audio-studio

Thank you for your interest in contributing to this library! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Debugging](#debugging)
  - [Android (ADB)](#android-adb)
  - [iOS (Xcode)](#ios-xcode)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Development Setup

> This section will be expanded in a future PR. For now, please refer to the repository's README for basic setup instructions.

## Debugging

### Android (ADB)

For Android development, you can use ADB (Android Debug Bridge) to view and filter log output from the library. The library uses a standardized logging approach with consistent prefixes to make filtering easier.

#### Viewing All Library Logs

To see all logs from the library:

```bash
adb logcat -v time | grep "ExpoAudioStudio"
```

#### Filtering by Component

To view logs from a specific component:

```bash
# View logs from the AudioDeviceManager
adb logcat -v time | grep "ExpoAudioStudio:AudioDeviceManager"

# View logs from the AudioRecorderManager
adb logcat -v time | grep "ExpoAudioStudio:AudioRecorderManager"
```

#### Common Debug Commands

```bash
# View only errors from the library
adb logcat -v time | grep "ExpoAudioStudio" | grep " E "

# Save logs to a file for analysis
adb logcat -v time | grep "ExpoAudioStudio" > expo_audio_logs.txt

# Clear logcat buffer
adb logcat -c
```

#### Useful Log Tags

- `ExpoAudioStudio:AudioProcessor` - Audio analysis and processing
- `ExpoAudioStudio:AudioDeviceManager` - Device selection and monitoring
- `ExpoAudioStudio:AudioRecorderManager` - Recording lifecycle
- `ExpoAudioStudio:ExpoAudioStreamModule` - Module initialization and API calls
- `ExpoAudioStudio:AudioTrimmer` - Audio trimming operations

### iOS (Xcode)

This monorepo includes an `AudioDevPlayground` app for testing. When launched in development mode, you can use these commands to view logs:

#### Simulator

```bash
# View all logs from the AudioDevPlayground app
xcrun simctl spawn booted log stream --predicate 'process contains "AudioDevPlayground"'

# View only error logs
xcrun simctl spawn booted log stream --level error --predicate 'process contains "AudioDevPlayground"'

# View logs from our module in the playground app
xcrun simctl spawn booted log stream --predicate 'process contains "AudioDevPlayground" && subsystem contains "ExpoAudioStream"'
```

#### Physical Device

For connected physical iOS devices, use these commands instead:

```bash
# View all logs from the AudioDevPlayground app on device
log stream --predicate 'process contains "AudioDevPlayground"'

# View only error logs
log stream --level error --predicate 'process contains "AudioDevPlayground"'

# View logs from our module in the playground app
log stream --predicate 'process contains "AudioDevPlayground" && subsystem contains "ExpoAudioStream"'
```

For a better debugging experience, use the Console app:

1. Open **Console** app on your Mac
2. Select your device/simulator from the sidebar
3. Filter with: `process:AudioDevPlayground` or similar

## Code Style

> This section will be expanded in a future PR with specific code style guidelines.

## Pull Request Process

1. Ensure that your code follows the repository's coding standards
2. Update any relevant documentation
3. Include tests for new functionality
4. Submit your pull request with a clear description of the changes

## Release Process

> This section will be expanded in a future PR with details about the release process. 