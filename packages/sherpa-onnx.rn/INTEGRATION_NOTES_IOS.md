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

4. **Parameter Naming Inconsistency Issues**
   - React Native's old and new architectures expect different parameter naming patterns
   - Promise parameter names are especially problematic: the old architecture often uses the wrong names
   - The most common error is `resolve/reject` vs. `resolver/rejecter` mismatch

### 1.3 Core Requirements

1. **Preserve Exact Naming**: Maintain identical class, method, and property names from the original `SherpaOnnx.swift`
2. **Preserve Full Functionality**: Ensure all features of the original implementation remain available
3. **Add Objective-C Compatibility**: Make minimal additions for React Native bridge compatibility

## 1.4 Common Integration Issues and Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Parameter name mismatch** | `"unrecognized selector sent to instance"` error | Ensure parameter names are exactly the same in all interface files (Swift, Objective-C, protocol) |
| **Promise callback naming** | Methods not found at runtime | Always use exactly `resolve` and `reject` for promise callbacks, not `resolver` and `rejecter` |
| **Library not loading** | Native calls fail, app crashes | Check library paths, use `SherpaOnnxFileExists("/tmp")` to verify C API is accessible |
| **Architecture compatibility** | Build errors, linking errors | Ensure podspec correctly selects libraries based on target architecture |
| **Missing `@objc` annotations** | Swift methods not available to JavaScript | Add `@objc public` to all methods that need to be exposed |

## 2. Project Structure and Build Process

### 2.1 Key Directory Structure

```
packages/sherpa-onnx.rn/
├── ios/
│   ├── bridge/
│   │   ├── SherpaOnnxRnModule.h      # React Native module header
│   │   ├── SherpaOnnxRnModule.mm     # React Native module implementation
│   │   └── SherpaOnnxSpec.h          # Defines protocol for old architecture
│   ├── codegen/
│   │   └── SherpaOnnxSpec/
│   │       ├── SherpaOnnxSpec-generated.mm  # Generated code for new architecture
│   │       └── SherpaOnnxSpec.h      # Generated spec for new architecture
│   └── native/
│       └── SherpaOnnxClasses.swift   # Swift implementation
├── prebuilt/
│   ├── include/                      # C headers and module map
│   │   ├── module.modulemap          # Generated during build
│   │   ├── sherpa-onnx/
│   │   │   └── c-api/
│   │   └── onnxruntime/
│   └── ios/
│       ├── current/ -> symlinks      # Dynamic symlinks to active architecture
│       ├── device/                   # arm64 libraries
│       └── simulator/                # x86_64+arm64 libraries
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

## 3. Adding New Methods: Quick Start Guide

Adding new methods requires careful implementation in several places to ensure compatibility with both old and new React Native architectures. Follow these steps precisely to add a new method:

### 3.1 Key Files to Modify

When adding a new method, you need to modify these files:

1. **ios/native/SherpaOnnxClasses.swift** - Implement the Swift side functionality
2. **ios/bridge/SherpaOnnxRnModule.mm** - Create the bridge method for JavaScript
3. **ios/bridge/SherpaOnnxSpec.h** - Define the method in the protocol (for old architecture)
4. **ios/codegen/SherpaOnnxSpec/SherpaOnnxSpec.h** - Define the method in the new architecture spec (if using new architecture)

### 3.2 Step-by-Step Process to Add a New Method

#### Step 1: Add Swift Implementation

In **ios/native/SherpaOnnxClasses.swift**:

```swift
@objc public class SomeClass: NSObject {
  // Add a new method
  @objc public func newMethod(_ parameter: NSString) -> NSDictionary {
    // Implementation using C API
    // Always use @objc compatible types
    return ["result": "success"]
  }
}
```

Important notes:
- Use `@objc public` for all exposed methods
- Use Objective-C compatible types (NSString, NSDictionary, NSArray, etc.)
- Convert between Swift and Objective-C types as needed

#### Step 2: Implement Bridge Method in SherpaOnnxRnModule.mm

```objc
// Add the new method to SherpaOnnxRnModule.mm

