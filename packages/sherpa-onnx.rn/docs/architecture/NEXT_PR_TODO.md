# Next PR: React Native Architecture & Real ONNX Validation

## Overview

This document outlines the tasks for the next development phase to complete comprehensive sherpa-onnx.rn validation.

## Phase 2 Goals

1. **React Native Architecture Compatibility** - Validate across Old/New Architecture
2. **Real ONNX Functionality** - Test actual model loading and inference
3. **Performance & Memory Validation** - Production-ready stability testing
4. **iOS Integration Completion** - Full iOS testing parity with Android

## Detailed TODO Items

### 🏗️ React Native Architecture Testing

#### Architecture Detection & Testing
- [ ] **Add architecture detection logic**
  - Detect Old Architecture (Bridge-based) vs New Architecture (JSI)
  - Test JSI availability and functionality
  - Validate module registration differences

- [ ] **Create architecture-specific test suites**
  ```kotlin
  @Test
  fun testOldArchitectureBridge() {
      // Test Promise-based async calls
      // Validate React Native bridge communication
      // Test error propagation through bridge
  }

  @Test 
  fun testNewArchitectureJSI() {
      // Test direct JSI synchronous calls
      // Validate TurboModule registration
      // Test JSI memory management
  }
  ```

- [ ] **Test JSI bridge behavior**
  - Memory management across architectures
  - Threading behavior (JSI thread vs UI thread vs native thread)
  - Error handling and exception propagation
  - Performance comparison between architectures

#### Compatibility Validation
- [ ] **Ensure consistent behavior** across architectures
- [ ] **Document any differences** in behavior or performance
- [ ] **Create compatibility layer** if needed for API consistency

### 🧠 Real ONNX Model Integration

#### Lightweight Model Testing
- [ ] **Implement model download for tests**
  - Download vits-icefall-en-low (30.3MB) for TTS testing
  - Download silero-vad (2.2MB) for VAD testing
  - Download ced-tiny (27.2MB) for audio tagging testing

- [ ] **Real TTS functionality tests**
  ```kotlin
  @Test
  fun testRealTtsWithLightweightModel() {
      // Download/use vits-icefall-en-low model
      // Initialize TTS with real model files
      // Generate actual audio from text input
      // Validate output audio file properties
      // Test cleanup and resource management
  }
  ```

- [ ] **Real ASR functionality tests**
  - Initialize ASR with lightweight model
  - Test speech recognition on sample audio
  - Validate transcription accuracy
  - Test streaming vs non-streaming modes

#### Model Management Enhancements
- [ ] **Implement model download system**
  - Reliable download with progress tracking
  - Automatic retry with exponential backoff
  - Model integrity validation (checksums)
  - Efficient cache management

- [ ] **Model lifecycle testing**
  - Multiple init/release cycles without memory leaks
  - Concurrent model usage (if supported)
  - Error handling for corrupted models
  - Platform-specific optimization validation

### 🚀 Performance & Stability Testing

#### Memory Management
- [ ] **Memory leak detection**
  - Long-running tests with multiple model loads
  - Monitor native memory usage patterns
  - Test garbage collection behavior
  - Validate proper resource cleanup

- [ ] **Performance benchmarking**
  - Model loading time measurement
  - Inference speed testing
  - Memory footprint analysis
  - Battery usage impact assessment

#### Concurrent Usage Testing
- [ ] **Thread safety validation**
  - Multiple simultaneous TTS requests
  - Concurrent ASR processing
  - Mixed model type usage
  - Resource contention handling

- [ ] **Production scenario testing**
  - Background/foreground app transitions
  - Device interruption handling (calls, notifications)
  - Low memory condition behavior
  - Extended usage stability

### 🍎 iOS Integration Completion

#### iOS Testing Infrastructure
- [ ] **Set up iOS integration tests**
  - XCTest framework integration
  - Real device testing capability
  - Automated test execution

- [ ] **iOS-specific functionality tests**
  - Native library loading validation
  - Swift/Objective-C bridge testing
  - iOS-specific audio handling
  - Platform optimization validation

#### Cross-Platform Parity
- [ ] **Ensure consistent API behavior**
  - Identical test results across Android/iOS
  - Platform-specific error handling
  - Performance characteristic documentation
  - Model compatibility validation

### 📊 Enhanced Testing Infrastructure

#### CI/CD Integration Improvements
- [ ] **Tiered testing implementation**
  - Lightweight CI tests (< 1 minute, no downloads)
  - Development tests (< 5 minutes, lightweight models)
  - Full integration tests (< 30 minutes, complete model suite)

- [ ] **Automated reporting**
  - Performance trend tracking
  - Memory usage reporting
  - Cross-platform comparison metrics
  - Regression detection alerts

#### Test Data Management
- [ ] **Test model repository**
  - Dedicated lightweight models for testing
  - Version management for test models
  - Automated model validation pipeline
  - Test data cleanup automation

### 🔧 Developer Experience Improvements

#### Documentation Enhancements
- [ ] **Architecture-specific usage guides**
  - Old Architecture best practices
  - New Architecture optimization tips
  - Migration guide between architectures
  - Performance tuning recommendations

- [ ] **Troubleshooting guides**
  - Common integration issues
  - Platform-specific debugging
  - Memory optimization techniques
  - Performance profiling methods

#### Development Tools
- [ ] **Model management utilities**
  - Model download CLI tool
  - Model validation utilities
  - Performance profiling scripts
  - Automated test data generation

## Success Criteria

### ✅ **Architecture Compatibility**
- Works correctly on Old Architecture (Bridge)
- Works correctly on New Architecture (JSI)  
- Graceful handling of architecture differences
- No memory leaks or threading issues across architectures

### ✅ **Real ONNX Functionality**
- Successful TTS synthesis with lightweight models
- Successful ASR recognition with sample audio
- Proper memory management and resource cleanup
- Error handling for invalid inputs/models
- Performance within acceptable bounds

### ✅ **Production Readiness**
- Stable under concurrent usage
- Proper resource cleanup in all scenarios
- Clear error messages and debugging information
- Platform-specific optimizations validated
- Memory and performance characteristics documented

### ✅ **Cross-Platform Parity**
- Identical API behavior across Android and iOS
- Consistent test results on both platforms
- Platform differences documented and handled
- Performance characteristics comparable

## Implementation Timeline

### Week 1: Architecture Testing
- Implement architecture detection
- Create architecture-specific test suites
- Validate JSI vs Bridge behavior

### Week 2: Real Model Integration
- Implement lightweight model downloads
- Add real TTS/ASR functionality tests
- Validate model lifecycle management

### Week 3: Performance & iOS
- Add performance benchmarking
- Complete iOS testing infrastructure
- Validate cross-platform parity

### Week 4: Polish & Documentation
- Enhanced CI/CD integration
- Comprehensive documentation updates
- Final validation and regression testing

## Dependencies

- **Model Availability**: Lightweight models must be accessible for download
- **CI Infrastructure**: Enhanced CI/CD pipeline for tiered testing
- **iOS Development Setup**: Xcode environment for iOS testing
- **Performance Monitoring**: Tools for memory and performance measurement

## Risk Mitigation

- **Model Download Failures**: Implement robust retry mechanisms and fallbacks
- **Platform Differences**: Comprehensive testing on multiple devices and OS versions
- **Performance Regressions**: Automated performance monitoring and alerting
- **Memory Issues**: Extensive memory leak detection and validation

This next phase will complete the sherpa-onnx.rn validation framework and ensure production-ready quality across all supported platforms and React Native architectures.