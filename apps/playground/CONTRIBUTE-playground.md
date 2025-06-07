# Playground App Debugging

## Quick Commands

**Android**
```bash
adb logcat -v time | grep "ExpoAudioStudio"    # Module logs
adb logcat -v time | grep "AudioPlayground"    # App logs
```

**iOS Simulator**
```bash
xcrun simctl spawn booted log stream --predicate 'process contains "AudioDevPlayground"'
```

**iOS Device**
```bash
idevicesyslog | grep -i AudioPlayground        # Requires: brew install libimobiledevice
```

## Visual Tools
- **Xcode**: Window → Devices → Select device → Open Console
- **macOS Console**: Select device → Filter "AudioPlayground"
