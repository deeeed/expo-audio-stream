# Contributing to @siteed/expo-audio-studio

Thank you for your interest in contributing to this library! This document provides comprehensive guidelines for contributing to the project using a test-driven development approach.

## Table of Contents

- [Development Philosophy](#development-philosophy)
- [Feature Development Process](#feature-development-process)
- [Test-Driven Development Workflow](#test-driven-development-workflow)
- [Platform Implementation Order](#platform-implementation-order)
- [Testing Architecture](#testing-architecture)
- [Development Setup](#development-setup)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Development Philosophy

This project strongly encourages a **Test-Driven Development (TDD)** approach for new features. With the testing framework now in place, this approach helps ensure:
- High code quality and reliability
- Clear feature specifications before implementation
- Consistent behavior across platforms
- Easier maintenance and refactoring
- Living documentation through tests

### Core Principles

1. **Write Tests First**: When possible, define expected behavior through tests before writing implementation
2. **Cross-Platform Consistency**: Ensure features work identically on iOS, Android, and Web
3. **Architecture First**: Design the API and architecture before coding
4. **Incremental Development**: Build features in small, testable increments
5. **Continuous Validation**: Run tests after each change

> **Note**: The testing framework is newly available. While TDD is highly recommended for new features, existing code may not have full test coverage. Contributors are encouraged to add tests when modifying existing features.

## Feature Development Process

### Step 1: Architecture Design

Before writing any code:

1. **Define the Feature Goal**
   - What problem does this solve?
   - Who will use this feature?
   - What are the success criteria?

2. **Design the API**
   ```typescript
   // Example: New audio feature API design
   interface AudioFeatureConfig {
     sampleRate?: number;
     windowSize?: number;
     hopLength?: number;
   }
   
   interface AudioFeatureResult {
     timestamp: number;
     value: number;
     confidence?: number;
   }
   
   // Define the public API
   function extractAudioFeature(
     audioData: Float32Array,
     config?: AudioFeatureConfig
   ): AudioFeatureResult[];
   ```

3. **Create Architecture Document**
   - Create a design doc in `docs/architecture/FEATURE_NAME.md`
   - Include API design, data flow, and platform considerations
   - Get review and approval before proceeding

### Step 2: Test Specification (Recommended)

Creating comprehensive test specifications helps ensure robust implementations:

1. **Create Test Plan**
   ```markdown
   # Test Plan: [Feature Name]
   
   ## Unit Tests
   - [ ] Basic functionality with default parameters
   - [ ] Custom configuration handling
   - [ ] Edge cases (empty data, invalid params)
   - [ ] Error scenarios
   
   ## Integration Tests
   - [ ] Works with audio recording
   - [ ] Works with file processing
   - [ ] Performance benchmarks
   
   ## Platform Tests
   - [ ] iOS implementation matches spec
   - [ ] Android implementation matches spec
   - [ ] Web implementation matches spec
   ```

2. **Write Test Cases First (When Possible)**
   ```typescript
   // Example test file: __tests__/audioFeature.test.ts
   describe('AudioFeature', () => {
     it('should extract features from audio data', () => {
       const audioData = generateTestTone(440, 1.0); // 440Hz, 1 second
       const features = extractAudioFeature(audioData);
       
       expect(features).toHaveLength(43); // 1 second at default hop
       expect(features[0].timestamp).toBe(0);
       expect(features[0].value).toBeCloseTo(0.5, 2);
     });
     
     it('should handle empty audio data', () => {
       const features = extractAudioFeature(new Float32Array(0));
       expect(features).toEqual([]);
     });
     
     // More test cases...
   });
   ```

### Step 3: Implementation Order

Follow this recommended implementation order:

#### 1. TypeScript Interface (Shared)
```typescript
// src/types/AudioFeature.ts
export interface AudioFeatureExtractor {
  extract(audioData: Float32Array, config?: AudioFeatureConfig): AudioFeatureResult[];
  getName(): string;
  getDefaultConfig(): AudioFeatureConfig;
}
```

#### 2. iOS Implementation
```swift
// ios/AudioFeatureExtractor.swift
class AudioFeatureExtractor {
    func extract(audioData: [Float], config: AudioFeatureConfig?) -> [AudioFeatureResult] {
        // Implementation
    }
}
```

**Validation**: Run iOS tests
```bash
cd packages/expo-audio-studio
./scripts/run_tests.sh ios
```

#### 3. Android Implementation
```kotlin
// android/src/main/java/net/siteed/audiostream/AudioFeatureExtractor.kt
class AudioFeatureExtractor {
    fun extract(audioData: FloatArray, config: AudioFeatureConfig?): List<AudioFeatureResult> {
        // Implementation
    }
}
```

**Validation**: Run Android tests
```bash
cd packages/expo-audio-studio
./scripts/run_tests.sh android
```

#### 4. Web Implementation (if applicable)
```typescript
// src/web/AudioFeatureExtractor.ts
export class AudioFeatureExtractor {
  extract(audioData: Float32Array, config?: AudioFeatureConfig): AudioFeatureResult[] {
    // Implementation using Web Audio API
  }
}
```

#### 5. Integration Testing
Run cross-platform tests to ensure consistency:
```bash
cd packages/expo-audio-studio
yarn test:integration
```

## Test-Driven Development Workflow

### The TDD Cycle (Recommended Approach)

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code while keeping tests green

### Example Workflow

```bash
# 1. Create feature branch
git checkout -b feature/audio-pitch-detection

# 2. Write test first (recommended)
touch src/__tests__/pitchDetection.test.ts
# Write failing tests

# 3. Run tests (should fail)
yarn test

# 4. Implement for iOS
# Edit ios/PitchDetector.swift
./scripts/run_tests.sh ios

# 5. Implement for Android
# Edit android/src/main/java/.../PitchDetector.kt
./scripts/run_tests.sh android

# 6. Ensure all tests pass
./scripts/run_tests.sh all

# 7. Add integration tests
# Edit e2e/pitchDetection.e2e.ts

# 8. Run full test suite
yarn test:all
```

## Testing Architecture

### Test Categories

1. **Unit Tests**
   - Pure logic without platform dependencies
   - Fast, isolated tests
   - Location: `src/__tests__/`

2. **Platform Tests**
   - iOS: `ios/ExpoAudioStudioTests/`
   - Android: `android/src/test/` (unit) and `android/src/androidTest/` (instrumented)
   - Test native implementations

3. **Integration Tests**
   - End-to-end feature tests
   - Cross-platform consistency tests
   - Location: `e2e/`

### Test Structure

```
packages/expo-audio-studio/
├── src/
│   └── __tests__/          # TypeScript unit tests
├── android/
│   ├── src/test/           # Android unit tests (JVM)
│   └── src/androidTest/    # Android instrumented tests
├── ios/
│   └── ExpoAudioStudioTests/  # iOS tests
├── e2e/                    # Integration tests
└── test-assets/            # Shared test audio files
```

### Running Tests

```bash
# Run all tests
./scripts/run_tests.sh

# Run specific platform
./scripts/run_tests.sh android
./scripts/run_tests.sh ios

# Run specific test type
./scripts/run_tests.sh android unit
./scripts/run_tests.sh android instrumented

# Run with coverage
yarn test:coverage
```

## Development Setup

### Prerequisites

1. **Environment Setup**
   ```bash
   # Install dependencies
   yarn install
   
   # Build the module
   yarn build
   
   # Prepare test environment
   yarn test:prepare
   ```

2. **Platform-Specific Setup**
   - **iOS**: Xcode 14+ with Swift 5.7+
   - **Android**: Android Studio with Kotlin 1.8+
   - **Web**: Node.js 18+ with TypeScript 5+

### Test Data

Test audio files are located in `test-assets/`:
- `jfk.wav` - Speech sample (mono, 16kHz)
- `chorus.wav` - Music sample (stereo, 44.1kHz)
- `tone_440hz.wav` - Pure tone for frequency tests

## Debugging

### Android (ADB)

For Android development, you can use ADB (Android Debug Bridge) to view and filter log output from the library. The library uses a standardized logging approach with consistent prefixes to make filtering easier.

#### Viewing All Library Logs

```bash
# View all logs from the library
adb logcat -v time | grep "ExpoAudioStudio"
```

#### Filtering by Component

```bash
# View logs from specific components
adb logcat -v time | grep "ExpoAudioStudio:AudioDeviceManager"
adb logcat -v time | grep "ExpoAudioStudio:AudioRecorderManager"
adb logcat -v time | grep "ExpoAudioStudio:AudioProcessor"
```

#### Common Debug Commands

```bash
# View only errors from the library
adb logcat -v time | grep "ExpoAudioStudio" | grep " E "

# Save logs to a file for analysis
adb logcat -v time | grep "ExpoAudioStudio" > expo_audio_logs.txt

# Clear logcat buffer
adb logcat -c

# View test logs
adb logcat -v time | grep "ExpoAudioStudioTest"
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

# View logs from the module directly
xcrun simctl spawn booted log stream --predicate 'subsystem contains "ExpoAudioStudio"'
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

# View logs from the module directly
log stream --predicate 'subsystem contains "ExpoAudioStudio"'
```

For a better debugging experience, use the Console app:

1. Open **Console** app on your Mac
2. Select your device/simulator from the sidebar
3. Filter with: `process:AudioDevPlayground` or similar

### Test Debugging

```bash
# Run tests with verbose output
./scripts/run_tests.sh android --verbose

# Run specific test
./gradlew :siteed-expo-audio-studio:test --tests "*.AudioProcessorTest.testTrimAudio"

# Debug iOS test
swift test --filter AudioProcessorTests/testTrimAudio
```

## Code Style

### General Guidelines

1. **TypeScript/JavaScript**
   - Use functional programming patterns
   - Prefer interfaces over types
   - No enums, use const objects
   - Comprehensive JSDoc comments

2. **Kotlin (Android)**
   - Follow Kotlin coding conventions
   - Use coroutines for async operations
   - Prefer data classes for models

3. **Swift (iOS)**
   - Follow Swift API design guidelines
   - Use async/await for async operations
   - Prefer structs over classes when possible

### Testing Standards

1. **Test Naming**
   ```typescript
   // Good
   it('should extract MFCC features from mono audio at 16kHz', () => {});
   
   // Bad
   it('test mfcc', () => {});
   ```

2. **Test Structure**
   - Arrange: Set up test data
   - Act: Execute the function
   - Assert: Verify the result

3. **Test Coverage Goals**
   - Target 80% coverage for new features
   - Aim for 100% coverage for critical paths
   - Include edge cases and error scenarios

## Pull Request Process

### MANDATORY: Integration Tests for New Features

**All new features MUST include integration tests that validate ACTUAL platform behavior.** See [PR_METHODOLOGY.md](../../docs/PR_METHODOLOGY.md) for detailed requirements.

Integration tests are critical because they:
- Reveal undocumented platform limitations (e.g., iOS minimum buffer sizes)
- Validate actual behavior, not mocked behavior
- Ensure cross-platform consistency
- Serve as living documentation

Example from the buffer duration feature:
```swift
// Integration test discovered iOS enforces minimum 4800 frames
// This critical limitation would have been missed by unit tests
```

### Before Submitting

1. **Run Full Test Suite**
   ```bash
   yarn test:all
   yarn lint
   yarn format:check
   ```

2. **Update Documentation**
   - Update API documentation
   - Update test plan if needed
   - Add usage examples

3. **Self Review Checklist**
   - [ ] All tests pass on all platforms
   - [ ] New features have tests (highly recommended)
   - [ ] API changes are documented
   - [ ] Breaking changes are noted
   - [ ] Performance impact is measured

### PR Template

```markdown
## Description
Brief description of the feature/fix

## Integration Tests
- [ ] **MANDATORY for new features**: Integration tests that validate ACTUAL platform behavior
- [ ] Tests reveal any platform limitations (document them!)
- [ ] iOS integration tests pass
- [ ] Android integration tests pass
- [ ] Test results included below

## Test Results
```
# Paste integration test output here
# Example: iOS buffer duration test revealed 4800 frame minimum
```

## Architecture Decision
Link to design doc or explain architectural choices

## Testing
- [ ] Unit tests added/updated
- [ ] Platform tests pass (iOS/Android/Web)
- [ ] Cross-platform consistency verified

## Documentation
- [ ] Updated EXISTING docs (don't create new files for config options)
- [ ] Added examples to relevant guides
- [ ] Platform-specific behavior documented

## Checklist
- [ ] Integration tests REQUIRED for features
- [ ] Minimal file changes
- [ ] No unnecessary subdirectories
- [ ] Breaking changes documented
- [ ] Follows code style guidelines
```

## Release Process

### Version Management

Semantic versioning is used:
- **Major**: Breaking API changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

### Release Checklist

1. **Pre-release**
   - [ ] All tests pass
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] Version bumped

2. **Testing**
   - [ ] Run on iOS device
   - [ ] Run on Android device
   - [ ] Test in playground app
   - [ ] Performance benchmarks

3. **Release**
   ```bash
   yarn release:prepare
   yarn release:publish
   ```

## Common Patterns

### Adding a New Audio Feature

1. **Design Phase**
   ```typescript
   // 1. Define types in src/types/
   interface NewFeatureConfig { /* ... */ }
   interface NewFeatureResult { /* ... */ }
   ```

2. **Test Phase (Recommended)**
   ```typescript
   // 2. Write tests in src/__tests__/
   describe('NewFeature', () => {
     // Test cases
   });
   ```

3. **Implementation Phase**
   ```kotlin
   // 3. Android: android/src/main/java/.../NewFeature.kt
   class NewFeature { /* ... */ }
   ```
   
   ```swift
   // 4. iOS: ios/NewFeature.swift
   class NewFeature { /* ... */ }
   ```

4. **Integration Phase**
   ```typescript
   // 5. Expose in module API
   export function processNewFeature(/* ... */) { /* ... */ }
   ```

### Testing Platform-Specific Code

```typescript
// Test both platforms produce same results
it('should produce consistent results across platforms', async () => {
  const audioData = loadTestAudio('test.wav');
  
  const iosResult = await runIosImplementation(audioData);
  const androidResult = await runAndroidImplementation(audioData);
  
  expect(iosResult).toEqual(androidResult);
});
```

## Getting Help

- **Documentation**: Check `docs/` folder
- **Examples**: See playground app
- **Issues**: GitHub issues for bugs/features
- **Discussions**: GitHub discussions for questions

**Note**: The testing framework is continuously improving. Contributors are encouraged to help expand test coverage and improve testing practices as the project evolves. 