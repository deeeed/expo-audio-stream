# Test Plan for expo-audio-studio

## Overview

This document outlines the test plan for the core audio processing features of expo-audio-studio, focusing on:
1. Audio trimming and manipulation
2. Audio format conversion
3. Audio analysis and feature extraction
4. Audio recording functionality (E2E)
5. Device management and selection
6. Platform-specific integrations

## Test Coverage Progress

### Legend
- ✅ Implemented and passing
- 🚧 In progress
- ❌ Failed
- 📋 TODO

## Current Test Status

### Summary (as of latest run)
- **Android Tests**: 36/36 passing ✅
  - Unit Tests: 25/25 passing (AudioFileHandlerTest + AudioFormatUtilsTest)
  - Instrumented Tests: 11/11 passing (AudioProcessorInstrumentedTest + AudioRecorderInstrumentedTest)
- **iOS Tests**: 66/66 passing ✅
  - Standalone tests implemented and working
  - Audio processing, recording, and streaming tests
- **Total Tests**: 102/102 passing ✅

### Test Asset Management ✅

**Cleanup Completed**: Removed 7 unused test files, keeping only:
- `jfk.wav` - Speech sample, mono, 16kHz (used in multiple tests)
- `chorus.wav` - Music sample, stereo, 44.1kHz (used in AudioProcessor tests)
- `recorder_hello_world.wav` - Short speech sample (used in file handler tests)
- `osr_us_000_0010_8k.wav` - 8kHz sample (used in file handler tests)

**New Structure**: Created shared `test-assets/` directory to avoid duplication between platforms.

### Test File Status

#### Android Tests
1. **AudioFileHandlerTest** ✅ (11/11 tests passing)
   - All WAV file handling tests passing
   - File creation, deletion, and header operations working

2. **AudioFormatUtilsTest** ✅ (14/14 tests passing)
   - Bit depth conversions working correctly
   - Channel conversions implemented
   - Audio normalization functional
   - Resampling tests passing

3. **AudioProcessorInstrumentedTest** ✅ (5/5 tests passing)
   - All instrumented tests passing including channel conversion
   - Tests run on device/emulator with full Android framework
   - Audio loading, trimming, mel spectrogram, and preview generation working

4. **AudioRecorderInstrumentedTest** ✅ (6/6 tests passing)
   - End-to-end recording tests implemented
   - ✅ Basic recording with WAV file validation
   - ✅ Recording with real-time analysis
   - ✅ Pause/resume functionality
   - ✅ Compressed recording (AAC format)
   - ✅ Tone generation and capture verification

#### iOS Tests
1. **standalone_test.swift** ✅ (7/7 tests passing)
   - Basic WAV header and audio buffer tests

2. **audio_processing_test.swift** ✅ (8/8 tests passing)
   - RMS, zero crossing rate, channel/bit depth conversion

3. **audio_recording_test.swift** ✅ (25/25 tests passing)
   - AVAudioRecorder tests for WAV/AAC recording

4. **audio_streaming_test.swift** ✅ (26/26 tests passing)
   - AVAudioEngine real-time streaming tests

## Test Architecture Decision

### Problem
AudioProcessor tests depend on Android framework classes:
- `MediaExtractor` - for decoding compressed audio formats
- `MediaCodec` - for audio codec operations

AudioRecorder tests require:
- `AudioRecord` - for capturing audio from microphone
- `MediaRecorder` - for compressed audio recording
- Permissions handling

### Solution
Both AudioProcessor and AudioRecorder tests are implemented as instrumented tests that run on device/emulator with full Android framework support. Pure unit tests remain in the `test/` directory for components that don't require Android framework.

This approach:
- ✅ Requires NO changes to library code (except bug fixes)
- ✅ Tests run in appropriate environment
- ✅ Maintains test coverage
- ✅ Follows Android testing best practices
- ✅ Enables end-to-end testing of recording functionality

## Bug Fixes During Testing

### 1. Channel Conversion Bug ✅
- **Issue**: AudioProcessor.convertChannels() had incorrect implementation
- **Fix**: Changed to use AudioFormatUtils.convertChannels()
- **Impact**: Mono to stereo conversion now works correctly
- **Test**: testLoadAudioFromAnyFormat_withDecodingConfig now passes

## 1. Audio Trimming API Tests

### AudioProcessor.trimAudio()

#### Basic Trimming
- [x] ✅ Test trimming from start to end time (instrumented)
- [x] ✅ Test trimming with startTime = 0
- [ ] 📋 Test trimming with endTime = file duration
- [ ] 📋 Test trimming middle section of audio

