# ExpoAudioStudio iOS Unit Tests

This directory contains unit tests for the ExpoAudioStudio iOS module.

## Test Files

- `AudioTestHelpers.swift` - Common test utilities and extensions
- `AudioFormatUtilsTests.swift` - Tests for audio format utilities
- `AudioFileHandlerTests.swift` - Tests for file handling
- `SimpleAudioTest.swift` - Basic audio functionality tests
- `TestAudioGenerator.swift` - Audio generation utilities for testing
- `CompressedOnlyOutputTests.swift` - Tests for compressed-only output feature (Issue #244)

## Running Tests

### In Xcode
1. Open the workspace/project containing ExpoAudioStudio
2. Select the test target
3. Press `Cmd+U` to run all tests or click on individual test methods

### From Command Line
```bash
# Run all tests
xcodebuild test -scheme ExpoAudioStudioTests -destination 'platform=iOS Simulator,name=iPhone 15'

# Run specific test class
xcodebuild test -scheme ExpoAudioStudioTests -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:ExpoAudioStudioTests/CompressedOnlyOutputTests
```

## Compressed-Only Output Tests

The `CompressedOnlyOutputTests.swift` file tests the fix for Issue #244, ensuring that:
- Compression info is properly returned when primary output is disabled
- AAC format works correctly
- Opus format falls back to AAC on iOS
- Compressed file URIs are accessible
- File sizes and metadata are correctly reported

These tests verify that users can access compressed audio files even when primary WAV output is disabled.