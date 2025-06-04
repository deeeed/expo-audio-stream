# iOS Audio Format Tests

This directory contains test scripts for validating audio format support on iOS/macOS.

## Opus Support Test

The `opus_support_test_macos.swift` script verifies that while `kAudioFormatOpus` is defined in the iOS SDK, AVAudioRecorder cannot actually encode Opus audio.

### Running the Test

```bash
# On macOS (for quick validation)
swift opus_support_test_macos.swift

# On iOS device/simulator (requires Xcode)
# Copy the test to an iOS project and run it
```

### Test Results

- ✅ `kAudioFormatOpus` constant exists (value: 1869641075)
- ✅ AVAudioRecorder accepts Opus settings without errors
- ❌ Recording produces 0-byte files (no actual encoding)
- ✅ AAC format works correctly as fallback

### Why This Matters

This test proves that expo-audio-studio's automatic fallback from Opus to AAC on iOS is necessary and correct. Despite the SDK defining the Opus format constant, the actual encoding functionality is not implemented in AVAudioRecorder.

## Format Verification

To verify actual file formats:

```bash
# Check file type
file recording.m4a  # Should show: ISO Media, MP4 Base Media
file recording.aac  # Should show: ADTS, AAC

# Get detailed info (requires mediainfo)
mediainfo recording.m4a
```