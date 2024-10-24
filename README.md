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


## Roadmap

- [ ] Automate Changelog generation on monorepo.
- [ ] Migrate audio analysis to c++ native library (share same logic on web via wasm and Kotlin / Swift for native). 
- [ ] Integrate with react-native-whisper for real-time on device transcriptions.
- [ ] Implement example app for custom VAD.
- [ ] Audio preview waveform component from 'uri'. ( similar to https://github.com/SimformSolutionsPvtLtd/react-native-audio-waveform  )
- [ ] e2e validation for cross platform features extraction (make sure we get exact same values on all platforms).
- [ ] Speaker Diarization example app.
