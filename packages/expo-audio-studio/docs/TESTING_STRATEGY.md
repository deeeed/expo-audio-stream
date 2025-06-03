# Testing Strategy for expo-audio-studio

## Overview

This document outlines the testing strategy for the expo-audio-studio library within the expo-audio-stream monorepo. The testing approach is designed to work within the Expo module architecture and leverages the playground app's build system for native testing.

## Monorepo Testing Architecture

### Why Tests Run Through the Playground App

In the Expo module ecosystem, native modules don't have their own standalone build systems. Instead, they rely on the parent application (in our case, the playground app) to provide:

1. **Gradle wrapper** for Android builds
2. **Xcode workspace** for iOS builds
3. **Native dependencies** and build configurations
4. **Test runners** and instrumentation

This is why our test scripts reference the playground app's build system:
```json
"test:android:unit": "cd ../../apps/playground/android && ./gradlew :siteed-expo-audio-studio:test"
```

### Module Structure in Parent Project

When the playground app builds, it includes expo-audio-studio as a native module. The Android Gradle system recognizes it as a subproject, allowing us to run module-specific tests using the `:siteed-expo-audio-studio:test` task notation.

## Testing Layers

### 1. Unit Tests (Current Implementation)
- **Location**: `android/src/test/` and `ios/ExpoAudioStudioTests/`
- **Execution**: Run on JVM (Android) or simulator (iOS)
- **Dependencies**: Minimal, uses mocked Android/iOS frameworks
- **Purpose**: Test business logic in isolation

### 2. Instrumentation Tests (Future)
- **Location**: `android/src/androidTest/`
- **Execution**: Requires device/emulator
- **Purpose**: Test actual device interactions

### 3. Integration Tests (Via Playground App)
- **Location**: `apps/playground/e2e/`
- **Purpose**: Test the module integrated with a real app

## Current Implementation Status

### ✅ Completed
1. Basic test structure for Android
2. AudioFileHandlerTest with WAV file operations
3. Real audio file fixtures from playground app
4. Test scripts in package.json
5. Module name resolution (`:siteed-expo-audio-studio`)

### 🚧 In Progress
1. Fixing Android Log mocking issues in unit tests

### 📋 TODO
1. Add proper Android Log mocking
2. Add AudioProcessorTest
3. Implement iOS tests
4. Set up CI/CD integration

## Platform Compilation Verification

### Critical Requirement: Code Must Compile

Before running any tests, **all native code changes must compile successfully**. This is a fundamental requirement that prevents issues like:

- Swift scope errors (variables accessed outside their scope)
- Kotlin compilation failures
- Missing imports or undefined symbols
- Type mismatches between platforms

### iOS Compilation Verification

**MANDATORY for any Swift code changes:**

```bash
# Method 1: Through playground app (recommended)
cd apps/playground
yarn ios --build-only

# Method 2: Through Xcode (for detailed error analysis)
cd apps/playground
yarn open:ios
# Then build in Xcode (⌘+B)

# Method 3: Direct xcodebuild (for CI)
cd apps/playground/ios
xcodebuild -workspace AudioDevPlayground.xcworkspace -scheme AudioDevPlayground -destination 'platform=iOS Simulator,name=iPhone 14' build
```

**Common iOS compilation issues to watch for:**
- Variable scope errors (e.g., accessing `if let` variables outside their scope)
- Missing optional chaining (`?.` or `!`)
- Type mismatches with Objective-C bridge
- Missing import statements

### Android Compilation Verification

**MANDATORY for any Kotlin code changes:**

```bash
# Method 1: Through playground app (recommended)
cd apps/playground
yarn android --build-only

# Method 2: Through Gradle directly
cd apps/playground/android
./gradlew assembleDebug

# Method 3: Through Android Studio
cd apps/playground
yarn open:android
# Then build in Android Studio (Build → Make Project)
```

**Common Android compilation issues to watch for:**
- Missing import statements
- Kotlin null safety violations
- Java/Kotlin interop issues
- Missing dependencies in build.gradle

### Example: Scope Error that Should Be Caught

This real example from issue #255 shows a scope error that should be caught during compilation:

```swift
// WRONG: compressedURL is out of scope
if settings.output.compressed.enabled, let compressedURL = compressedFileURL {
    // compressedURL is only available inside this block
    let compressedPath = compressedURL.path
    // ... more code
} // <- compressedURL scope ends here

let result = RecordingResult(
    // ERROR: compressedURL is undefined here
    filename: compression != nil ? (compressedURL?.lastPathComponent ?? "compressed-audio") : "stream-only"
)

// CORRECT: Use the class property
let result = RecordingResult(
    filename: compression != nil ? (compressedFileURL?.lastPathComponent ?? "compressed-audio") : "stream-only"
)
```

