# React Native Compatibility Considerations

This document explains important compatibility considerations for the `@siteed/sherpa-onnx.rn` module.

## React Native Architecture Compatibility

This module is designed to work with both the Old and New React Native architectures. Here's how we handle this:

### Old Architecture (Default)

- Uses the standard `ReactContextBaseJavaModule` pattern in Kotlin/Java
- Communicates over the React Native bridge
- This is the primary implementation and handles all the actual functionality

### New Architecture Compatibility

The module includes minimal support for the New Architecture to ensure it can be used in apps with the New Architecture enabled. This is done through:

1. Placeholder C++ files in `android/build/generated/source/codegen/jni/`
2. A basic CMakeLists.txt that satisfies the build requirements
3. A stub implementation that does nothing but keeps the build system happy

These files don't actually implement any functionality - they're just there to prevent build errors when used in a New Architecture app.

## JVM Compatibility

The module is configured to use Java 17, which is required for modern React Native applications. This is set in the `build.gradle` file:

```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}

kotlinOptions {
    jvmTarget = '17'
}
```

If you encounter the error "Inconsistent JVM-target compatibility detected", it means there's a mismatch between the Kotlin and Java compilation targets. Make sure both are set to the same Java version.

## Future Improvements

For full New Architecture support, we would need to:

1. Generate C++ specs from TypeScript definitions
2. Create actual C++ implementations using JSI
3. Use TurboModuleManagerDelegate to register our TurboModule
4. Eliminate the bridge-based implementation

This would improve performance but requires significant refactoring. 