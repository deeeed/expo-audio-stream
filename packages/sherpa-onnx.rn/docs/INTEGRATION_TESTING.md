# Integration Testing Guide

## Overview

This guide covers integration testing for sherpa-onnx.rn across all platforms, with focus on validating React Native architecture compatibility and real device functionality.

## Test Categories

### 1. Architecture Compatibility Tests ✅

**Android**: `packages/sherpa-onnx.rn/android/src/androidTest/java/net/siteed/sherpaonnx/ArchitectureCompatibilityTest.kt`

**iOS**: `packages/sherpa-onnx.rn/ios/SherpaOnnxTests/SystemInfoIntegrationTest.swift`

These tests validate:
- Old Architecture (Bridge) vs New Architecture (TurboModules)
- JSI availability and functionality  
- Module registration differences
- Performance characteristics across architectures

### 2. System Information Validation ✅

Tests the comprehensive system info API:
- Device capabilities (CPU, memory, GPU)
- Architecture detection
- Performance metrics
- Platform-specific features (Metal on iOS, Vulkan on Android)

### 3. Real Model Integration Tests ✅

**Android Only**: Tests with lightweight ONNX models
- TTS functionality with vits-icefall-en-low (30.3MB)
- ASR functionality with whisper-tiny (37.3MB)  
- VAD with silero-vad (2.2MB)
- Model lifecycle management
- Memory leak detection

## Running Tests

### Android Integration Tests

```bash
# Full test suite
cd apps/playground/android  
./gradlew :siteed-expo-audio-studio:connectedAndroidTest

# Architecture tests only
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*ArchitectureCompatibilityTest"

# Real model tests (requires device)
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*RealModelIntegrationTest*"
```

### iOS Integration Tests

```bash
# XCTest via CLI
cd apps/sherpa-onnx-demo/ios
./run-integration-tests.sh

# Via Xcode
open sherpaonnxdemo.xcworkspace
# Select test target and run
```

### Web Testing

```bash
# System info validation (browser-based)
cd apps/sherpa-onnx-demo
yarn web
# Navigate to system info tab
```

## Test Results Summary

### Android (Real Device - Pixel 6a) ✅
```
Architecture Compatibility: ✅ PASS
- Old Architecture: Bridge module working
- New Architecture: TurboModule working  
- Performance: <100ms average response time

System Information: ✅ PASS
- Device info: Complete
- GPU: Vulkan support detected
- Memory: 8GB total, detailed breakdown

Real Model Integration: ✅ PASS (26/26 tests)
- TTS: Generated audio successfully
- ASR: Recognition working
- Model Management: No memory leaks
- Performance: Within acceptable bounds
```

### iOS (Simulator - iPhone 16 Pro) ✅
```
Architecture Compatibility: ✅ PASS
- Old Architecture: Bridge module working
- New Architecture: TurboModule working
- Methods: getSystemInfo, getArchitectureInfo functional

System Information: ✅ PASS
- Device info: Complete iOS system info
- GPU: Metal support detected  
- Memory: 131GB simulator memory
- Performance: <10ms response time
```

### Web (Chrome/Safari) ⚠️ Partial
```
System Information: ✅ PASS
- Browser detection working
- WebGL support detected
- Performance API available

Model Integration: ⏳ PENDING
- WASM implementation planned
- Web worker integration needed
```

## Test Infrastructure Features

### Automated Model Downloads ✅
- Concurrent downloads with progress tracking
- Checksum validation for integrity
- Automatic retry with exponential backoff
- Efficient cache management

### Performance Profiling ✅  
- Memory usage tracking (before/after operations)
- Execution time benchmarking
- Device capability analysis
- CSV report generation for analysis

### Comprehensive Reporting ✅
- HTML reports with detailed metrics
- Success/failure tracking with timing data
- Memory leak detection results
- Performance trend analysis

## CI/CD Integration

### Tiered Testing Strategy

1. **Lightweight CI Tests** (<1 minute)
   - Architecture detection
   - Basic system info validation
   - No model downloads

2. **Development Tests** (<5 minutes)  
   - Lightweight model testing
   - Performance benchmarking
   - Memory management validation

3. **Full Integration Tests** (<30 minutes)
   - Complete model suite testing
   - Extended stability testing
   - Cross-platform parity validation

### Required Infrastructure

- **Android**: Connected device or emulator
- **iOS**: Xcode with simulator or device
- **Model Storage**: Cached lightweight models
- **Performance Monitoring**: Memory and CPU tracking tools

## Best Practices

### Test Development
1. Always test on real devices for accurate results
2. Include both success and failure scenarios
3. Validate memory management and cleanup
4. Test platform-specific features (Metal, Vulkan)
5. Document performance benchmarks and expectations

### Debugging Integration Issues
1. Check architecture detection first (`getArchitectureInfo()`)
2. Validate system capabilities (`getSystemInfo()`)
3. Monitor memory usage during model operations
4. Use platform-specific debugging tools (Xcode Instruments, Android Studio Profiler)

### Model Testing Strategy
1. Start with lightweight models for faster iteration
2. Test model lifecycle (init → use → cleanup)
3. Validate error handling with invalid inputs
4. Check concurrent usage scenarios
5. Monitor memory leaks during extended usage

## Known Limitations

### iOS Model Testing
- Real ONNX model testing not yet implemented on iOS
- Currently validates system info and architecture only
- Requires implementation of model download and testing infrastructure

### Web Platform
- WASM integration pending
- Limited to system info validation currently
- Performance testing needs web worker implementation

### CI/CD
- Requires physical device access for comprehensive testing
- Model downloads add time to test execution
- Platform-specific CI runners needed for complete coverage

## Future Enhancements

1. **iOS Model Integration**: Port Android model testing to iOS
2. **Web WASM Support**: Complete web platform implementation  
3. **Enhanced CI/CD**: Automated device testing with model caching
4. **Performance Regression Detection**: Automated performance monitoring
5. **Extended Model Testing**: Support for larger model suites