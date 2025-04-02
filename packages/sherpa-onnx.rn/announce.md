# 📢 Pre-announcement: @siteed/sherpa-onnx.rn

I've begun development on `@siteed/sherpa-onnx.rn`, a React Native wrapper for the powerful sherpa-onnx library that provides speech capabilities across platforms. It's designed to work with both old and new React Native architectures, making it the easiest way to implement advanced audio processing on mobile and web.

## Current Progress

- ✅ Android support (both old and new architecture)
- ✅ Implemented core API structure with TypeScript interfaces
- ✅ Created a demo app for loading and testing various speech models
- ⏳ iOS implementation (partially working, issues with new architecture)
- ⏳ Web/WASM implementation (requires modifications to main sherpa-onnx repo)

## Features

The module aims for full feature parity with sherpa-onnx soon. Currently implemented:
- 🔊 Text-to-Speech (TTS)
- 🎤 Automatic Speech Recognition (ASR)
- 🏷️ Audio Tagging
- 👤 Speaker Identification

The demo app will showcase all of these features with example implementations.

## Roadmap

I'm working toward full compatibility across iOS, Android, and Web platforms. While I can't commit to a specific timeline, my focus is on:

1. Resolving iOS new architecture issues
2. Contributing changes to the main sherpa-onnx repo for WASM build adaptations
3. Enhancing documentation with usage examples
4. Performance optimization

## Technical Details

The implementation maintains a consistent TypeScript API across platforms while handling the native integration complexities of each platform:
- Android: JNI wrapper with Kotlin adaptation
- iOS: Swift-to-Objective-C-to-JS bridge
- Web: WebAssembly with virtual filesystem for model loading

This architecture ensures compatibility with both the legacy React Native architecture and the new architecture, providing a future-proof solution for audio processing needs.

More details and a call for testing will follow when the package reaches beta status.