#### Edge Cases
- [x] ✅ Test trimming with invalid time ranges (start > end)
- [ ] 📋 Test trimming beyond file duration
- [ ] 📋 Test trimming with negative timestamps
- [ ] 📋 Test trimming very short segments (< 100ms)
- [ ] 📋 Test trimming entire file (start=0, end=duration)

#### Multiple Segments
- [ ] 📋 Test keeping multiple segments (mode='keep')
- [ ] 📋 Test removing multiple segments (mode='remove')
- [ ] 📋 Test overlapping segments handling
- [ ] 📋 Test non-contiguous segments
- [ ] 📋 Test segment ordering (out of order ranges)

#### File Format Support
- [x] ✅ Test trimming WAV files (instrumented)
- [ ] 📋 Test trimming compressed formats (MP3, AAC)
- [ ] 📋 Test output format conversion during trim

#### Performance
- [ ] 📋 Test trimming large files (> 10MB)
- [ ] 📋 Test memory usage during trimming
- [ ] 📋 Benchmark trimming speed

## 2. Audio Conversion Tests

### AudioProcessor.loadAudioFromAnyFormat()

#### Format Detection
- [x] ✅ Test WAV file detection (instrumented)
- [ ] 📋 Test MP3 file detection
- [ ] 📋 Test AAC file detection
- [ ] 📋 Test unsupported format handling

#### Decoding
- [x] ✅ Test WAV to PCM conversion (instrumented)
- [ ] 📋 Test MP3 to PCM conversion
- [ ] 📋 Test AAC to PCM conversion
- [x] ✅ Test preserving audio properties (sample rate, channels)

### DecodingConfig Options

#### Sample Rate Conversion
- [x] ✅ Test upsampling (e.g., 16kHz to 44.1kHz) (instrumented)
- [x] ✅ Test downsampling (e.g., 48kHz to 16kHz)
- [x] ✅ Test maintaining original sample rate (null config)

#### Channel Conversion
- [x] ✅ Test mono to stereo conversion (fixed bug, now passing)
- [x] ✅ Test stereo to mono conversion
- [ ] 📋 Test multi-channel handling

#### Bit Depth Conversion
- [x] ✅ Test 8-bit to 16-bit conversion
- [x] ✅ Test 16-bit to 32-bit conversion
- [x] ✅ Test 32-bit to 16-bit conversion

#### Audio Normalization
- [x] ✅ Test normalization of quiet audio
- [x] ✅ Test normalization of loud audio
- [x] ✅ Test normalization disabled

## 3. Audio Analysis Tests

### AudioProcessor.processAudioData()

#### Basic Feature Extraction
- [x] ✅ Test RMS calculation
- [x] ✅ Test energy calculation
- [x] ✅ Test zero-crossing rate
- [ ] 📋 Test amplitude range detection

#### Spectral Features
- [x] ✅ Test spectral centroid calculation
- [x] ✅ Test spectral flatness
- [x] ✅ Test spectral rolloff
- [x] ✅ Test spectral bandwidth

#### Advanced Features
- [x] ✅ Test MFCC extraction
- [ ] 📋 Test chromagram generation
- [x] ✅ Test mel spectrogram (instrumented)
- [ ] 📋 Test tempo estimation
- [ ] 📋 Test pitch detection
- [ ] 📋 Test harmonics-to-noise ratio (HNR)

#### Segmentation
- [ ] 📋 Test different segment durations
- [ ] 📋 Test overlapping segments
- [ ] 📋 Test segment boundary handling

### AudioProcessor.extractMelSpectrogram()

#### Parameters
- [x] ✅ Test different window sizes (instrumented)
- [x] ✅ Test different hop lengths (instrumented)
- [x] ✅ Test different number of mel bins (instrumented)
- [ ] 📋 Test frequency range limits

#### Output Validation
- [x] ✅ Test spectrogram dimensions (instrumented)
- [x] ✅ Test timestamp accuracy (instrumented)
- [x] ✅ Test frequency bin mapping (instrumented)

### AudioProcessor.generatePreview()

#### Preview Generation
- [x] ✅ Test different points per second (instrumented)
- [x] ✅ Test time range selection
- [ ] 📋 Test amplitude normalization
- [ ] 📋 Test silent audio handling

## 4. Audio Recording Tests (E2E)

### AudioRecorderInstrumentedTest

#### Basic Recording ✅
- [x] ✅ Test basic recording creates WAV file
- [x] ✅ Test WAV header validation
- [x] ✅ Test audio data events are emitted
- [x] ✅ Test file size and content validation

