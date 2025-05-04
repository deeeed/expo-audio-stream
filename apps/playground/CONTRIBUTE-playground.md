# Audio Playground Debugging

## Android
View logs from the playground app:
```bash
# All playground logs
adb logcat -v time | grep "AudioPlayground"

# Audio module logs only
adb logcat -v time | grep "ExpoAudioStudio"

# Error logs only
adb logcat -v time | grep "ExpoAudioStudio" | grep " E "
```

## iOS
### Simulator
```bash
# All playground logs
xcrun simctl spawn booted log stream --predicate 'process contains "AudioDevPlayground"'

# Module logs only
xcrun simctl spawn booted log stream --predicate 'process contains "AudioDevPlayground" && subsystem contains "ExpoAudioStream"'
```

### Physical Device
```bash
# Install libimobiledevice if needed
brew install libimobiledevice

# View all app logs (most reliable method)
idevicesyslog | grep -i AudioPlayground

# Filter for specific app bundle ID
idevicesyslog | grep -i "net.siteed.audioplayground"

# Filter for ExpoAudioStudio logs
idevicesyslog | grep -i ExpoAudioStudio
```

#### Visual Tools (if command line fails)
1. **Xcode Console**: Open Xcode → Window → Devices and Simulators → Select your device → Open Console
2. **macOS Console.app**: Open Console.app → Select your device from sidebar → Filter for "AudioPlayground"
