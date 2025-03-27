# Sherpa-ONNX Swift API: React Native Adaptation Guide

## 1. Overview and Challenges

The Sherpa-ONNX library provides powerful speech recognition capabilities through a C API with Swift wrappers. Integrating this library into React Native presents several architectural challenges that this guide addresses.

### 1.1 Swift-to-C-to-JavaScript Bridge Complexity

React Native's integration with native code follows a specific path:
- JavaScript → React Native Bridge → Objective-C → C/C++ Library

The original Sherpa-ONNX provides:
- C Library (sherpa-onnx/c-api) → Swift Wrapper (SherpaOnnx.swift)

This creates an impedance mismatch we must resolve:
- JavaScript → React Native Bridge → Objective-C → **Custom Swift Adaptation** → C Library

### 1.2 Specific Technical Challenges

1. **Bridging Header Incompatibility**
   - The original Sherpa-ONNX Swift implementation relies on a bridging header (`SherpaOnnx-Bridging-Header.h`) to expose C functions to Swift
   - React Native's module system has a different architecture that cannot incorporate traditional Swift bridging headers
   - We need to use a module map approach instead

2. **Objective-C Runtime Requirements**
   - React Native's bridge communicates with native code through the Objective-C runtime
   - All Swift classes, methods, and properties that need to be accessible from JavaScript must be:
     - Annotated with `@objc`
     - Classes must inherit from `NSObject`
     - Properly initialized with `super.init()`

3. **Binary Architecture Support**
   - iOS apps need to support both simulator (x86_64/arm64) and device (arm64) architectures
   - Library selection needs to happen dynamically during build

### 1.3 Core Requirements

1. **Preserve Exact Naming**: Maintain identical class, method, and property names from the original `SherpaOnnx.swift`
2. **Preserve Full Functionality**: Ensure all features of the original implementation remain available
3. **Add Objective-C Compatibility**: Make minimal additions for React Native bridge compatibility

## 2. Project Structure and Build Process

### 2.1 Key Directory Structure

```
packages/sherpa-onnx.rn/
├── ios/
│   ├── bridge/
│   │   ├── SherpaOnnxClasses.swift   # Our Swift adaptation
│   │   ├── SherpaOnnxRnModule.h      # React Native module header
│   │   └── SherpaOnnxRnModule.m      # React Native module implementation
│   └── SherpaOnnxSpec.*              # TurboModule specifications
├── prebuilt/
│   ├── include/                      # C headers and module map
│   │   ├── module.modulemap          # Generated during build
│   │   ├── sherpa-onnx/
│   │   │   └── c-api/
│   │   └── onnxruntime/
│   ├── ios/
│   │   ├── current/ -> symlinks      # Dynamic symlinks to active architecture
│   │   ├── device/                   # arm64 libraries
│   │   └── simulator/                # x86_64+arm64 libraries
│   └── swift/
│       └── sherpa-onnx/              # Original Swift implementation
└── sherpa-onnx-rn.podspec            # CocoaPods configuration
```

### 2.2 Binary Library Management

The `prebuilt/ios` directory contains:

- **device/** - ARM64 libraries for physical iOS devices
- **simulator/** - x86_64/ARM64 libraries for iOS simulators
- **current/** - Dynamic symlinks that point to either device or simulator libraries

During the build process, these symlinks are updated based on the build target:
- When building for simulator: symlinks point to simulator libraries
- When building for device: symlinks point to device libraries

The `build-sherpa-ios.sh` script:
1. Clones the Sherpa-ONNX repository if needed
2. Builds the libraries for both device and simulator
3. Copies the compiled libraries to the appropriate directories in `prebuilt/ios/`
4. Copies the header files to `prebuilt/include/`
5. Copies the original Swift implementation for reference

## 3. Adaptation Process: Step-by-Step Instructions

Follow these precise steps when adapting the Sherpa-ONNX Swift API:

### 3.1 Module Map Configuration

The `module.modulemap` file is automatically generated during the build process in `prebuilt/include/module.modulemap`. This file is crucial for exposing C functions to Swift without a bridging header:

```
module CSherpaOnnx {
  header "sherpa-onnx/c-api/c-api.h"
  export *
}

module COnnxRuntime {
  header "onnxruntime/core/session/onnxruntime_c_api.h"
  export *
}
```

This allows our Swift code to directly import the C functions:

```swift
import CSherpaOnnx
import COnnxRuntime
```

The module map is generated during the build process by `build-sherpa-ios.sh` and should not be manually modified. If you need to update the module map, modify the build script instead.

### 3.2 Copy and Adapt Swift Classes - Critical Guidelines

**IMPORTANT**: Process each class, method, and property individually and methodically.

For **EACH** class from the original `SherpaOnnx.swift`:

1. Copy the class definition exactly, preserving the name
2. Add `@objc public` before the class declaration
3. Make the class inherit from `NSObject`
4. Add `super.init()` to all initializers
5. Add `@objc public` to all methods and properties that need exposure to React Native
6. Adapt parameter and return types as needed for Objective-C compatibility
7. Preserve all functionality from the original implementation

Example adaptation pattern:

```swift
// Original in SherpaOnnx.swift
class SherpaOnnxOnlineRecongitionResult {
  let result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!
  
  var text: String {
    return String(cString: result.pointee.text)
  }
  
  var tokens: [String] { /* implementation */ }
  
  init(result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!) {
    self.result = result
  }
}

