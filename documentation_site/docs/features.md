---
id: features
title: Features
sidebar_label: Features
---

## Features

- Real-time audio streaming across iOS, Android, and web.
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