// IMPORTANT: Parameter naming must be exact
// For promises use: resolve/reject (not resolver/rejecter)
RCT_EXPORT_METHOD(newMethod:(NSString *)parameter
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  // Call Swift implementation
  NSDictionary *result = [self.someClass newMethod:parameter];
  resolve(result);
}
```

Crucial parameter naming rules:
- First parameter uses just the name: `(NSString *)parameter`
- Promise callbacks MUST be `resolve` and `reject` (not resolver/rejecter)
- For non-promise methods, use explicit parameter names

#### Step 3: Define in SherpaOnnxSpec.h for New Architecture

```objc
// In ios/bridge/SherpaOnnxSpec.h under @protocol SherpaOnnxSpec
- (void)newMethod:(NSString *)parameter
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject;
```

Important notes:
- Parameter names must match exactly between all files
- Promise parameter names must be `resolve` and `reject`
- The protocol defines the interface for the old architecture

#### Step 4: If using new architecture, update codegen spec

```objc
// In ios/codegen/SherpaOnnxSpec/SherpaOnnxSpec.h
- (void)newMethod:(NSString *)parameter
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject;
```

### 3.3 Testing and Validation

1. **Test both architectures**:
   - Use feature detection in JS to support both architectures
   - Test on real device to verify actual functionality

2. **Common Issues and Solutions**:
   - **Unrecognized selector**: Parameter names in Swift, Objective-C, and protocol don't match exactly
   - **Parameter mismatch**: Swift might be using different types than expected
   - **Library loading issues**: Use `SherpaOnnxFileExists("/tmp")` to verify C library is properly loaded

3. **Verifying C Library Accessibility**:
   ```swift
   // Simple test function in SherpaOnnxClasses.swift
   @objc public static func isLibraryLoaded() -> [String: Any] {
     let tempDir = FileManager.default.temporaryDirectory.path
     let result = SherpaOnnxFileExists(tempDir)
     
     return [
       "loaded": result >= 0,
       "status": result >= 0 ? "Library is loaded" : "Library could not be accessed"
     ]
   }
   ```

## 4. Parameter Type Adaptation Cheat Sheet

When working with parameters across the bridge:

| JavaScript Type | Objective-C Type | Swift Conversion |
|-----------------|------------------|------------------|
| string          | NSString *       | as String        |
| number          | NSNumber *       | as Int / as Double |
| boolean         | BOOL             | as Bool          |
| object          | NSDictionary *   | as [String: Any] |
| array           | NSArray *        | as Array         |
| function        | RCTResponseSender| N/A (Bridge only)|
| Promise         | resolve/reject   | N/A (Bridge only)|

Example Swift conversion:
```swift
@objc public func processData(_ data: NSDictionary) -> NSDictionary {
  // Convert NSDictionary to Swift dictionary
  let swiftDict = data as? [String: Any] ?? [:]
  
  // Process using Swift types
  // ...
  
  // Return Objective-C compatible result
  return resultDict as NSDictionary
}
```

## 5. Factory Method Pattern for C Structs

Since C structs cannot be exposed directly through Objective-C, use this pattern:

```swift
@objc public class YourClass: NSObject {
  // Factory method with Objective-C compatible parameters
  @objc public static func createWithConfig(_ dict: [String: Any]) -> YourClass? {
    // Convert dictionary to C struct
    let cStruct = convertDictToCStruct(dict)
    // Call private initializer
    return YourClass(unsafeConfig: &cStruct)
  }
  
  // Private initializer that uses C struct directly
  private init(unsafeConfig: UnsafePointer<CSomeStruct>) {
    // Implementation using C API
    super.init()
  }
}
```

## 6. Bridge Module Troubleshooting

### Parameter Name Consistency

This is the most common source of errors. Parameter names MUST match exactly:

```objc
// In Swift class
@objc public func doSomething(_ param: NSString, options: NSDictionary) -> Void

// In Objective-C bridge (SherpaOnnxRnModule.mm)
RCT_EXPORT_METHOD(doSomething:(NSString *)param
                  options:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// In protocol definition (SherpaOnnxSpec.h)
- (void)doSomething:(NSString *)param
            options:(NSDictionary *)options
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject;
```

### Common Error: Unrecognized Selector

If you see: `"unrecognized selector sent to instance"`, check:

1. Parameter names match EXACTLY between Swift, Objective-C, and protocol definition
2. Promise callbacks are EXACTLY `resolve` and `reject` (not resolver/rejecter)
3. Method signature is consistent across all files

### Library Loading Verification

Use this simple test to verify C library is accessible:

```objc
RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSDictionary *result = [SherpaOnlineRecognizer isLibraryLoaded];
    resolve(result);
}
```

Swift implementation:
```swift
@objc public static func isLibraryLoaded() -> [String: Any] {
  let tempDir = FileManager.default.temporaryDirectory.path
  let result = SherpaOnnxFileExists(tempDir)
  
  return [
    "loaded": result >= 0,
    "status": result >= 0 ? "Library is loaded" : "Library could not be accessed"
  ]
}
```