#### Recording with Analysis ✅
- [x] ✅ Test real-time feature extraction during recording
- [x] ✅ Test analysis events contain expected features (RMS, ZCR, Energy)
- [x] ✅ Test analysis interval configuration

#### Pause/Resume Functionality ✅
- [x] ✅ Test pause stops audio data emission
- [x] ✅ Test resume continues recording
- [x] ✅ Test file continuity after pause/resume

#### Compressed Recording ✅
- [x] ✅ Test AAC file creation alongside WAV
- [x] ✅ Test compressed file is smaller than WAV
- [x] ✅ Test both files contain valid data

#### Audio Content Verification ✅
- [x] ✅ Test tone generation and capture
- [x] ✅ Test spectral analysis of recorded content
- [x] ✅ Test energy levels indicate actual audio capture

#### Additional Recording Tests (TODO)
- [ ] 📋 Test different sample rates (8kHz, 16kHz, 44.1kHz, 48kHz)
- [ ] 📋 Test stereo recording
- [ ] 📋 Test different encodings (8-bit, 32-bit)
- [ ] 📋 Test very long recordings (> 1 minute)
- [ ] 📋 Test recording with device switching
- [ ] 📋 Test recording interruption handling
- [ ] 📋 Test concurrent recording attempts
- [ ] 📋 Test recording with background noise
- [ ] 📋 Test opus compressed format
- [ ] 📋 Test custom output directory and filename

## 5. Integration Tests

### End-to-End Workflows
- [ ] 📋 Load → Analyze → Trim → Save workflow
- [ ] 📋 Load → Convert → Analyze workflow
- [ ] 📋 Record → Analyze → Trim → Save workflow
- [ ] 📋 Record → Convert to different format
- [ ] 📋 Multiple operations on same file

### Error Handling
- [ ] 📋 Test corrupted file handling
- [ ] 📋 Test missing file handling
- [ ] 📋 Test permission errors
- [ ] 📋 Test out of memory scenarios
- [ ] 📋 Test microphone unavailable scenarios

## 6. Performance Benchmarks

### Processing Speed
- [x] ✅ Measure analysis time vs file size
- [ ] 📋 Measure trimming time vs file size
- [ ] 📋 Measure conversion time vs file size
- [ ] 📋 Measure recording overhead

### Memory Usage
- [ ] 📋 Peak memory during analysis
- [ ] 📋 Peak memory during trimming
- [ ] 📋 Peak memory during recording
- [ ] 📋 Memory cleanup verification

## Test Data Requirements

### Audio Files Needed
1. **Basic Test Files**
   - ✅ `jfk.wav` - Speech, mono, 16kHz, 16-bit
   - ✅ `chorus.wav` - Music, stereo, 44.1kHz, 16-bit
   - ✅ `recorder_hello_world.wav` - Short speech sample
   - ✅ `osr_us_000_0010_8k.wav` - 8kHz sample

2. **Additional Test Files Needed**
   - [ ] 📋 8-bit WAV file
   - [ ] 📋 32-bit WAV file
   - [ ] 📋 MP3 file (various bitrates)
   - [ ] 📋 AAC file
   - [ ] 📋 Very long audio file (> 5 minutes)
   - [ ] 📋 Very short audio file (< 1 second)
   - [ ] 📋 Silent audio file
   - [ ] 📋 Corrupted/invalid file

3. **Generated Test Audio**
   - ✅ Sine wave tones for frequency verification
   - 📋 White noise for spectral analysis
   - 📋 Speech synthesis for transcription tests

## Implementation Status

### Completed Components

#### Android
1. **AudioFileHandlerTest.kt** ✅ (11/11 tests passing)
   - WAV header writing and validation
   - Audio file creation and deletion
   - Storage cleanup
   - Real WAV file processing

2. **AudioFormatUtilsTest.kt** ✅ (14/14 tests passing)
   - Bit depth conversions (8↔16, 16↔32)
   - Channel conversions (mono↔stereo)
   - Audio normalization
   - Sample rate conversion (resampling)

3. **LogUtils.kt** ✅
   - Modified to support test environment
   - Uses System.out instead of Android Log in tests

4. **AudioProcessorInstrumentedTest.kt** ✅ (5/5 tests passing)
   - Instrumented version of AudioProcessor tests
   - Runs on device/emulator with full Android framework
   - Tests audio loading, trimming, and analysis features
   - All tests passing including channel conversion

