# Android Implementation for @siteed/sherpa-onnx.rn

This directory contains the Android native implementation for the Sherpa ONNX React Native module.

## Architecture

The implementation consists of:

1. **Kotlin Native Module** (`SherpaOnnxModule.kt`): A simple React Native module implementation that loads the Sherpa ONNX JNI library and provides placeholder methods for the JavaScript API.

2. **JNI Libraries** (in `src/main/jniLibs/`): Native `.so` libraries for different architectures that implement the actual speech recognition functionality.

3. **New Architecture Compatibility** (in `build/generated/source/codegen/jni/`): Placeholder C++ files to ensure compatibility with React Native's New Architecture.

## Building the Module

The module has been set up with automated scripts to handle the build process:

1. **setup.sh**: Clones the Sherpa ONNX repository into `third_party/`.

2. **build-sherpa-android.sh**: Builds the Sherpa ONNX native libraries for Android using the Sherpa ONNX build scripts.

3. **copy-libs.sh**: Copies the built native libraries to the correct location in the Android project.

## Build Process

The standard build process is:

1. Run `npm run setup` to clone the Sherpa ONNX repository.
2. Run `npm run build:android` to build the Sherpa ONNX native libraries.
3. Run `npm run copy:libs` to copy the libraries to the correct locations.

These steps are automated as part of the module's `postinstall` script.

## Compatibility with React Native

The module supports both the Old and New React Native architectures:

- **Old Architecture**: Uses Kotlin implementation via `ReactContextBaseJavaModule`.
- **New Architecture**: Uses placeholder C++ files to satisfy build requirements.

## Implementing Speech Recognition

The current implementation provides a minimal set of placeholder methods. To implement actual speech recognition functionality, you'll need to:

1. Call the Sherpa ONNX JNI methods directly from the Kotlin code
2. Process audio data and return results
3. Update the TypeScript interfaces to match your implementation

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

## Troubleshooting

### Missing JNI Libraries
If you encounter errors about missing native libraries, make sure you've run:
```
npm run build:android
npm run copy:libs
```

### New Architecture Compatibility
If you have build errors in a New Architecture app, check that:
1. The placeholder C++ files exist in `build/generated/source/codegen/jni/`
2. Your app's gradle version is compatible with the module's configuration 