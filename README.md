# Monorepo for @siteed/expo-audio

This monorepo contains the following packages:
- `@siteed/expo-audio-studio` (formerly `@siteed/expo-audio-stream`)
- `@siteed/expo-audio-ui`
- `@siteed/react-native-essentia`
- `@siteed/sherpa-onnx.rn` (in development)

**Give it a GitHub star 🌟, if you found this repo useful.**
[![GitHub stars](https://img.shields.io/github/stars/deeeed/expo-audio-stream.svg?style=social&label=Star&maxAge=2592000)](https://github.com/deeeed/expo-audio-stream)

## ❤️ Support This Project

Love this repo? Support my journey in audio, AI, & blockchain, and help fund new tools! Sponsor me.

[![Sponsor this project](https://img.shields.io/github/sponsors/deeeed?label=Sponsor&logo=GitHub)](https://github.com/sponsors/deeeed)

<div align="center">
  <h2>Try them out</h2>
  <p><a href="https://deeeed.github.io/expo-audio-stream">https://deeeed.github.io/expo-audio-stream</a></p>
</div>

## Example Applications

The monorepo includes several example applications in the `/apps` directory that demonstrate different use cases and integration patterns:

### Audio Playground

A fully-featured showcase app that demonstrates the capabilities of all the libraries. The audio playground app is available on app stores and serves as a comprehensive showcase of audio processing features, UI components, and integrations.

Key features:
- Real-world implementation of all monorepo libraries
- Audio recording, processing, and visualization
- Speech recognition and audio analysis examples
- Available on iOS and Android app stores

<div align="center">
  <p>Try it now:</p>
  <div style="display: flex; justify-content: center; gap: 20px; margin: 10px 0;">
    <a href="https://apps.apple.com/app/audio-playground/id6739774966">
      <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="Download on the App Store" height="40" />
    </a>
    <a href="https://play.google.com/store/apps/details?id=net.siteed.audioplayground">
      <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="40" />
    </a>
  </div>
  <p>Or try the web version at <a href="https://deeeed.github.io/expo-audio-stream/playground/">https://deeeed.github.io/expo-audio-stream/playground/</a></p>
</div>

### Sherpa-ONNX Demo

A focused demo showcasing the integration of the Sherpa-ONNX speech recognition and text-to-speech capabilities.

Try it at [https://deeeed.github.io/expo-audio-stream/sherpa-onnx-demo/](https://deeeed.github.io/expo-audio-stream/sherpa-onnx-demo/)

### Essentia Demo

A specialized app demonstrating the advanced audio analysis features of the Essentia library integration.

### Minimal Example

A stripped-down implementation showing the bare minimum required to integrate the audio libraries, perfect for developers who want to understand the core concepts without additional complexity.

## Packages

### 1. `@siteed/expo-audio-studio`

`@siteed/expo-audio-studio` (formerly `@siteed/expo-audio-stream`) is a comprehensive library designed to facilitate real-time audio processing and streaming across iOS, Android, and web platforms.

For more details, please refer to the [README](packages/expo-audio-studio/README.md) of the package.

### 2. `@siteed/expo-audio-ui`

`@siteed/expo-audio-ui` provides UI components to visualize audio data processed by `@siteed/expo-audio-studio`.

For more details, please refer to the [README](packages/expo-audio-ui/README.md) of the package.

### 3. `@siteed/react-native-essentia`

`@siteed/react-native-essentia` provides React Native bindings for the [Essentia audio analysis library](https://essentia.upf.edu/), enabling advanced audio feature extraction on mobile platforms.

Key features:
- Advanced audio analysis algorithms (MFCC, Key, Spectrum, etc.)
- Native implementation using C++ for high performance
- Cross-platform support for iOS and Android

For more details, please refer to the [README](packages/react-native-essentia/README.md) of the package.

### 4. `@siteed/sherpa-onnx.rn`

`@siteed/sherpa-onnx.rn` is a React Native wrapper for the [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) library, providing speech-to-text (STT) and text-to-speech (TTS) capabilities. This package is currently under development.

Key features:
- On-device speech recognition using ONNX models
- Text-to-speech synthesis
- Cross-platform support for iOS, Android, and Web
- Optimized native implementation with web compatibility

For more details, check out the [sherpa-onnx demo](https://deeeed.github.io/expo-audio-stream/sherpa-onnx-demo/) or refer to the package source.

## Roadmap

- [x] Automate Changelog generation on monorepo.
- [x] Implement dual audio stream (one RAW for analysis, one compressed for playback).
- [x] Intelligent call interruption handling
- [x] Integrate with react-native-whisper for real-time on device transcriptions. (demo in playground)
- [x] Migrate audio analysis to c++ native library (implemented in @siteed/react-native-essentia)
- [x] Cross-platform audio device detection, selection, and fallback handling
- [x] Add Zero-Latency Audio Recording with `prepareRecording` API 
- [ ] Setup Beta channel to avoid regressions
- [ ] Improve native code quality and configure sonarcloud to prevent CI errors.
- [ ] Integrate sherpa onnx models into expo-audio-studio and playground
- [ ] Implement example app for custom VAD.
- [ ] Audio preview waveform component from 'uri'. ( similar to https://github.com/SimformSolutionsPvtLtd/react-native-audio-waveform  )
- [ ] e2e validation for cross platform features extraction (make sure we get exact same values on all platforms).
- [ ] Speaker Diarization example app.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<sub>Created by [Arthur Breton](https://siteed.net) • See more projects at [siteed.net](https://siteed.net)</sub>
