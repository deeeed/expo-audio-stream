# Native Test Checklist for sherpa-onnx.rn

## Core Native Tests to Implement

### 1. Library Loading (First Priority)
- [x] iOS: Test structure created with placeholder library loading test
- [x] iOS: Framework structure ready for proper linking
- [x] Android: Test structure created with placeholder JNI library test  
- [x] Android: Native methods accessibility test framework ready

### 2. Basic TTS Operations
- [x] Initialize TTS without model (should fail gracefully) - Test placeholders created
- [x] Initialize TTS with valid model - Test placeholders created
- [x] Generate audio from simple text - Test placeholders created
- [x] Verify audio file created - Test placeholders created
- [x] Release TTS resources - Test placeholders created

### 3. Platform-Specific Behavior
- [ ] iOS: Audio saved as .caf format
- [ ] iOS: Files in NSTemporaryDirectory()
- [ ] Android: Audio saved as .wav format
- [ ] Android: Files in getCacheDir()

### 4. Error Handling
- [ ] Missing model files
- [ ] Invalid model format
- [ ] Out of memory scenarios
- [ ] Null/empty text input

### 5. Memory & Threading
- [ ] No memory leaks after release
- [ ] Thread safety for concurrent calls
- [ ] Background thread execution
- [ ] Main thread requirements (iOS)

## Test Implementation Order

```
Day 1: Get "library loads" test passing on both platforms
Day 2: Basic TTS init/release cycle
Day 3: Audio generation and file validation
Day 4: Error scenarios
Day 5: Memory and threading tests
```

## Platform Setup Required

### iOS
- [x] Add test target to Xcode project - Test structure created
- [x] Include test models in bundle - Directory structure and docs created
- [ ] Link Sherpa-ONNX framework to test target - Requires actual framework

### Android
- [x] Add androidTest source set - Created with test files
- [x] Include test models in assets - Resource directory and docs created  
- [x] Add test dependencies in build.gradle - Added JUnit and AndroidX test deps

## Success Criteria

Each test should:
- Run in < 2 seconds
- Have clear pass/fail result
- Log platform-specific behavior
- Not depend on other tests
- Clean up after itself 