---
id: features
title: Features
sidebar_label: Features
---

# Key Features

`@siteed/expo-audio-studio` provides a comprehensive set of audio recording, processing, and analysis features that work consistently across iOS, Android, and web platforms:

## Recording Features

- **Real-time audio streaming** with configurable quality settings across all platforms
- **Zero-latency recording** with [prepareRecording](api-reference/recording-config.md#zero-latency-recording) API to eliminate startup delay
- **Dual-stream recording** with simultaneous raw PCM and [compressed formats](api-reference/recording-config.md#compression-settings) (OPUS/AAC)
- **Intelligent interruption handling** with automatic pause/resume during phone calls
- **Background recording** support with keep-awake functionality
- **Rich notification system** with live waveform visualization (Android) and media controls

## Audio Processing

- **Comprehensive [audio analysis](api-reference/audio-features/audio-analysis-overview.md)** with feature extraction (energy, RMS, MFCC, etc.)
- **[Mel spectrogram generation](api-reference/audio-processing/extract-mel-spectrogram.md)** for machine learning and visualization
- **Precision [audio trimming](api-reference/audio-processing/trim-audio.md)** with multi-segment support
- **Format conversion** and normalization capabilities

## Platform Integration

- **Automated permissions** setup in managed Expo projects
- **Consistent WAV PCM** format across platforms
- **Native optimizations** for each platform's audio architecture:
  - Web: AudioWorkletProcessor for real-time processing
  - Android: Native AudioRecord API
  - iOS: AVAudioEngine with automatic sample rate adaptation

## User Interface

- Ready-to-use UI components via [@siteed/expo-audio-ui](https://github.com/deeeed/expo-audio-stream/tree/main/packages/expo-audio-ui) package
- Visualizations, waveforms, and interactive audio controls
- Full-featured AudioPlayground application showcasing API usage

For detailed API documentation and usage examples, explore the [API Reference](api-reference/api-intro.md) section.
