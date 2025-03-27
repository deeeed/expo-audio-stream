# Sherpa-ONNX Android API: React Native Adaptation Guide

## 1. Overview and Challenges

The Sherpa-ONNX library provides powerful speech recognition and audio processing capabilities through a JNI interface for Android. Integrating this library into React Native presents several architectural challenges that this guide addresses.

### 1.1 Native Library Integration Complexity

React Native's integration with native Android code follows this path:
- JavaScript → React Native Bridge → Java/Kotlin → JNI → C/C++ Library

The original Sherpa-ONNX provides:
- C/C++ Library (sherpa-onnx/c-api) → JNI Wrapper → Kotlin Classes

This creates an integration challenge we must resolve:
- JavaScript → React Native Bridge → **Custom Kotlin Adaptation** → JNI → C/C++ Library

### 1.2 Specific Technical Challenges

1. **Native Library Loading**
   - The Sherpa-ONNX library consists of `libsherpa-onnx-jni.so` and `libonnxruntime.so` which must be properly included and loaded
   - These libraries must be available for multiple architectures (arm64-v8a, armeabi-v7a, x86_64)

2. **React Native Module Requirements**
   - All Kotlin classes must be properly exposed to the React Native bridge
   - Promise-based API for asynchronous operations
   - Event emission for streaming functionality
   - Type conversion between JavaScript and Kotlin data structures

3. **Architecture Support**
   - Android apps need to support multiple architectures (arm64-v8a, armeabi-v7a, x86_64)
   - Binary selection happens through the standard Android ABI filtering

### 1.3 Core Requirements

1. **Maintain Functionality**: Preserve all capabilities of the native Sherpa-ONNX library
2. **Modular Architecture**: Split functionality into focused handler classes
3. **Efficient Memory Management**: Properly handle native resources
4. **Comprehensive Error Handling**: Robust error reporting to JavaScript

## 2. Project Structure and Build Process

### 2.1 Key Directory Structure

```
packages/sherpa-onnx.rn/
├── android/
│   ├── CMakeLists.txt              # Native library linking configuration
│   ├── build.gradle                # Android-specific build configuration
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── jniLibs/            # Prebuilt native libraries
│           │   ├── arm64-v8a/      # ARM64 libraries
│           │   ├── armeabi-v7a/    # ARM32 libraries
│           │   └── x86_64/         # x86_64 libraries
│           └── kotlin/
│               ├── com/k2fsa/sherpa/onnx/  # Original Sherpa-ONNX Kotlin API
│               └── net/siteed/sherpaonnx/   # React Native module adaptation
│                   ├── SherpaOnnxModule.kt  # Main React Native module
│                   ├── SherpaOnnxPackage.kt # React Native package registration
│                   ├── ASRHandler.kt        # ASR functionality handler
│                   ├── TtsHandler.kt        # TTS functionality handler
│                   ├── AudioTaggingHandler.kt # Audio tagging handler
│                   ├── SpeakerIdHandler.kt  # Speaker identification handler
│                   └── utilities/           # Utility classes
├── cpp/                           # C++ dummy implementation
├── prebuilt/                      # Prebuilt library storage
│   ├── include/                   # C headers
│   └── android/                   # Prebuilt libraries by architecture
└── build-sherpa-android.sh        # Build script for native libraries
```

### 2.2 Native Library Management

The `jniLibs` directory contains:

