# Monorepo for @siteed/expo-audio

This monorepo contains two packages:
- `@siteed/expo-audio-stream`
- `@siteed/expo-audio-ui`

**Give it a GitHub star 🌟, if you found this repo useful.**
[![GitHub stars](https://img.shields.io/github/stars/deeeed/expo-audio-stream.svg?style=social&label=Star&maxAge=2592000)](https://github.com/deeeed/expo-audio-stream)

<div align="center">
  <h2>Try them out</h2>
  <p><a href="https://deeeed.github.io/expo-audio-stream">https://deeeed.github.io/expo-audio-stream</a></p>
</div>

## Packages

### 1. `@siteed/expo-audio-stream`

`@siteed/expo-audio-stream` is a comprehensive library designed to facilitate real-time audio processing and streaming across iOS, Android, and web platforms.

For more details, please refer to the [README](packages/expo-audio-stream/README.md) of the package.

### 2. `@siteed/expo-audio-ui`

`@siteed/expo-audio-ui` provides UI components to visualize audio data processed by `@siteed/expo-audio-stream`.

For more details, please refer to the [README](packages/expo-audio-ui/README.md) of the package.

### 3. `@siteed/react-native-essentia`

`@siteed/react-native-essentia` provides React Native bindings for the [Essentia audio analysis library](https://essentia.upf.edu/), enabling advanced audio feature extraction on mobile platforms.

Key features:
- Advanced audio analysis algorithms (MFCC, Key, Spectrum, etc.)
- Native implementation using C++ for high performance
- Cross-platform support for iOS and Android

For more details, please refer to the [README](packages/react-native-essentia/README.md) of the package.


## Roadmap

- [x] Automate Changelog generation on monorepo.
- [x] Implement dual audio stream (one RAW for analysis, one compressed for playback).
- [x] Intelligent call interruption handling
- [x] Integrate with react-native-whisper for real-time on device transcriptions. (demo in playground)
- [x] Migrate audio analysis to c++ native library (implemented in @siteed/react-native-essentia)
- [ ] Implement example app for custom VAD.
- [ ] Audio preview waveform component from 'uri'. ( similar to https://github.com/SimformSolutionsPvtLtd/react-native-audio-waveform  )
- [ ] e2e validation for cross platform features extraction (make sure we get exact same values on all platforms).
- [ ] Speaker Diarization example app.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<sub>Created by [Arthur Breton](https://siteed.net) • See more projects at [siteed.net](https://siteed.net)</sub>
