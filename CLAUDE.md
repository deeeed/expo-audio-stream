# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo for audio processing libraries and applications built with React Native and Expo. It contains multiple packages:

- `@siteed/expo-audio-studio` - Comprehensive audio processing library (formerly `@siteed/expo-audio-stream`)
- `@siteed/expo-audio-ui` - UI components for audio visualization
- `@siteed/react-native-essentia` - React Native bindings for Essentia audio analysis
- `@siteed/sherpa-onnx.rn` - React Native wrapper for sherpa-onnx TTS/STT (in development)

## Essential Commands

### Development Setup
```bash
# Install dependencies
yarn install

# Setup Git LFS for ONNX models (required)
./scripts/setup-lfs.sh
```

### Building Packages

#### expo-audio-studio
```bash
cd packages/expo-audio-studio
yarn build          # Build all formats (CJS, ESM, types, plugin)
yarn build:plugin   # Build Expo plugin only
yarn build:dev      # Build for development
yarn typecheck      # Type checking
yarn lint           # Lint code
yarn test           # Run all tests
```

#### expo-audio-ui
```bash
cd packages/expo-audio-ui
yarn build          # Build with Rollup
yarn build:clean    # Clean and build
yarn typecheck      # Type checking
yarn lint           # Lint code
yarn storybook      # Run Storybook development server
```

#### react-native-essentia
```bash
cd packages/react-native-essentia
yarn prepare        # Build the package
yarn build:ios      # Build Essentia for iOS
yarn build:android  # Build Essentia for Android
yarn build:all      # Build for all platforms
yarn test           # Run tests
```

### Running Example Apps

#### Audio Playground (main demo app)
```bash
cd apps/playground
yarn build:deps     # Build all dependencies
yarn start          # Start Metro bundler (port 7365)
yarn ios            # Run on iOS device
yarn android        # Run on Android
yarn web            # Run on web
```

#### Minimal Example
```bash
cd apps/minimal
yarn start          # Start Metro bundler
yarn ios            # Run on iOS
yarn android        # Run on Android
yarn web            # Run on web
```

### Testing

#### expo-audio-studio Testing
```bash
cd packages/expo-audio-studio

# Android tests
yarn test:android                    # Run all Android tests
yarn test:android:unit               # Unit tests only
yarn test:android:instrumented       # Instrumented tests
yarn test:android:unit:watch         # Watch mode for unit tests
yarn test:coverage                   # Generate coverage report

# iOS tests
yarn test:ios                        # Run iOS tests
```

#### Playground E2E Testing
```bash
cd apps/playground

# Android E2E
yarn detox:build:android
yarn e2e:android:record              # Test recording functionality
yarn e2e:android:screenshots         # Generate screenshots
yarn e2e:android:import              # Test import functionality

# iOS E2E
yarn detox:build:ios
yarn e2e:ios:record
yarn e2e:ios:screenshots
yarn e2e:ios:import
```

### Release & Publishing

#### Publishing Packages
```bash
# expo-audio-studio
cd packages/expo-audio-studio
yarn release

# expo-audio-ui
cd packages/expo-audio-ui
yarn release

# react-native-essentia
cd packages/react-native-essentia
npm publish
```

#### Playground App Deployment
```bash
cd apps/playground
yarn publish                         # Deploy to web
yarn build:android:production        # Build production Android
yarn build:ios:production            # Build production iOS
yarn ota-update:production           # Over-the-air update for production
```

## Architecture Overview

### Monorepo Structure
- Uses Yarn workspaces for dependency management
- Apps in `/apps` directory consume packages from `/packages`
- Shared TypeScript configuration at root level
- Lefthook for Git hooks (configured but not enforced)

### Package Architecture

#### expo-audio-studio
- Native modules for iOS (Swift) and Android (Kotlin)
- Supports dual-stream recording (raw PCM + compressed)
- Audio device management and selection
- Background recording capabilities
- Integration tests for both platforms

#### expo-audio-ui
- Built with React Native Skia for visualizations
- Rollup build system
- Storybook for component development
- Peer dependency on expo-audio-studio

#### react-native-essentia
- C++ native implementation using Essentia library
- Requires building static libraries for iOS/Android
- Advanced audio analysis algorithms
- Uses react-native-builder-bob for building

#### sherpa-onnx.rn
- Wraps sherpa-onnx for speech recognition and synthesis
- Web support through WASM
- Model management system
- Currently in development

### Key Technical Details
- All packages use TypeScript
- iOS requires minimum deployment target 13.4
- Android minimum SDK 24
- Web support varies by package
- ONNX models stored with Git LFS
- Integration tests require device/simulator

## Important Notes

- Always run `yarn build:deps` in playground before development
- The playground app uses port 7365 by default
- Git LFS setup is required for ONNX models
- Native changes require pod install (iOS) or gradle sync (Android)
- Use absolute paths in native test scripts
- Background recording requires special permissions configuration

## Current Branch Context

You are working on the `fix/compressed-only-output-issue-244` branch which addresses issue #244 - when primary output is disabled and compressed output is enabled, the compression info was not being returned.

