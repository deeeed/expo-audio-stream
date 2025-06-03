# Native Integration Testing

This directory contains documentation for the native integration testing framework for sherpa-onnx.rn.

## Framework Overview

The native integration testing framework validates React Native module integration with the sherpa-onnx C++ library across Android and iOS platforms.

### Key Features

- ✅ **Cross-platform testing** - Android instrumented tests, iOS XCTest integration
- ✅ **Lightweight model management** - CI-friendly testing without large model downloads
- ✅ **Native library validation** - Confirms JNI/Swift bridge functionality
- ✅ **Tiered testing strategy** - From basic validation to full functionality testing
- ✅ **Feedback loop methodology** - Write test → Run → Fix → Validate cycle

## Test Results

**Latest Android Test Results**: 100% success rate (12/12 tests pass)
- **BasicIntegrationTest**: 7 tests validating module structure and native integration
- **TtsIntegrationTest**: 5 tests validating model management and TTS functionality
- **Execution time**: ~0.05 seconds for complete test suite

## Documentation Structure

- [`native-integration-testing.md`](./native-integration-testing.md) - Core framework methodology
- [`model-strategy.md`](./model-strategy.md) - Model management strategy for testing
- [`validation-results.md`](./validation-results.md) - Complete test results and analysis
- [`platform-differences.md`](./platform-differences.md) - Android vs iOS testing considerations

## Quick Start

### Run Android Tests
```bash
cd packages/sherpa-onnx.rn
yarn test:android
```

### View Test Results
```bash
# Android test reports
open android/build/reports/androidTests/connected/debug/index.html
```

### Test Development Workflow
1. **Write failing test** that demonstrates desired functionality
2. **Run tests** to confirm failure and understand requirements
3. **Implement functionality** to make test pass
4. **Validate** that test passes and no regressions occur

## Architecture

The framework supports testing across React Native architectures:
- **Old Architecture** (Bridge-based) - Traditional Promise-based communication
- **New Architecture** (Fabric + TurboModules) - JSI direct calls
- **Bridgeless Mode** - Experimental direct JSI without bridge

## Model Management

Lightweight model strategy optimized for different testing environments:
- **CI Testing** (< 100MB): Model configuration validation only
- **Development Testing** (< 500MB): Lightweight models for real functionality
- **Full Testing** (< 1.5GB): Complete model suite for production validation

## Next Steps

See [`../architecture/next-validation-phase.md`](../architecture/next-validation-phase.md) for planned React Native architecture-specific testing and real ONNX functionality validation.