5. **AudioRecorderInstrumentedTest.kt** ✅ (6/6 tests passing)
   - End-to-end recording tests
   - Tests actual microphone recording
   - Validates file creation and audio content
   - Tests pause/resume and compressed recording
   - Includes tone generation for audio verification

#### iOS
1. **standalone_test.swift** ✅ (7/7 tests passing)
   - Basic WAV header creation
   - Audio buffer creation

2. **audio_processing_test.swift** ✅ (8/8 tests passing)
   - RMS calculation
   - Zero crossing rate
   - Channel conversion
   - Bit depth conversion

3. **audio_recording_test.swift** ✅ (25/25 tests passing)
   - AVAudioRecorder tests
   - WAV and AAC recording
   - Recording validation

4. **audio_streaming_test.swift** ✅ (26/26 tests passing)
   - AVAudioEngine setup
   - Real-time streaming
   - Buffer processing

### Issues Resolved

1. **Android Log Mocking** ✅
   - Fixed by modifying LogUtils to detect test environment
   - Now uses println() instead of Log methods during tests

2. **Bit Depth Conversion** ✅
   - Fixed 8-to-16 bit conversion to properly map full range
   - Special handling for edge cases (0 → -32768, 255 → 32767)

3. **AudioProcessor Framework Dependencies** ✅
   - Resolved by creating instrumented tests
   - Tests now run in appropriate environment

4. **Channel Conversion Bug** ✅ (Fixed during testing)
   - AudioProcessor.convertChannels() was using incorrect implementation
   - Fixed by delegating to AudioFormatUtils.convertChannels()
   - Mono to stereo conversion now works correctly

### Current Status

✅ **All tests passing!** 102/102 tests are green.
- Android: 36/36 tests passing
  - Unit tests handle pure logic without Android dependencies (25/25 ✅)
  - Instrumented tests handle Android framework-dependent functionality (11/11 ✅)
- iOS: 66/66 tests passing
  - Standalone Swift tests working without Xcode
  - Tests adapted for iOS-specific APIs

## Running the Tests

### All Platforms
```bash
# Run all tests for both Android and iOS
cd packages/expo-audio-studio
./scripts/run_tests.sh

# Or specify what to run
./scripts/run_tests.sh all           # Both platforms (default)
./scripts/run_tests.sh android       # Android only
./scripts/run_tests.sh ios           # iOS only
./scripts/run_tests.sh android unit  # Android unit tests only
```

### Android Tests

#### Run All Tests
```bash
# Using the unified test runner
cd packages/expo-audio-studio
./scripts/run_tests.sh android

# Or run specific test types
./scripts/run_tests.sh android unit        # Unit tests only
./scripts/run_tests.sh android instrumented # Instrumented tests only
```

#### Direct Gradle Commands
```bash
# Unit Tests (JVM)
cd apps/playground/android
./gradlew :siteed-expo-audio-studio:test

# Instrumented Tests (Device/Emulator)
./gradlew :siteed-expo-audio-studio:connectedAndroidTest

# All Tests
./gradlew :siteed-expo-audio-studio:test :siteed-expo-audio-studio:connectedAndroidTest
```

#### Running Specific Test Classes
```bash
# Run only recording tests
./gradlew :siteed-expo-audio-studio:connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=net.siteed.audiostream.AudioRecorderInstrumentedTest

# Run only processor tests
./gradlew :siteed-expo-audio-studio:connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=net.siteed.audiostream.AudioProcessorInstrumentedTest
```

### iOS Tests

#### Run All Tests
```bash
# Using the unified test runner
cd packages/expo-audio-studio
./scripts/run_tests.sh ios
```

#### Run Individual Tests
```bash
# Run basic audio tests
swift standalone_test.swift

# Run audio processing tests
swift audio_processing_test.swift

# Run recording tests (requires microphone permission)
swift audio_recording_test.swift

# Run streaming tests (requires microphone permission)
swift audio_streaming_test.swift
```

#### Xcode Integration (for XCTest-based tests)

The test target needs to be added to the Xcode project:

1. Open `apps/playground/ios/AudioDevPlayground.xcworkspace`
2. Select the project navigator
3. Add a new target: File → New → Target → iOS Unit Testing Bundle
4. Name: `ExpoAudioStudioTests`
5. Configure:
   - Bundle Identifier: `net.siteed.ExpoAudioStudioTests`
   - Language: Swift
   - Include Unit Tests: Yes
6. Add test files to the target
7. Link against the expo-audio-studio module
8. Add test assets as resources