### Why This Wasn't Caught Previously

This type of error can slip through when:

1. **No automatic compilation in CI/CD** - Changes can be committed without compilation
2. **Local testing skipped** - Developers commit without building locally
3. **Integration tests don't compile** - Tests simulate rather than compile actual code
4. **Manual process** - Relies on developers remembering to test

### Prevention Strategy

**For all contributors:**
1. **Always build before committing** native code changes
2. **Use IDE warnings** - Pay attention to Xcode/Android Studio warnings
3. **Test on actual devices** when possible
4. **Follow the PR checklist** in CONTRIBUTE.md

**For repository maintainers:**
1. **Require compilation verification** in PR reviews
2. **Set up CI/CD compilation checks** (future improvement)
3. **Enforce pre-commit hooks** that check compilation
4. **Regular integration testing** on real devices

## Known Issues and Solutions

### Android Log Mocking

When running unit tests on the JVM, Android framework classes like `Log` are not available. This causes tests to fail with:
```
java.lang.RuntimeException: Method e in android.util.Log not mocked
```

**Solutions:**

1. **Use Robolectric** (Recommended for complex tests):
   ```gradle
   testImplementation 'org.robolectric:robolectric:4.11.1'
   ```
   Then annotate test class with `@RunWith(RobolectricTestRunner::class)`

2. **Mock Android Log** (Simple solution):
   Add to test dependencies:
   ```gradle
   testImplementation 'org.mockito:mockito-core:5.1.1'
   testImplementation 'org.mockito:mockito-inline:5.1.1'
   ```
   Then mock in test setup.

3. **Conditional Logging** (Code modification):
   Modify LogUtils to check if running in test mode.

4. **Use System.out in tests** (Quick workaround):
   Replace Log calls with System.out.println in test environment.

## Running Tests

### Prerequisites
1. Build the playground app at least once:
   ```bash
   cd apps/playground
   yarn android
   ```

2. This ensures all native dependencies are properly linked.

### Android Unit Tests

From the package root:
```bash
cd packages/expo-audio-studio
yarn test:android:unit
```

Or from the playground app:
```bash
cd apps/playground/android
./gradlew :siteed-expo-audio-studio:test
```

### Viewing Test Results

Test reports are generated at:
- HTML Report: `packages/expo-audio-studio/android/build/reports/tests/testDebugUnitTest/index.html`
- XML Report: `packages/expo-audio-studio/android/build/test-results/testDebugUnitTest/`

### Debugging Test Issues

1. **Module not found**: The Gradle project name might differ from the package name. Check `settings.gradle` in the playground app.

2. **Linter errors**: The Kotlin linter errors in the IDE can be ignored if tests run successfully via Gradle.

3. **Missing dependencies**: Ensure the playground app has been built at least once.

4. **Android framework mocking**: See "Android Log Mocking" section above.

## Test Data Strategy

### Using Real Audio Files
Instead of generating synthetic test data, we use real audio files from the playground app:
- `jfk.wav` - Speech sample, mono, 16kHz
- `chorus.wav` - Music sample, stereo, 44.1kHz
- Various other samples for different test scenarios

This approach ensures our tests work with real-world audio data.

## Integration with Roadmap

This testing strategy aligns with the monorepo roadmap (see main README.md):

1. **Beta channel setup**: Tests will prevent regressions before beta releases
2. **Cross-platform validation**: Unit tests ensure consistent behavior across platforms
3. **Performance optimization**: Tests will include benchmarks for audio processing
4. **E2E validation**: Future tests will validate feature extraction consistency

## Best Practices

### For Module Development
1. Write tests alongside new features
2. Use real audio files for testing
3. Test error cases and edge conditions
4. Keep tests fast and isolated
5. Mock Android framework dependencies properly

### For Monorepo Maintenance
1. Run tests before publishing packages
2. Include tests in CI/CD pipeline
3. Monitor test coverage trends
4. Update tests when APIs change

## Future Enhancements

### Phase 1: Fix Current Setup (Immediate)
- Add proper Android Log mocking
- Ensure all tests pass in CI

### Phase 2: Expand Coverage (Q1 2024)
- Add AudioProcessor tests
- Implement iOS test suite
- Add performance benchmarks

### Phase 3: Advanced Testing (Q2 2024)
- E2E tests for feature extraction
- Cross-platform consistency tests
- Memory leak detection
- Stress tests with large files

### Phase 4: Automation (Q3 2024)
- Automated test generation
- Visual regression tests for UI components
- Integration with beta channel releases

## Related Documentation
- [Main README.md](../../../README.md) - Monorepo overview and roadmap
- [Package README.md](../README.md) - expo-audio-studio specific documentation
- [Playground App](../../../apps/playground/README.md) - Test host application