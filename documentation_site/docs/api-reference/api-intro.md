---
id: api-intro
title: API Intro
sidebar_label: API Intro
---

# API Introduction

> **Note:** `@siteed/expo-audio-studio` requires using an ejected Expo project (bare workflow). See the [Installation](../installation.md) section for details.

This section provides detailed information about the various types, interfaces, and functions provided by the `@siteed/expo-audio-studio` library.

## Overview

The API is divided into the following main categories:

### Recording and Playback

- **[RecordingConfig](recording-config.md)**: Configuration options for recording audio.
- **useAudioRecorder**: Hook for recording audio with configurable quality settings, including:
  - **startRecording**: Begins audio capture with the specified configuration.
  - **stopRecording**: Ends the current recording and returns the result.
  - **pauseRecording**: Temporarily stops audio capture without ending the recording.
  - **resumeRecording**: Continues a paused recording.
  - **prepareRecording**: Pre-initializes recording resources for zero-latency startup.
- **AudioRecorderProvider**: Context provider for sharing recording state across components.
- **useSharedAudioRecorder**: Hook to access shared recording state from any component.

### Events

- **[AudioDataEvent](audio-data-event.md)**: Event data for audio streams.

### Recording Results

- **[AudioRecording](audio-recording.md)**: Result data from a completed audio recording.

### Audio Analysis

- **[Audio Analysis Overview](audio-features/audio-analysis-overview.md)**: Overview of audio analysis capabilities.
- **[AudioAnalysis](audio-features/audio-analysis.md)**: Detailed analysis of recorded audio.
- **[extractAudioAnalysis](audio-features/extract-audio-analysis.md)**: Extract comprehensive audio features for detailed analysis.
- **extractPreview**: Generate lightweight waveform data for visualization.
- **extractAudioData**: Extract raw PCM data for custom processing.
- **extractRawWavAnalysis**: Analyze WAV files without decoding, preserving original PCM values.

### Specialized Audio Processing

- **[extractMelSpectrogram](audio-processing/extract-mel-spectrogram.md)**: Generate mel spectrogram for audio visualization or ML models.
- **[trimAudio](audio-processing/trim-audio.md)**: Trim audio files with precision, supporting multiple segments and formats.

### Utility Functions

- **convertPCMToFloat32**: Convert PCM data to Float32Array for processing.
- **getWavFileInfo**: Extract metadata from WAV files.
- **writeWavHeader**: Create WAV headers for raw PCM data.

---

Click on the links above to navigate to detailed documentation for each component and type. For practical examples, see the [Audio Analysis Example](audio-features/audio-analysis-example.md).

## Key Features

- **Zero-latency recording** with `prepareRecording` for eliminating startup delay in time-critical applications
- **Comprehensive audio analysis** with support for various audio features extraction
- **Cross-platform support** with consistent API across iOS, Android, and web

## UI Components

For ready-to-use UI components, check out the [@siteed/expo-audio-ui](https://github.com/deeeed/expo-audio-stream/tree/main/packages/expo-audio-ui) package, which provides waveform visualizers, recording controls, and more.
