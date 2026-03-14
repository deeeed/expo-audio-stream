# Android Integration Tests

## Overview

This directory contains integration tests for the Buffer Duration and Skip File Writing features in expo-audio-studio. These tests validate ACTUAL Android platform behavior, not mocked behavior.

## Test Structure

### BufferDurationIntegrationTest
Tests the actual behavior of Android AudioRecord with different buffer sizes:
- Default buffer size handling
- Custom buffer sizes (10ms to 500ms)
- Buffer size limits (very small and very large)
- Buffer accumulation for small durations
- Different sample rates

### SkipFileWritingIntegrationTest
Tests the skip file writing feature:
- Normal recording baseline
- Skip file writing mode
- Data emission without file I/O
- Compression behavior with skip mode
- Pause/Resume functionality
- Memory-only operation

## Running the Tests

### Prerequisites
1. Android device or emulator connected
2. USB debugging enabled
3. Playground app built at least once

### Run All Integration Tests
```bash
cd packages/expo-audio-studio
./android/src/androidTest/java/net/siteed/audiostream/integration/run_integration_tests.sh
```

### Run Individual Tests
```bash
cd apps/playground/android

# Buffer Duration Test
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.BufferDurationIntegrationTest"

# Skip File Writing Test
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.SkipFileWritingIntegrationTest"
```

## Key Findings

### Android Buffer Behavior
- Android uses `AudioRecord.getMinBufferSize()` to determine minimum buffer
- Minimum buffer size varies by device and sample rate
- Unlike iOS, Android respects smaller buffer requests (with accumulation)
- No hard-coded minimum like iOS's 4800 frames

### Platform Differences from iOS
| Feature | iOS | Android |
|---------|-----|---------|
| Minimum Buffer | ~4800 frames (0.1s @ 48kHz) | Device-dependent |
| Buffer Flexibility | Rigid enforcement | More flexible |
| Small Buffer Handling | Ignored | Requires accumulation |
| API | AVAudioEngine | AudioRecord |

## Test Results Location
- HTML Report: `android/build/reports/androidTests/connected/index.html`
- XML Report: `android/build/test-results/androidTests/connected/`

## Implementation Notes

### Buffer Duration
When implementing buffer duration on Android:
1. Calculate buffer size: `frames * bytesPerSample * channels`
2. Check against `AudioRecord.getMinBufferSize()`
3. Use the larger of requested vs minimum
4. For small buffers, implement accumulation strategy

### Skip File Writing
When implementing skip file writing:
1. Conditionally create file based on flag
2. Continue audio data emission without file I/O
3. Skip compression processing when enabled
4. Maintain pause/resume functionality
5. Track statistics without file writing

## Next Steps

After these tests pass:
1. Implement `bufferDurationSeconds` in RecordingConfig
2. Implement `skipFileWriting` in RecordingConfig
3. Update AudioRecorderManager to handle dynamic buffer sizing
4. Update file creation/writing logic for skip mode
5. Run integration tests to validate implementation
6. Update playground app with new controls 