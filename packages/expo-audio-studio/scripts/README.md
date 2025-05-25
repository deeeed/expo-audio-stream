# Test Scripts

This directory contains unified test scripts for expo-audio-studio.

## run_tests.sh

A unified test runner that can execute tests for both Android and iOS platforms.

### Usage

```bash
./scripts/run_tests.sh [platform] [type]
```

### Parameters

- **platform**: Which platform to test
  - `all` (default) - Run tests for both platforms
  - `android` - Run Android tests only
  - `ios` - Run iOS tests only

- **type**: Which type of tests to run
  - `all` (default) - Run all test types
  - `unit` - Run unit tests (Android only)
  - `instrumented` - Run instrumented tests (Android only)
  - `standalone` - Run standalone Swift tests (iOS only)

### Examples

```bash
# Run all tests for both platforms
./scripts/run_tests.sh

# Run Android tests only
./scripts/run_tests.sh android

# Run Android unit tests only
./scripts/run_tests.sh android unit

# Run iOS tests only
./scripts/run_tests.sh ios

# Run all tests explicitly
./scripts/run_tests.sh all all
```

### Requirements

- **Android**: Requires Android SDK and a connected device/emulator for instrumented tests
- **iOS**: Requires Swift compiler (comes with Xcode)

### Output

The script provides colored output:
- 🧪 Test execution progress
- ✅ Success messages in green
- ❌ Failure messages in red
- Summary of tests passed/failed 