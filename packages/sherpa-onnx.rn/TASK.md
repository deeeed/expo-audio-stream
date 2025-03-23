# Sherpa ONNX React Native Module Implementation Tasks

## Project Overview
Create a React Native module (`@siteed/sherpa-onnx.rn`) that provides a clean wrapper around the Sherpa ONNX speech recognition library, compatible with both old and new React Native architectures.

- **Package Name**: `@siteed/sherpa-onnx.rn`
- **Android Namespace**: `net.siteed.sherpaonnx`
- **Repository**: Part of audio-related monorepo

## 1. Project Structure Setup

Create the following structure:
```
@siteed/sherpa-onnx.rn/
├── android/                        # Android native code
│   ├── src/
│   │   └── main/
│   │       ├── java/net/siteed/sherpaonnx/
│   │       │   ├── SherpaOnnxModule.kt
│   │       │   ├── SherpaOnnxPackage.kt
│   │       │   └── SherpaOnnxTurboModuleSpec.java  # For new architecture
│   │       └── jniLibs/           # Native libraries
│   │           ├── arm64-v8a/
│   │           │   ├── libonnxruntime.so
│   │           │   └── libsherpa-onnx-jni.so
│   │           ├── armeabi-v7a/
│   │           ├── x86/
│   │           └── x86_64/
│   └── build.gradle
├── ios/                            # iOS native code
│   ├── SherpaOnnxModule.h
│   ├── SherpaOnnxModule.mm
│   ├── libs/                       # iOS libraries
│   │   ├── libsherpa-onnx.a
│   │   └── libonnxruntime.a
│   └── SherpaOnnx.podspec
├── src/                            # TypeScript code
│   ├── index.ts
│   └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 2. Android Implementation

### 2.1 Obtain Sherpa ONNX Libraries
- Download prebuilt Sherpa ONNX JNI libraries OR
- Build them using the build script from the Sherpa ONNX repository:
  ```bash
  git clone https://github.com/k2-fsa/sherpa-onnx.git
  cd sherpa-onnx
  ./build-android-arm64-v8a.sh
  # Copy resulting libraries to android/src/main/jniLibs/[arch]/ directories
  ```

### 2.2 Create Kotlin Native Module

#### SherpaOnnxModule.kt
Implement the following functionality:
- Handle recognizer and stream creation and lifecycle
- Provide methods for processing audio
- Map between JavaScript objects and Kotlin objects
- Implement React promise-based async methods
- Add error handling

```kotlin
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.*

class SherpaOnnxModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    override fun getName() = "SherpaOnnx"
    
    // Keep track of created recognizers and streams
    private val recognizers = mutableMapOf<Int, OnlineRecognizer>()
    private val streams = mutableMapOf<Int, OnlineStream>()
    private var nextId = 1
    
    // IMPLEMENT METHODS:
    // 1. createRecognizer(config: ReadableMap): Promise<Int>
    // 2. createStream(recognizerId: Int, hotwords: String): Promise<Int>
    // 3. acceptWaveform(streamId: Int, samples: ReadableArray, sampleRate: Int): Promise<Boolean>
    // 4. decode(recognizerId: Int, streamId: Int): Promise<Boolean>
    // 5. isReady(recognizerId: Int, streamId: Int): Promise<Boolean>
    // 6. isEndpoint(recognizerId: Int, streamId: Int): Promise<Boolean>
    // 7. getResult(recognizerId: Int, streamId: Int): Promise<ReadableMap>
    // 8. reset(recognizerId: Int, streamId: Int): Promise<Boolean>
    // 9. releaseStream(streamId: Int): Promise<Boolean>
    // 10. releaseRecognizer(recognizerId: Int): Promise<Boolean>
    
    // Helper methods to convert between JS and Kotlin objects
    // - createFeatureConfigFromMap(map: ReadableMap): FeatureConfig
    // - createModelConfigFromMap(map: ReadableMap): OnlineModelConfig
    // - createEndpointConfigFromMap(map: ReadableMap): EndpointConfig
}
```

#### SherpaOnnxPackage.kt
```kotlin
package net.siteed.sherpaonnx

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SherpaOnnxPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(SherpaOnnxModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

### 2.3 New Architecture Support (Turbo Module)

Create a TurboModule spec:

```java
// SherpaOnnxTurboModuleSpec.java
package net.siteed.sherpaonnx;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;

public interface SherpaOnnxTurboModuleSpec extends TurboModule {
    // DECLARE ALL MODULE METHODS MATCHING SherpaOnnxModule
    // ...
}
```

### 2.4 Configure build.gradle

Make sure the build configuration:
- Includes JNI libraries
- Supports both architectures
- Sets minimum Android SDK level to 21

## 3. iOS Implementation

### 3.1 Obtain Sherpa ONNX Libraries for iOS
- Download prebuilt iOS libraries OR
- Build them from source using:
  ```bash
  ./build-ios.sh
  # Copy resulting libraries to ios/libs/ directory
  ```

### 3.2 Create Objective-C++ Module

#### SherpaOnnxModule.h
```objc
#import <React/RCTBridgeModule.h>

@interface SherpaOnnxModule : NSObject <RCTBridgeModule>
@end
```

#### SherpaOnnxModule.mm
Implement the same functionality as the Android module but using Objective-C++ and iOS-specific APIs.
- Use the Sherpa ONNX C API
- Maintain parallel recognizer and stream management
- Implement the same set of methods as in Android

### 3.3 Create Podspec File

```ruby
Pod::Spec.new do |s|
  s.name         = "SherpaOnnx"
  s.version      = "1.0.0"
  s.summary      = "React Native wrapper for Sherpa ONNX speech recognition"
  s.homepage     = "https://github.com/yourusername/yourrepo"
  s.license      = "MIT"
  s.author       = { "Your Name" => "your.email@example.com" }
  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/yourusername/yourrepo.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm}"
  s.vendored_libraries = "ios/libs/*.a"
  s.preserve_paths = "ios/include/**"
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/SherpaOnnx/ios/include",
    "OTHER_LDFLAGS" => "-lc++"
  }
  s.dependency "React-Core"
  
  # For new architecture:
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "SherpaOnnx-Swift.h",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
  }
end
```

## 4. TypeScript Implementation

### 4.1 Create Type Definitions

#### src/types.ts
```typescript
export interface FeatureConfig {
  sampleRate: number;
  featureDim: number;
}

export interface TransducerModelConfig {
  encoder: string;
  decoder: string;
  joiner: string;
}

export interface ParaformerModelConfig {
  encoder: string;
  decoder: string;
}

export interface ModelConfig {
  transducer?: TransducerModelConfig;
  paraformer?: ParaformerModelConfig;
  zipformer2Ctc?: { model: string };
  neMoCtc?: { model: string };
  tokens: string;
  modelType: string;
  numThreads?: number;
  provider?: string;
}

export interface EndpointRule {
  mustContainNonSilence: boolean;
  minTrailingSilence: number;
  minUtteranceLength: number;
}

export interface EndpointConfig {
  rule1?: EndpointRule;
  rule2?: EndpointRule;
  rule3?: EndpointRule;
}

export interface RecognizerConfig {
  sampleRate: number;
  featureDim: number;
  modelConfig: ModelConfig;
  endpointConfig?: EndpointConfig;
  enableEndpoint: boolean;
  decodingMethod?: string;
  maxActivePaths?: number;
}

export interface RecognitionResult {
  text: string;
  tokens: string[];
  timestamps: number[];
}

// Additional types as needed
```

### 4.2 Create Main Module API

#### src/index.ts
Implement a clean, high-level API for JavaScript/TypeScript:

```typescript
import { NativeModules } from 'react-native';
import type { RecognizerConfig, RecognitionResult } from './types';

const { SherpaOnnx } = NativeModules;

class SherpaOnnxRecognizer {
  // Implementation of a clean class-based API that wraps the native module
  // Include methods for:
  // - Creating a recognizer
  // - Processing audio
  // - Getting results
  // - Handling cleanup

  // HINT: Create static factory method and use private constructor
  // static async create(config: RecognizerConfig): Promise<SherpaOnnxRecognizer>
}

export default SherpaOnnxRecognizer;
export * from './types';
```