- **arm64-v8a/** - 64-bit ARM libraries for most modern Android devices
- **armeabi-v7a/** - 32-bit ARM libraries for older Android devices
- **x86_64/** - x86_64 libraries primarily for emulators

The `build-sherpa-android.sh` script:
1. Clones the Sherpa-ONNX repository if needed
2. Builds the JNI libraries for all required architectures
3. Copies the compiled libraries to the appropriate directories
4. Copies the header files to the prebuilt/include directory

## 3. Module Architecture

### 3.1 Main Module Structure

The Android implementation uses a modular architecture with these key components:

1. **SherpaOnnxModule** - Main React Native module class that implements:
   - React Native method registration and exposure
   - Library initialization and validation
   - Delegation to specialized handler classes

2. **Handler Classes** - Specialized classes for different functionalities:
   - **ASRHandler** - Automatic Speech Recognition
   - **TtsHandler** - Text-to-Speech
   - **AudioTaggingHandler** - Audio event detection
   - **SpeakerIdHandler** - Speaker identification and verification
   - **ArchiveHandler** - Archive extraction utilities

3. **Utility Classes** - Support classes for common operations:
   - **AudioExtractor** - Extract audio data from various formats
   - **AssetUtils** - Handle file paths and assets
   - **ArchiveUtils** - Archive manipulation

### 3.2 Core Implementation Principles

1. **Executor Usage**
   - Each handler uses a dedicated thread executor for compute-intensive tasks
   - Prevents blocking the React Native UI thread
   - Example pattern:
     ```kotlin
     private val executor = Executors.newSingleThreadExecutor()
     
     fun processAudio(audioBuffer: ReadableArray, promise: Promise) {
         executor.execute {
             try {
                 // Process audio on background thread
                 
                 // Return to UI thread to resolve promise
                 reactContext.runOnUiQueueThread {
                     promise.resolve(result)
                 }
             } catch (e: Exception) {
                 reactContext.runOnUiQueueThread {
                     promise.reject("ERROR_CODE", e.message)
                 }
             }
         }
     }
     ```

2. **Resource Management**
   - Native resources are explicitly released when no longer needed
   - Error handling ensures resources are released even during exceptions

## 4. Implementation Guide

Follow these guidelines when implementing or modifying the Android module:

### 4.1 React Native Module Requirements

1. **Method Annotations**
   - Mark all methods exposed to JavaScript with `@ReactMethod`
   - Example:
     ```kotlin
     @ReactMethod
     fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
         // Implementation
     }
     ```

2. **Promise-Based API**
   - Use `Promise` for asynchronous operations
   - Always handle exceptions and call either `promise.resolve()` or `promise.reject()`
   - Return results in structured maps:
     ```kotlin
     val resultMap = Arguments.createMap()
     resultMap.putBoolean("success", true)
     resultMap.putString("text", recognitionResult)
     promise.resolve(resultMap)
     ```

3. **Parameter Type Conversion**
   - Convert JavaScript types to Kotlin types:
     - `ReadableArray` → `FloatArray`, `List<*>`, etc.
     - `ReadableMap` → Kotlin data classes
     - `String`, `Boolean`, `Int` can be used directly

### 4.2 Native Library Integration

1. **CMake Configuration**
   - The `CMakeLists.txt` file links the prebuilt libraries
   - Example:
     ```cmake
     add_library(sherpa-onnx-jni SHARED IMPORTED)
     set_target_properties(sherpa-onnx-jni PROPERTIES IMPORTED_LOCATION
             ${PREBUILT_DIR}/${ANDROID_ABI}/libsherpa-onnx-jni.so)
     ```

2. **Library Initialization Check**
   - Always verify that the native library loaded successfully:
     ```kotlin
     companion object {
         var isLibraryLoaded = false
         
         init {
             try {
                 isLibraryLoaded = Class.forName("com.k2fsa.sherpa.onnx.OfflineTts") != null
                 Log.i(TAG, "Sherpa ONNX JNI library loaded successfully")
             } catch (e: Exception) {
                 Log.e(TAG, "Failed to load Sherpa ONNX JNI library: ${e.message}")
                 isLibraryLoaded = false
             }
         }
     }
     ```

### 4.3 Handler Implementation Pattern

When implementing a handler class:

1. Use a consistent structure:
   ```kotlin
   class FeatureHandler(private val reactContext: ReactApplicationContext) {
       private val executor = Executors.newSingleThreadExecutor()
       private var nativeObject: NativeObject? = null
       
       // Initialization
       fun init(config: ReadableMap, promise: Promise) {
           // Implementation
       }
       
       // Feature methods
       fun processData(data: ReadableArray, promise: Promise) {
           // Implementation
       }
       
       // Resource cleanup
       fun release(promise: Promise) {
           // Implementation
       }
   }
   ```

2. Always check if the library is loaded before operations:
   ```kotlin
   if (!SherpaOnnxModule.isLibraryLoaded) {
       promise.reject("ERR_LIBRARY_NOT_LOADED", "Native library not loaded")
       return
   }
   ```

3. Use structured logging:
   ```kotlin
   Log.i(TAG, "===== OPERATION START =====")
   // Operation implementation
   Log.i(TAG, "===== OPERATION COMPLETE =====")
   ```

## 5. Key Implementation Details

### 5.1 ASR Implementation

The Automatic Speech Recognition implementation supports both:
- **Offline recognition**: Complete audio processing in one call
- **Streaming recognition**: Continuous recognition with intermediate results

Key points:
- Multiple model types (transducer, paraformer, whisper, etc.)
- Dynamic model loading from files
- Sample rate and feature configuration
- Endpoint detection for streaming

### 5.2 TTS Implementation

Text-to-Speech implementation features:
- Multiple voices through speaker IDs
- Speaking rate control
- Direct audio playback option
- File output with customizable paths

### 5.3 Audio Data Processing

Audio data can be processed from:
- Float sample arrays directly from JavaScript
- Audio files in various formats (MP3, WAV, AAC, etc.)

The `AudioExtractor` handles:
- Media format detection
- Multi-channel to mono conversion
- Sample rate conversion
- Proper byte-to-float conversion

## 6. Critical Verification Steps

After any changes, methodically verify:

1. **Build Verification**
   - Build the module for all target architectures
   - Check for compiler warnings or errors

2. **Functionality Testing**
   - Test each exposed method with valid inputs
   - Test error handling with invalid inputs
   - Verify resource cleanup works properly
   - Test with both streaming and non-streaming modes

3. **Memory Management**
   - Verify no memory leaks using Android Profiler
   - Check for proper native resource cleanup
   - Test with large audio files to verify memory usage patterns

4. **Integration Testing**
   - Test the module in a complete React Native application
   - Verify correct operation on real devices with different architectures

## 7. Update Process for Future Versions

When a new version of Sherpa-ONNX is released:

1. Update the native libraries:
   - Update the sherpa-onnx repository reference
   - Rebuild using `build-sherpa-android.sh`
   - Copy the new libraries to the jniLibs directories

2. Update the Kotlin wrapper:
   - Check for new classes or methods in the Sherpa-ONNX Kotlin API
   - Add corresponding handler methods in the appropriate handler classes
   - Expose new functionality through the React Native module

3. Maintain backward compatibility:
   - Preserve existing method signatures
   - Use optional parameters for new features
   - Add version checking where needed

Maintain a methodical approach to ensure no functionality is lost or modified during updates.

## 8. Troubleshooting Common Issues

### 8.1 Library Loading Issues

If the native library fails to load:
- Verify that the libraries exist in the correct jniLibs directories
- Check that the app's build.gradle includes the correct ABI filters
- Look for missing dependencies in the native libraries
- Use `adb logcat` to check for detailed loading errors

### 8.2 JNI Exceptions

For JNI exceptions:
- Check for version mismatches between JNI and Kotlin wrapper
- Verify parameter types and array bounds
- Look for null pointer exceptions in native code
- Add detailed logging around JNI calls

### 8.3 Threading Issues

For threading-related problems:
- Ensure UI updates happen on the main thread using `runOnUiQueueThread`
- Avoid blocking the main thread with long-running operations
- Be careful with shared resources across thread boundaries
- Use proper synchronization for any shared state

## 9. Additional Resources

- Sherpa-ONNX GitHub Repository: https://github.com/k2-fsa/sherpa-onnx
- Sherpa-ONNX Documentation: https://k2-fsa.github.io/sherpa/onnx/index.html
- React Native Native Modules Guide: https://reactnative.dev/docs/native-modules-android