// Adapted for React Native - PRESERVES EXACT NAME
@objc public class SherpaOnnxOnlineRecongitionResult: NSObject {
  let result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!
  
  @objc public var text: String {
    return String(cString: result.pointee.text)
  }
  
  @objc public var tokens: [String] { /* implementation */ }
  
  init(result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!) {
    self.result = result
    super.init()
  }
}
```

### 3.3 Parameter Type Adaptation

For each method with Swift-specific parameter types:

1. Preserve the original method name exactly
2. Adapt parameter types for Objective-C compatibility:
   
   ```swift
   // Original
   func acceptWaveform(samples: [Float], sampleRate: Int = 16000)
   
   // Adapted
   @objc public func acceptWaveform(samples: NSArray, sampleRate: Int = 16000) {
     let floatSamples = samples.compactMap { ($0 as? NSNumber)?.floatValue }
     // Use floatSamples with the original C function
   }
   ```

3. Ensure the internal implementation maintains identical behavior to the original

### 3.4 Validation Checklist

For each adapted class and method, verify:

- [ ] Class name is **identical** to original
- [ ] All properties have been preserved
- [ ] All methods have been preserved with identical signatures
- [ ] `@objc public` has been added where needed
- [ ] `NSObject` inheritance has been added
- [ ] `super.init()` has been added to initializers
- [ ] Parameter types have been adapted for Objective-C compatibility
- [ ] Return types have been adapted for Objective-C compatibility
- [ ] Memory management is handled properly in deinitializers

### 3.5 Handling C Structs in the Objective-C Bridge

**CRITICAL ISSUE**: C structs from imported modules cannot be directly exposed as parameters in Swift methods tagged with `@objc`. This creates an incompatibility when trying to initialize objects with C structs across the Objective-C bridge.

**Solution Pattern**: Use a factory method approach:

1. Create a static factory method that accepts Objective-C compatible types (dictionaries, arrays, primitives)
2. Within the Swift implementation, convert these to C structs
3. Use a private initializer that works with the C structs directly
4. Expose only the factory method to Objective-C/React Native

Example implementation:

```swift
// ❌ PROBLEMATIC: Cannot be called from Objective-C
@objc public init(config: UnsafePointer<CSherpaOnnx.SherpaOnnxOnlineRecognizerConfig>) {
  // This will fail to compile or work at runtime
}

// ✅ SOLUTION: Factory method pattern
@objc public class SomeClass: NSObject {
  // Factory method with Objective-C compatible parameters
  @objc public static func createWithConfig(_ dict: [String: Any]) -> SomeClass? {
    // Convert dictionary to C struct
    var cStruct = createCStructFromDictionary(dict)
    // Call private initializer
    return SomeClass(unsafeConfig: &cStruct)
  }
  
  // Private initializer that uses C struct directly
  private init(unsafeConfig: UnsafePointer<CSomeStruct>) {
    // Implementation using C API
    super.init()
  }
}
```

This pattern preserves all functionality while maintaining compatibility with the Objective-C runtime required by React Native.

## 4. Library Management Details

The podspec uses a script phase to dynamically update library symlinks during build:

```ruby
s.script_phase = {
  :name => "Link Sherpa ONNX Libraries",
  :script => '
    if [[ "$PLATFORM_NAME" == *simulator* ]]; then
      echo "Symlinking simulator libraries"
      rm -rf "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/*"
      for lib in libonnxruntime.a libsherpa-onnx-c-api.a ... ; do
        ln -sf ../simulator/$lib "${PODS_TARGET_SRCROOT}/prebuilt/ios/current/$lib"
      done
    else
      echo "Using device libraries"
    fi
  ',
  :execution_position => :before_compile
}
```

## 5. Objective-C Bridge Module Implementation

Create bridge files to expose the Swift classes to React Native:

1. `SherpaOnnxRnModule.h`:
   ```objc
   #import <React/RCTBridgeModule.h>
   #import <React/RCTEventEmitter.h>
   
   @class SherpaOnnxOnlineRecongitionResult; // Use EXACT original name
   
   @interface SherpaOnnxRnModule : RCTEventEmitter <RCTBridgeModule>
   @property (nonatomic, strong) SherpaOnnxRecognizer *recognizer;
   @end
   ```

2. `SherpaOnnxRnModule.m`:
   - Implement methods that call the adapted Swift classes
   - Preserve exact naming throughout
   - Handle promises and event emission

## 6. Critical Verification Steps

After adaptation, methodically verify:

1. Compare the original `SherpaOnnx.swift` and adapted version side by side
2. Verify each class has been adapted with identical name and functionality
3. Compile and test each feature individually
4. Test with both simulator and device targets
5. Verify memory management with Instruments

## 7. Update Process for Future Versions

When a new version of Sherpa-ONNX is released:

1. Compare the new `SherpaOnnx.swift` with current implementation
2. Identify any new classes, methods, or properties
3. Copy each new element exactly, then adapt using the same patterns:
   - Add `@objc public`
   - Add `NSObject` inheritance 
   - Add `super.init()`
   - Adapt parameter types

Maintain a rigorous, systematic approach to ensure no functionality is lost or modified during adaptation.
