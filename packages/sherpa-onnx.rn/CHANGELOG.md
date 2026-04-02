# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Android**: Refresh vendored sherpa-onnx baseline to upstream `v1.12.34`
- **Android**: `build-sherpa-android.sh` now syncs rebuilt prebuilts into the shipped `android/src/main/jniLibs`
- **Android**: local Kotlin wrappers are now resynced from vendored upstream files through `android/scripts/sync-kotlin-api.sh` and `patches/KotlinApiOverrides.patch`
- **iOS**: `build-sherpa-ios.sh` now discovers the built ONNX Runtime directory instead of hardcoding `1.17.1`

### Validation
- **Android**: Refreshed arm64 Sherpa runtime now links against ONNX Runtime `VERS_1.23.0`
- **Android**: Mixed Sherpa + Moonshine builds now pass the ORT compatibility check and the mixed-engine sample validation recipe when both are aligned to `VERS_1.23.0`

## [1.1.2] - 2026-03-30

### Changed
- **Web Worker**: Shared singleton worker — all features (ASR, TTS, VAD, diarization, denoising) share one Web Worker thread
- **Web Worker**: `configureSherpaOnnx({ useWorker: false })` disables worker offloading for debugging
- **Web Worker**: Lazy WASM load — WASM binary is fetched only on first feature use, not at import time
- **Web Worker**: Configurable model filenames via worker init options
- **Web Worker**: Clean transferable handling for Float32Array buffers across worker boundary
- **Web Worker**: Bootstrap blob pattern — worker is always loaded via a tiny blob that `importScripts()` the real script, avoiding cross-origin restrictions without try/catch fallbacks

## [1.1.1] - 2026-03-30

### Fixed
- **Android**: Offline Whisper now chunks long files into 29-second windows instead of truncating after ~30 seconds
- **Android**: File-window extraction (`extractAudioWindowFromFile`) prevents OOM on long-file ASR by decoding only the needed segment
- **Android**: Diarization extraction resamples to the model's native sample rate (e.g. 48 kHz -> 16 kHz), avoiding 3x oversized float buffers
- **Android**: Skip redundant buffer copy when extracted audio is already at exact final size, eliminating a hidden ~115 MB allocation on long files
- **Android**: JNI callback interface (`OfflineSpeakerDiarizationCallback.java`) matches the native `invoke(IIJ)Ljava/lang/Integer;` signature, fixing SIGABRT on first diarization progress callback

## [1.1.0] - 2026-03-28

### Added
- **Web/WASM**: Zero-config CDN distribution via jsDelivr — all features work in browser
- `loadWasmModule()` with non-blocking fire-and-forget pattern and `onProgress` callback
- `configureSherpaOnnx()` API for self-hosting WASM files
- `isSherpaOnnxReady()` / `waitForReady()` for readiness gating
- Offline ASR on web (whisper, moonshine, paraformer, sense_voice, etc.)
- `dolphin` model type support
- Generic ONNX inference support (iOS handler, Kotlin, TS API, web)

### Fixed
- **Android kotlin version mismatch**: `build.gradle` uses `safeExtGet`/`getKotlinVersion` — consumers no longer need `kotlin.jvm.target.validation.mode=WARNING`
- README rewritten with correct API examples (`TTS.initialize()`, `ASR.initialize()`, etc.)
- `docs/` directory now shipped in npm package (fixes dead links in README)
- iOS modulemap onnxruntime header path fix
- `modelFiles` made optional in `AsrModelConfig`
- `OFFLINE_ONLY_TYPES` aligned with full model type union
- Removed stale docs: `COMPATIBILITY.md`, `docs/architecture/`, `docs/integration/`
- Removed hallucinated API examples and GitHub links from docs

### Changed
- Prebuilts v1.12.29, fix install.js, WASM path fixes
- Add prebuilt .so files for production builds
- Narrow Commons Compress R8 keep rules

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

[unreleased]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@1.1.2...HEAD
[1.1.2]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@1.1.1...@siteed/sherpa-onnx.rn@1.1.2
[1.1.1]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@1.1.0...@siteed/sherpa-onnx.rn@1.1.1
[1.1.0]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@1.0.0...@siteed/sherpa-onnx.rn@1.1.0
[1.0.0]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@0.2.0...@siteed/sherpa-onnx.rn@1.0.0
[0.2.0]: https://github.com/deeeed/audiolab/compare/@siteed/sherpa-onnx.rn@0.1.0...@siteed/sherpa-onnx.rn@0.2.0
[0.1.0]: https://github.com/deeeed/audiolab/releases/tag/@siteed/sherpa-onnx.rn@0.1.0