Once configured, run tests through Xcode:
- Press `Cmd+U` to run all tests
- Or use xcodebuild: `xcodebuild test -workspace ../../../apps/playground/ios/AudioDevPlayground.xcworkspace -scheme ExpoAudioStudioTests -destination 'platform=iOS Simulator,name=iPhone 14'`

## Next Steps

### Immediate
1. ✅ ~~Run instrumented tests to verify they work correctly~~ - Done, all passing
2. ✅ ~~Fix channel conversion bug~~ - Fixed
3. ✅ ~~Clean up test structure~~ - Done, removed AudioProcessorTest
4. ✅ ~~Add E2E recording tests~~ - Done, 6 tests implemented
5. ✅ ~~Implement iOS tests~~ - Done, 66 tests implemented

### Short Term
1. Add more recording test scenarios (different formats, error cases)
2. Add tests for compressed audio formats (MP3, AAC) in AudioProcessor
3. Create integration tests for complex workflows
4. Add memory and performance benchmarks
5. Generate additional test audio files
6. Test device switching and interruption scenarios

### Long Term
1. Set up CI/CD integration with both unit and instrumented tests
2. Create cross-platform consistency tests
3. Implement automated test coverage reporting
4. Add stress tests for long recordings
5. Integrate iOS tests with Xcode project

## Success Criteria

- ✅ All core functionality tests passing (102/102)
- No memory leaks detected
- Performance within acceptable bounds:
  - Trimming: < 100ms for 1-minute audio
  - Analysis: < 500ms for 1-minute audio
  - Conversion: < 200ms for 1-minute audio
  - Recording: < 5% CPU overhead
- Error handling covers all edge cases
- Test coverage > 80% for critical paths

## Issues Fixed During Testing

1. **Compressed Recording Test**
   - **Issue**: The test was passing compression options in the wrong format
   - **Fix**: Changed from flat options to nested compression map structure
   - **Result**: Test now passes successfully

2. **Pause/Resume Test**
   - **Issue**: Audio events were still being received after pause due to timing
   - **Fix**: Added delay and cleared events after pause to ensure clean state
   - **Result**: Test now passes reliably

3. **AVAudioSession on macOS**
   - **Issue**: AVAudioSession unavailable on macOS
   - **Fix**: Used conditional compilation (#if os(iOS))
   - **Result**: Tests run on both iOS and macOS

## Notes

- Unit tests run on JVM for fast feedback
- Instrumented tests run on device for framework-dependent features
- E2E recording tests require microphone permission
- Tone generation allows verification of actual audio capture
- Fixed one bug (channel conversion) during test implementation
- Clean test structure with appropriate separation
- Focus on testing the native Kotlin/Swift implementations
- Use real audio files for realistic testing
- Ensure tests are deterministic and reproducible
- Document any platform-specific behaviors
- iOS tests can run standalone without Xcode

## Test Categories (Based on Features)

1. **Recording & Streaming** (High Priority)
   - Real-time audio streaming
   - Dual-stream recording (PCM + compressed)
   - Background recording
   - Zero-latency recording with preparation
   - Interruption handling

2. **Device Management** (High Priority)
   - Audio input device detection and selection
   - Device capability queries
   - Bluetooth device handling
   - Fallback device management 

3. **Audio Analysis** (Medium Priority)
   - Basic features (RMS, energy, ZCR)
   - Spectral features (centroid, flatness, rolloff)
   - Advanced features (MFCC, tempo, pitch)
   - Mel spectrogram generation
   - Preview generation

4. **Audio Manipulation** (Medium Priority)
   - Audio trimming (single/multiple segments)
   - Format conversion
   - Bit depth/channel/sample rate conversion

5. **Platform Integration** (Low Priority)
   - Permissions handling
   - Notification systems
   - Background audio sessions
   - File system operations

## Platform-Specific API Mappings

### Android → iOS API Mapping
| Android | iOS | Purpose |
|---------|-----|---------|
| AudioRecord | AVAudioEngine/AVAudioRecorder | Audio recording |
| MediaRecorder | AVAudioRecorder | Compressed recording |
| MediaExtractor | AVAsset | Audio file reading |
| MediaCodec | AVAudioConverter | Format conversion |
| AudioTrack | AVAudioPlayer/AVAudioEngine | Audio playback |
| AudioManager | AVAudioSession | Audio routing |

### Test Framework Mapping
| Android | iOS | Purpose |
|---------|-----|---------|
| JUnit | XCTest | Test framework |
| @Test | func test*() | Test methods |
| assertEquals | XCTAssertEqual | Assertions |
| CountDownLatch | XCTestExpectation | Async testing |
