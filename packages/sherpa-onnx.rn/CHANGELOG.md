# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0-beta.2] - 2026-03-23

### Added
- Generic ONNX inference support (iOS handler, Kotlin, TS API, web)

### Fixed
- Add prebuilt .so files for production builds
- Remove Class.forName() check from isLibraryLoaded init
- Narrow Commons Compress R8 keep rules, add dontwarn
- Properly apply R8 keep rules via consumerProguardFiles
- Keep Apache Commons Compress from R8 minification
- Prebuilts v1.12.29, fix install.js, WASM path fixes

## [1.0.0] - 2026-03-20

First stable release — production-proven via the [Sherpa Voice](https://deeeed.github.io/audiolab/sherpa-voice/) app (live on App Store and Google Play).

### Features
- **Speech-to-Text (ASR)**: On-device speech recognition with streaming and file-based modes
- **Text-to-Speech (TTS)**: On-device speech synthesis with multiple voice models
- **Voice Activity Detection (VAD)**: Real-time voice activity detection
- **Language Identification**: Automatic spoken language detection
- **Speaker Diarization**: Speaker segmentation and identification
- **Audio Tagging**: Audio event classification
- **Audio Denoising**: Noise reduction for audio streams

### Platform Support
- **iOS**: Native TurboModule integration with dual old/new architecture support
- **Android**: Native module with 16KB page alignment compliance
- **Web**: Full WASM feature parity with live microphone support, HuggingFace CDN model loading, and dynamic base path detection for non-root deployments

### Infrastructure
- Model management system with archive support and on-demand downloading
- Native integration testing framework
- React Native new architecture (TurboModules) compatibility
- Expo SDK 54+ / React Native 0.81+ / React 19.1+ support

## [0.2.0] - 2025-05-04
- Initial npm release with core TTS and ASR functionality

## [0.1.0] - 2025-03-04
- Initial development release

[unreleased]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@1.1.0-beta.2...HEAD
[1.1.0-beta.2]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@1.0.0...@siteed/sherpa-onnx.rn@1.1.0-beta.2
[1.0.0]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@0.2.0...@siteed/sherpa-onnx.rn@1.0.0
[0.2.0]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@0.1.0...@siteed/sherpa-onnx.rn@0.2.0
[0.1.0]: https://github.com/deeeed/audiolab/releases/tag/@siteed/sherpa-onnx.rn@0.1.0
