# @siteed/expo-audio-studio

[![kandi X-Ray](https://kandi.openweaver.com/badges/xray.svg)](https://kandi.openweaver.com/typescript/siteed/expo-audio-studio)
[![Version](https://img.shields.io/npm/v/@siteed/expo-audio-studio.svg)](https://www.npmjs.com/package/@siteed/expo-audio-studio)
[![Dependency Status](https://img.shields.io/npm/dt/@siteed/expo-audio-studio.svg)](https://www.npmjs.com/package/@siteed/expo-audio-studio)
[![License](https://img.shields.io/npm/l/@siteed/expo-audio-studio.svg)](https://www.npmjs.com/package/@siteed/expo-audio-studio)

<div align="center">
  <p align="center">
    <strong>Comprehensive audio studio library for React Native and Expo with recording, analysis, visualization, and streaming capabilities across iOS, Android, and web platforms.</strong>
  </p>

  <div style="display: flex; justify-content: center; gap: 20px; margin: 30px 0;">
    <div>
      <h3>iOS Demo</h3>
      <img src="../../docs/ios.gif" alt="iOS Demo" width="280" />
    </div>
    <div>
      <h3>Android Demo</h3>
      <img src="../../docs/android.gif" alt="Android Demo" width="280" />
    </div>
  </div>

  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;">
    <p><strong>Try AudioPlayground: Complete audio processing app built with this library</strong></p>
    <div style="display: flex; justify-content: center; gap: 20px; margin: 10px 0;">
      <a href="https://apps.apple.com/app/audio-playground/id6739774966">
        <img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="Download on the App Store" height="40" />
      </a>
      <a href="https://play.google.com/store/apps/details?id=net.siteed.audioplayground">
        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="40" />
      </a>
    </div>
  </div>

  <a href="https://deeeed.github.io/expo-audio-stream/playground" style="text-decoration:none;">
    <div style="display:inline-block; padding:10px 20px; background-color:#007bff; color:white; border-radius:5px; font-size:16px;">
      Try it in the Playground
    </div>
  </a>
</div>

**Give it a GitHub star 🌟, if you found this repo useful.**
[![GitHub stars](https://img.shields.io/github/stars/deeeed/expo-audio-stream.svg?style=social&label=Star&maxAge=2592000)](https://github.com/deeeed/expo-audio-stream)

> **Note:** This package was formerly known as `@siteed/expo-audio-stream`. The name has been changed to better reflect the expanded capabilities beyond just audio streaming.

## Features

- Real-time audio streaming across iOS, Android, and web.
- Audio input device detection and selection:
  - List and select from available audio input devices
  - View detailed device capabilities (sample rates, channels, bit depths)
  - Support for Bluetooth, USB, and wired devices
  - Automatic device management with fallback options
  - Intelligent detection refresh for Bluetooth devices
- Dual-stream recording capabilities:
  - Simultaneous raw PCM and compressed audio recording
  - Compression formats: OPUS or AAC
  - Configurable bitrate for compressed audio
  - Optimized storage for both high-quality and compressed formats
- Intelligent interruption handling:
  - Automatic pause/resume during phone calls
  - Configurable automatic resumption
  - Detailed interruption event callbacks
- Configurable intervals for audio buffer receipt.
- Automated microphone permissions setup in managed Expo projects.
- Background audio recording on iOS.
- Audio features extraction during recording.
- Consistent WAV PCM recording format across all platforms.
- Keep recording active while app is in background
- Zero-latency recording with preparation API:
  - Pre-initialize audio recording to eliminate startup delay
  - Prepare permissions, audio buffers, and sessions in advance
  - Start recording instantly when needed
- Rich notification system for recording status:
  - Android: Live waveform visualization in notifications
  - Android: Fully customizable notification appearance and actions
  - iOS: Media player integration
- Advanced audio analysis capabilities:
  - Mel spectrogram generation for machine learning and visualization
  - Comprehensive audio feature extraction (MFCC, spectral features, etc.)
  - Lightweight waveform preview generation
- Precision audio manipulation:
  - Advanced audio splitting and trimming API
  - Support for trimming multiple segments in a single operation
  - Ability to keep or remove specific time ranges
- Complete ecosystem:
  - Full-featured AudioPlayground application showcasing advanced API usage
  - Ready-to-use UI components via [@siteed/expo-audio-ui](https://github.com/deeeed/expo-audio-stream/tree/main/packages/expo-audio-ui) package
  - Visualizations, waveforms, and audio controls that can be directly incorporated into your app

## Audio Analysis Features

Extract powerful audio features for advanced audio processing and visualization:

```typescript
// Extract audio analysis with specific features enabled
const analysis = await extractAudioAnalysis({
  fileUri: 'path/to/recording.wav',
  features: {
    energy: true,     // Overall energy of the audio
    rms: true,        // Root mean square (amplitude)
    zcr: true,        // Zero-crossing rate
    mfcc: true,       // Mel-frequency cepstral coefficients
    spectralCentroid: true,  // Brightness of sound
    tempo: true,      // Estimated BPM
  }
});
```

### Available Audio Features

- **Basic Analysis**: RMS, energy, amplitude range, zero-crossing rate
- **Spectral Features**: Spectral centroid, flatness, rolloff, bandwidth
- **Advanced Analysis**: 
  - MFCC (Mel-frequency cepstral coefficients)
  - Chromagram (pitch class representation)
  - Mel Spectrogram
  - Harmonics-to-noise ratio
  - Tempo estimation
  - Pitch detection

### Use Cases

- Visualize audio waveforms with detailed metrics
- Implement speech recognition preprocessing
- Create music analysis applications
- Build audio fingerprinting systems
- Develop voice activity detection

## API Overview

The library provides several specialized APIs for different audio processing needs:

### Recording and Playback

- **useAudioRecorder**: Hook for recording audio with configurable quality settings
- **AudioRecorderProvider**: Context provider for sharing recording state across components
- **useSharedAudioRecorder**: Hook to access shared recording state from any component

```typescript
// Start a new recording with configuration
const { startRecording, stopRecording, isRecording, recordingUri } = useAudioRecorder({
  audioQuality: 'high',
  sampleRate: 44100,
  numberOfChannels: 2,
  bitDepth: 16,
  outputFormat: 'wav',
});

// Use the prepare API for zero-latency recording
const { prepareRecording, startRecording, stopRecording } = useSharedAudioRecorder();

// First prepare the recording - this initializes all resources
await prepareRecording({
  sampleRate: 44100,
  channels: 2,
  encoding: 'pcm_16bit'
});

// Later when needed, start instantly with no delay
await startRecording(/* same config as prepare */);

// Share recording state across components
const AudioApp = () => (
  <AudioRecorderProvider>
    <RecordButton />
    <AudioVisualizer />
  </AudioRecorderProvider>
);
```

### Audio Analysis

- **extractAudioAnalysis**: Extract comprehensive audio features for detailed analysis
- **extractPreview**: Generate lightweight waveform data for visualization
- **extractAudioData**: Extract raw PCM data for custom processing
- **extractRawWavAnalysis**: Analyze WAV files without decoding, preserving original PCM values

```typescript
// Extract detailed audio analysis with feature extraction
const analysis = await extractAudioAnalysis({
  fileUri: 'path/to/recording.wav',
  features: { rms: true, zcr: true, mfcc: true }
});

// Generate a lightweight waveform preview
const preview = await extractPreview({
  fileUri: 'path/to/recording.wav',
  pointsPerSecond: 50
});

// Extract raw PCM data for custom processing
const audioData = await extractAudioData({
  fileUri: 'path/to/recording.wav',
  includeWavHeader: true
});
```

#### Choosing the Right Audio Analysis Method

| Method | Purpose | Performance | Use When |
|--------|---------|-------------|----------|
| `extractAudioAnalysis` | Comprehensive audio feature extraction | Medium-Heavy | You need detailed audio features like MFCC, spectral features |
| `extractPreview` | Lightweight waveform visualization | Very Light | You only need amplitude data for visualization |
| `extractAudioData` | Raw PCM data extraction | Medium | You need the raw audio data for custom processing |
| `extractRawWavAnalysis` | WAV analysis without decoding | Light | You want to analyze WAV files while preserving original values |
| `extractMelSpectrogram` | Mel spectrogram generation | Heavy | You need frequency-domain representation for ML or visualization |

### Specialized Audio Processing

- **extractMelSpectrogram**: Generate mel spectrogram for audio visualization or ML models
- **trimAudio**: Trim audio files with precision, supporting multiple segments and formats

```typescript
// Generate mel spectrogram for audio visualization or ML models
const melSpectrogram = await extractMelSpectrogram({
  fileUri: 'path/to/recording.wav',
  windowSizeMs: 25,
  hopLengthMs: 10,
  nMels: 40
});

// Trim audio files with precision
const trimmedAudio = await trimAudio({
  fileUri: 'path/to/recording.wav',
  startTimeMs: 1000,
  endTimeMs: 5000,
  outputFormat: { format: 'wav' }
});

// Trim multiple segments from an audio file
const compiledAudio = await trimAudio({
  fileUri: 'path/to/recording.wav',
  mode: 'keep',
  ranges: [
    { startTimeMs: 1000, endTimeMs: 5000 },
    { startTimeMs: 10000, endTimeMs: 15000 }
  ]
});
```

### Utility Functions

- **convertPCMToFloat32**: Convert PCM data to Float32Array for processing
- **getWavFileInfo**: Extract metadata from WAV files
- **writeWavHeader**: Create WAV headers for raw PCM data

### Low-Level Access

For advanced use cases, the library provides direct access to the native module:

```typescript
import { ExpoAudioStreamModule } from '@siteed/expo-audio-studio';

// Access platform-specific functionality
const status = await ExpoAudioStreamModule.status();
const permissions = await ExpoAudioStreamModule.getPermissionsAsync();
```

## Documentation

For detailed documentation, please refer to the [Getting Started Guide](https://deeeed.github.io/expo-audio-stream/docs/).

For developers interested in contributing or debugging the library, please see the [Contribution Guide](./CONTRIBUTE.md).

## Companion Resources

### AudioPlayground Application

The repository includes a complete AudioPlayground application that demonstrates advanced usage of the API. This playground serves as both a demonstration and a learning resource:

- Interactive examples of all major API features
- Real-time audio visualization and analysis
- Code samples you can directly reference for your own implementation

Try it online at [https://deeeed.github.io/expo-audio-stream/playground](https://deeeed.github.io/expo-audio-stream/playground) or run it locally from the repository.

### UI Components Package

The [@siteed/expo-audio-ui](https://github.com/deeeed/expo-audio-stream/tree/main/packages/expo-audio-ui) package provides ready-to-use UI components for audio applications:

```bash
# Install the UI components package
npm install @siteed/expo-audio-ui

# or with yarn
yarn add @siteed/expo-audio-ui
```

This package includes:
- Waveform visualizers
- Audio recording controls
- Playback components
- Spectrogram displays
- And more!

All components are built with React Native, Reanimated, and Skia for optimal performance across platforms.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<sub>Created by [Arthur Breton](https://siteed.net) • See more projects at [siteed.net](https://siteed.net)</sub>
