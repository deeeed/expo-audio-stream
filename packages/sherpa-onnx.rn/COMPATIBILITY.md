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
- Full TurboModule implementation on both platforms
- Architecture detection and adaptation
- Compatible with apps using New Architecture
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
- **Testing**: Manual testing required (platform limitation)
- **Libraries**: Built from source via `./build-sherpa-ios.sh`
- **Models**: Full model management support
- **Architecture**: Both Old/New architecture support (fixed in PR #254)

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
const archInfo = await SherpaOnnx.getArchitectureInfo();
console.log('Architecture:', archInfo);
// { isNewArchitecture: boolean, turboModuleEnabled: boolean, fabricEnabled: boolean }
```

## Integration Testing

### Android
```bash
# Run integration tests on connected device/emulator
cd packages/sherpa-onnx.rn
yarn test:android
```

### iOS
Due to iOS platform limitations, integration tests cannot access React Native modules from unit tests. Testing options:

```bash
# Get iOS testing information
cd packages/sherpa-onnx.rn
yarn test:ios:info
```

Options for iOS testing:
- Manual testing with the demo app
- E2E testing with Detox or Appium
- Unit tests for isolated native code only

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
- Integration tests require manual setup in Xcode

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
const info = await SherpaOnnx.getArchitectureInfo();
console.log('Architecture info:', info);
```

### Build Errors
- Ensure Java 17+ is used consistently
- Clear React Native cache: `yarn react-native start --reset-cache`
- Clean native builds: remove `ios/build` and `android/build`

## Verified Compatibility

- ✅ React Native 0.74+ with new architecture
- ✅ React Native 0.72+ with old architecture
- ✅ Expo SDK 51+ (both architectures)
- ✅ iOS 13.4+ and Android 24+

## Future Roadmap

- Enhanced TurboModule implementations
- Additional model format support
- Improved web platform capabilities
- Extended audio processing features