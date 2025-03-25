# iOS Implementation Plan for sherpa-onnx React Native Wrapper

## Overview

This document outlines the implementation plan for the iOS version of the sherpa-onnx wrapper to ensure method signature compatibility with the existing Android implementation.

## Core Implementation Steps

### 1. Study Source Reference Classes

First, examine these key files from the original sherpa-onnx repository:

- iOS Swift examples in `third_party/sherpa-onnx/ios-swift/SherpaOnnx/`
- C++ API headers in `third_party/sherpa-onnx/csrc/`
- JNI implementations in `third_party/sherpa-onnx/android-jni/`

### 2. Create C++ Bridges for Key Classes

For each major feature set, create a bridge header/implementation:

```
SherpaOnnxTts.h/mm
SherpaOnnxAudioTagging.h/mm
SherpaOnnxASR.h/mm
SherpaOnnxArchive.h/mm
```

These should mirror the functionality in the Android JNI classes:
- `com.k2fsa.sherpa.onnx.OfflineTts`
- `com.k2fsa.sherpa.onnx.AudioTagging`
- `com.k2fsa.sherpa.onnx.OfflineStream`
- `com.k2fsa.sherpa.onnx.OfflineRecognizer`

### 3. Implement Handler Classes

Create equivalent handler classes to match Android structure:

```
TtsHandler.h/mm
AudioTaggingHandler.h/mm
ArchiveHandler.h/mm
ASRHandler.h/mm
```

Each handler should implement the same methods as its Android counterpart.

### 4. Complete SherpaOnnxModule.mm Implementation

Expand the existing module with all required method exports:

#### TTS Methods
- `initTts`
- `generateTts`
- `stopTts`
- `releaseTts`

#### Audio Tagging Methods
- `initAudioTagging`
- `processAudioSamples`
- `computeAudioTagging`
- `processAndComputeAudioTagging`
- `processAudioFile`
- `releaseAudioTagging`

#### ASR Methods
- `initAsr`
- `recognizeFromSamples`
- `recognizeFromFile`
- `releaseAsr`

#### Archive Methods
- `extractTarBz2`

### 5. Implement Audio Processing Utilities

Create utilities for:
- Converting between audio formats
- Managing audio buffers
- PCM data processing
- Mono conversion

Reference Android implementation in `SherpaOnnxModule.kt`:
- `extractAudioFromFile`
- `convertToMono`
- `byteArrayToFloatArray`

### 6. Setup Library Integration

Ensure proper linking with sherpa-onnx static library:

1. Verify paths in Xcode project settings
2. Set correct include paths for headers
3. Update podspec to include the native library

### 7. Implement Configuration Classes

Create Objective-C++ equivalents for Android config classes:
- `OfflineTtsConfig`
- `OfflineTtsModelConfig`
- `AudioTaggingConfig`
- `AudioTaggingModelConfig`
- `OfflineRecognizerConfig`

### 8. Map React Native Types

For each method, implement proper conversion between:
- JS objects and native types
- ReadableMap to native config objects
- Native results to WritableMap/WritableArray

## Type Mapping Reference

| React Native Type | iOS Native Type | Notes |
|-------------------|-----------------|-------|
| ReadableMap       | NSDictionary*   | For configuration objects |
| ReadableArray     | NSArray*        | For audio samples |
| Promise           | Resolver/Rejecter blocks | For async results |
| Boolean           | BOOL            | |
| Number            | NSNumber*       | Cast to proper numeric type |
| String            | NSString*       | |

## File Structure

```
ios/
├── SherpaOnnxModule.h/mm       // Main module interface
├── Handlers/                   // Feature-specific handlers
│   ├── TtsHandler.h/mm
│   ├── AudioTaggingHandler.h/mm
│   ├── ASRHandler.h/mm
│   └── ArchiveHandler.h/mm
├── Bridge/                     // C++ bridge to native library
│   ├── SherpaOnnxTts.h/mm
│   ├── SherpaOnnxAudioTagging.h/mm
│   ├── SherpaOnnxASR.h/mm
│   └── SherpaOnnxArchive.h/mm
└── Utils/                      // Utility functions
    ├── AudioUtils.h/mm
    └── ConfigUtils.h/mm
```

## Implementation Order

1. First implement the core C++ bridges
2. Then implement the handlers
3. Implement module exports
4. Finally, implement utilities

## Error Handling Strategy

Ensure error codes match Android implementation:
- `ERR_NOT_INITIALIZED`
- `ERR_PROCESS_AND_COMPUTE`
- `ERR_FILE_NOT_FOUND`
- etc.

## Key References in Original Repo

- Swift feature implementations: `third_party/sherpa-onnx/ios-swift/SherpaOnnx/SherpaOnnx/`
- C++ core APIs: `third_party/sherpa-onnx/csrc/`
- Android JNI implementations: `third_party/sherpa-onnx/android-jni/`
- Model configuration examples: `third_party/sherpa-onnx/ios-swift/SherpaOnnx/SherpaOnnx/Model.swift`
