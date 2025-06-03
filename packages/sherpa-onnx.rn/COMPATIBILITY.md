# React Native Compatibility

This document explains compatibility considerations for the `@siteed/sherpa-onnx.rn` module.

## React Native Architecture Support

This module supports both Old and New React Native architectures:

### ✅ Old Architecture (Bridge-based)
- Uses `ReactContextBaseJavaModule` in Android
- Uses `RCTBridgeModule` in iOS
- Full functionality available
- Stable and tested

### ✅ New Architecture (JSI/TurboModules)
- Architecture detection and adaptation
- Compatible with apps using New Architecture
- Automatic fallback to bridge when needed
- System information APIs work on both architectures

## Platform Support

### ✅ Android
- **Status**: Production ready
- **Testing**: Comprehensive integration test suite (26 tests)
- **Libraries**: Pre-built native libraries included
- **Models**: Automatic download and extraction
- **Architecture**: Both Old/New architecture support

### ✅ iOS
- **Status**: Production ready
- **Testing**: Integration tests available
- **Libraries**: Built from source via `./build-sherpa-ios.sh`
- **Models**: Full model management support
- **Architecture**: Bridge-based with New Architecture compatibility

### ✅ Web
- **Status**: Basic support
- **Implementation**: WASM-based
- **System Info**: WebGL detection, performance API integration
- **Limitations**: Model functionality varies by browser

## Core Features

### System Information
- **`getSystemInfo()`**: Comprehensive device/platform information
- **`getArchitectureInfo()`**: React Native architecture detection
- **Cross-platform**: Consistent API across Android, iOS, Web
- **Performance**: Optimized for rapid calls (<50ms average)

### Model Management
- **Download**: Automatic model downloading with progress tracking
- **Extraction**: Archive extraction (tar.bz2, zip)
- **Validation**: Checksum verification and integrity checks
- **Storage**: Efficient caching and cleanup

### Audio Processing
- **TTS**: Text-to-speech with multiple model types
- **ASR**: Speech recognition with streaming support
- **Models**: Lightweight models optimized for mobile

## Setup Requirements

### iOS Setup
```bash
# One-time iOS library build
cd packages/sherpa-onnx.rn
./build-sherpa-ios.sh

# Then use in any iOS app
yarn ios
```

### Android Setup
```bash
# Libraries included - no setup required
yarn android
```

### Build Requirements
- **Java**: Version 17+ required
- **iOS**: Xcode 15+ recommended
- **Android**: API level 24+ (Android 7.0+)
- **Node**: 18+ recommended

## Architecture Detection

The module automatically detects and adapts to the React Native architecture:

```typescript
import { SherpaOnnx } from '@siteed/sherpa-onnx.rn';

// Works on both architectures
const systemInfo = await SherpaOnnx.getSystemInfo();
console.log('Architecture:', systemInfo.architecture.type); // 'old' | 'new'
```

## Migration Guide

### From Old Architecture Only
- No changes required - module automatically detects architecture
- New Architecture apps work without modification
- System info APIs provide architecture details

### Integration Testing
```bash
# Android - Run comprehensive test suite
cd packages/sherpa-onnx.rn/android
./gradlew :siteed-expo-audio-studio:connectedAndroidTest

# iOS - Open in Xcode for device testing
open ios/sherpa-onnx-rn.xcworkspace
```

## Performance Characteristics

| Platform | Architecture | System Info | Model Download | TTS/ASR |
|----------|-------------|-------------|----------------|---------|
| Android  | Old         | <50ms       | Background     | Full    |
| Android  | New         | <50ms       | Background     | Full    |
| iOS      | Old         | <100ms      | Background     | Full    |
| iOS      | New         | <100ms      | Background     | Full    |
| Web      | N/A         | <200ms      | Limited        | Basic   |

## Known Limitations

### iOS
- First-time library build required (`./build-sherpa-ios.sh`)
- Larger app size (~100MB with libraries)
- Some models iOS-specific format requirements

### Android
- Minimum API 24 required
- ProGuard rules may need adjustment
- Some emulators have limited audio support

### Web
- Browser WASM support required
- Limited model compatibility
- No background processing

## Troubleshooting

### iOS Build Issues
```bash
# Check if libraries are built
ls packages/sherpa-onnx.rn/prebuilt/ios/simulator/

# Rebuild if needed
cd packages/sherpa-onnx.rn
./build-sherpa-ios.sh --force
```

### Architecture Detection Issues
```typescript
// Debug architecture detection
const info = await SherpaOnnx.getSystemInfo();
console.log('Architecture info:', info.architecture);
```

### Build Errors
- Ensure Java 17+ is used consistently
- Clear React Native cache: `yarn react-native start --reset-cache`
- Clean native builds: remove `ios/build` and `android/build`

## Future Roadmap

- Enhanced TurboModule implementations
- Additional model format support
- Improved web platform capabilities
- Extended audio processing features