### Testing the Fix for Issue #244

To validate the compressed-only output fix on real devices/simulators:

#### Android Testing
```bash
# From the repository root
cd apps/playground/android

# Run the specific test for compressed-only output
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.CompressedOnlyOutputTest"

# Or run all integration tests including the new one
./gradlew :siteed-expo-audio-studio:connectedAndroidTest
```

#### iOS Testing
```bash
# From the repository root
cd packages/expo-audio-studio/ios/tests/integration

# Make the test executable and run it
chmod +x compressed_only_output_test.swift
./compressed_only_output_test.swift

# Or run all integration tests
./run_integration_tests.sh
```

#### What the Tests Validate
- When primary output is disabled and compressed is enabled, compression info is returned
- The compressed file URI is accessible in the result
- Different compression formats work correctly (AAC, Opus)
- File size and metadata are properly reported

## Integration Testing Best Practices

### Running Integration Tests on Real Devices/Simulators

Integration tests are essential for validating that native functionality works correctly. Here's what we've learned:

#### Android Integration Testing

1. **Running Tests**: Android integration tests use instrumented tests that run on a real device or emulator:
   ```bash
   cd apps/playground/android
   ./gradlew :siteed-expo-audio-studio:connectedAndroidTest
   ```

2. **Test Results**: Located in `packages/expo-audio-studio/android/build/outputs/androidTest-results/`

3. **Specific Test Execution**: Run individual test classes:
   ```bash
   ./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.CompressedOnlyOutputTest"
   ```

4. **Requirements**:
   - Connected Android device or running emulator
   - USB debugging enabled on device
   - Gradle will automatically install the test APK

#### iOS Integration Testing

1. **Current Setup**: iOS integration tests are script-based and located in `packages/expo-audio-studio/ios/tests/integration/`

2. **Running Tests**:
   ```bash
   cd packages/expo-audio-studio/ios/tests/integration
   ./run_integration_tests.sh
   ```

3. **Test Types**:
   - **Simulation Tests**: Some tests simulate behavior (e.g., `compressed_only_output_test.swift`)
   - **Real Tests**: Unit tests in `ExpoAudioStudioTests/` test actual implementation
   
4. **Important Note**: The iOS integration test scripts currently simulate behavior rather than testing the actual AudioStreamManager. For real testing, use the unit tests in Xcode.

### iOS Testing Limitations

**What can be done from CLI:**
- Build the iOS project (requires Xcode installed)
- Run script-based tests that don't require iOS runtime
- Verify source code implementation
- Check for compilation errors

**What CANNOT be done from CLI:**
- Run tests that require iOS simulator
- Execute code that uses iOS-specific APIs (AVAudioSession, etc.)
- Run instrumented tests on actual devices
- Access iOS runtime environment

**For actual iOS integration testing:**
1. Open the project in Xcode
2. Select a simulator or connected device
3. Run the test target or app
4. Manually test the feature or run XCTest unit tests

This limitation applies to any CLI tool (including Claude) that doesn't have access to macOS GUI and Xcode's simulator runtime.

#### Key Learnings

1. **Always Test on Real Implementation**: Simulated tests can mask real bugs. Android's instrumented tests run actual code, while iOS integration scripts may simulate behavior.

2. **Platform Differences**:
   - Android: Gradle-based instrumented tests run on device
   - iOS: Mix of script-based tests and Xcode unit tests
   
3. **Debugging Failed Tests**:
   - Check test output logs for detailed error messages
   - Android: View XML test results in build directory
   - iOS: Console output from test scripts

4. **Test Coverage**:
   - Test both success and failure scenarios
   - Verify edge cases (e.g., primary disabled, compressed enabled)
   - Check platform-specific behavior (e.g., Opus fallback on iOS)

5. **Fix Validation Process**:
   - Write/update tests that demonstrate the bug
   - Implement the fix
   - Run tests to confirm fix works
   - Ensure no regression in existing functionality

### Example: Validating Issue #244 Fix

1. **Android** (✅ Can be validated via CLI):
   ```bash
   cd apps/playground/android
   ./gradlew :siteed-expo-audio-studio:connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=net.siteed.audiostream.integration.CompressedOnlyOutputTest
   ```
   All 4 tests passed, confirming the fix works on Android.

2. **iOS** (⚠️ Requires Xcode/Physical Environment):
   - **Claude/CLI Limitation**: Cannot run iOS simulator or device tests from command line
   - **Code Verification**: Can verify fix is implemented by examining source code
   - **Real Testing**: Requires opening Xcode and running on actual simulator/device
   - The integration scripts in `ios/tests/integration/` simulate behavior rather than testing real implementation

### Writing Integration Tests

When adding new features or fixing bugs:

1. **Create Test First**: Write a test that demonstrates the current bug
2. **Run Test**: Confirm it fails with the bug
3. **Implement Fix**: Make the necessary code changes
4. **Run Test Again**: Confirm it passes with the fix
5. **Run Full Suite**: Ensure no regressions

This approach ensures fixes work correctly on real devices and prevents future regressions.
