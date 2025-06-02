# Integration Documentation

This directory contains integration guides and compatibility information for sherpa-onnx.rn.

## Platform Integration

### Android Integration
- **Native Libraries**: Pre-built sherpa-onnx JNI libraries for multiple architectures
- **Build System**: CMake integration with Android NDK
- **Testing**: Instrumented tests on real devices

### iOS Integration
- **Native Libraries**: Static libraries with Swift/Objective-C bridge
- **Build System**: Xcode project integration
- **Testing**: XCTest framework integration

### Web Integration (Planned)
- **WASM**: WebAssembly build of sherpa-onnx
- **Model Loading**: Browser-compatible model management
- **Audio Processing**: Web Audio API integration

## Model Integration

### Supported Model Types
- **TTS (Text-to-Speech)**: VITS, Matcha, Kokoro models
- **ASR (Automatic Speech Recognition)**: Whisper, Zipformer, Paraformer models
- **VAD (Voice Activity Detection)**: Silero VAD
- **Audio Tagging**: CED, Zipformer classification models
- **Speaker ID**: Speaker identification and verification
- **Language ID**: Spoken language identification

### Model Management
- **Download**: Automatic model downloading and caching
- **Extraction**: tar.bz2 archive extraction
- **Validation**: Model file integrity and compatibility checking
- **Storage**: Platform-appropriate storage locations

## Build Integration

### Development Workflow
1. **Clone sherpa-onnx submodule**
2. **Build native libraries** for target platforms
3. **Copy libraries** to appropriate platform directories
4. **Run integration tests** to validate functionality

### Build Scripts
- `build-sherpa-android.sh` - Build Android native libraries
- `build-sherpa-ios.sh` - Build iOS static libraries  
- `build-sherpa-wasm.sh` - Build WebAssembly modules
- `build-all.sh` - Build for all platforms

## Compatibility

See [`../COMPATIBILITY.md`](../COMPATIBILITY.md) for detailed compatibility information including React Native versions, platform requirements, and known limitations.