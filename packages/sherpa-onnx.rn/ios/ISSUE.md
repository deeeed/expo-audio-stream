# Understanding React Native TurboModule Codegen Issues

## The Problem

When using React Native's new architecture (Fabric + TurboModules), the module `SherpaOnnx` is being detected by TurboModuleRegistry in JavaScript, but its methods are undefined. The error message shows:

```
Module loading error details: [TypeError: _NativeSherpaOnnx.default.validateLibraryLoaded is not a function (it is undefined)]
```

This explanation outlines the expected behavior of React Native's codegen system for TurboModules, the reasons why your implementation might be failing, and strategies for debugging and fixing the issue.

The main issue seems to be that the codegen system isn't properly generating the `NativeSherpaOnnxSpecJSI` class that's needed for the TurboModule implementation. The workaround of using a JavaScript-side fallback to detect and handle undefined methods is the most practical immediate solution.

This happens despite having properly defined methods in both old and new architecture sections of our native code.

## How React Native Codegen Is Supposed to Work

React Native's codegen system is designed to automatically generate the C++ interface code needed for TurboModules, following these steps:

1. **Spec Definition**: 
   - In TypeScript: You define a TypeScript interface with special JSI annotations
   - In Objective-C: You define a protocol that conforms to `RCTBridgeModule`

2. **Code Generation Process**:
   - When building, React Native's `codegen` script parses these spec files
   - It generates C++ header files and implementations that bridge JS to native code
   - For Objective-C specs, it generates a class named `Native<ModuleName>SpecJSI` (e.g., `NativeSherpaOnnxSpecJSI`)

3. **Module Registration**:
   - The native module implements `getTurboModule` returning an instance of this generated class
   - This connects the JavaScript calls to the native implementations

## Why Our Implementation Is Failing

There are several potential reasons why codegen isn't working correctly in our project:

1. **Missing Codegen Setup**: 
   - The project might not have React Native's codegen properly configured
   - This would prevent generation of the necessary `NativeSherpaOnnxSpecJSI` class

2. **Spec File Issues**:
   - The `SherpaOnnxSpec.h` file might not be found by the codegen system
   - It needs to be in a specific location and might need additional configuration

3. **Build Configuration**:
   - The new architecture build might not be correctly set up to run codegen
   - Required dependencies or build phases might be missing

4. **Method Signature Mismatch**:
   - The methods in the spec must exactly match those in the implementation
   - Any discrepancy in parameter types will cause issues

## Attempted Solutions and Why They Failed

1. **Using `std::make_shared<facebook::react::NativeSherpaOnnxSpecJSI>(self, invoker)`**:
   - Failed because the class `NativeSherpaOnnxSpecJSI` was not generated
   - Compiler error: "no member named 'NativeSherpaOnnxSpecJSI' in namespace 'facebook::react'"

2. **Manual TurboModule Implementation**:
   - Complex approach requiring direct JSI manipulation
   - Required headers and implementation details might not match our React Native version

3. **Using `nullptr` as a Fallback**:
   - This compiles but doesn't expose methods to JavaScript
   - It's only a temporary workaround, not a solution

## The Correct Approach

To properly fix this issue, we need to:

1. **Ensure Codegen Runs**:
   - Verify that React Native's codegen is running during the build process
   - Check that `SherpaOnnxSpec.h` is properly included in the codegen inputs

2. **Check Generated Files**:
   - Look in the build output directory for generated files
   - Typical location: `<project>/ios/build/generated/ios/`
   - We should see files like `NativeSherpaOnnxSpec.h` and `NativeSherpaOnnxSpec.mm`

3. **Fix JavaScript-to-Native Bridging**:
   - Ensure our JavaScript code correctly imports and uses the TurboModule
   - Add fallback logic to support both architectures during transition

## Advanced Workaround Strategy

Until proper codegen is working, a robust workaround is to:

1. Keep the `nullptr` implementation in `getTurboModule` so the code compiles
2. Modify the JavaScript layer to detect undefined methods and fall back to old architecture
3. Run all API calls through both architectures but prioritize the one that works

This approach allows us to ship a working product while diagnosing the root cause of the codegen issue.

## Key Questions to Investigate

1. Is codegen even enabled in the project configuration?
2. Are there any error messages during the build process related to codegen?
3. Is `SherpaOnnxSpec.h` properly structured according to React Native's requirements?
4. Is this module listed in the project's codegen configuration?
