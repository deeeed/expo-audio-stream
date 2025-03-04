---
id: playground
title: Playground Application
sidebar_label: Playground Application
---

# Playground Application

![Playground App on WEB](/img/playground_web.png)

<div style={{display: "flex", justifyContent: "center", gap: "20px", margin: "30px 0"}}>
  <div>
    <h3>iOS Demo</h3>
    <img src={require('@site/static/img/ios.gif').default} alt="iOS Demo" width={280} />
  </div>
  <div>
    <h3>Android Demo</h3>
    <img src={require('@site/static/img/android.gif').default} alt="Android Demo" width={280} />
  </div>
</div>

The playground application is a showcase for the `@siteed/expo-audio-stream` library. It demonstrates the various features of the library and provides visualizations for different audio features.

## Features

The playground app includes the following features:

- **Real-time Audio Streaming**: Stream audio data in real-time across different platforms.
- **Audio Visualization**: Visualize audio waveforms and other audio features such as energy, RMS, and spectral data.
- **Feature Extraction**: Extract and display various audio features such as MFCC, chromagram, and tempo.
- **Audio Transcription**: Convert recorded audio to text using advanced speech recognition capabilities.
- **Interactive Controls**: Control audio recording and playback interactively.
- **Mel Spectrogram Generation**: Visualize mel spectrograms for audio analysis and machine learning applications.
- **Audio Trimming and Splitting**: Demonstrate precision audio manipulation with the trimming API.
- **Dual-stream Recording**: Showcase simultaneous raw PCM and compressed audio recording.
- **Advanced Audio Analysis**: Display comprehensive audio features including spectral centroid, flatness, and pitch detection.
- **Notification Controls**: Demonstrate rich notification systems with live waveform visualization on Android.

## Usage

To access the playground app, visit the following URL:

[Playground Application](https://deeeed.github.io/expo-audio-stream/playground/)

To try it locally, follow the steps below:

```bash
git clone https://github.com/deeeed/expo-audio-stream.git
cd expo-audio-stream
yarn
yarn apps/playground ios
yarn apps/playground android
yarn apps/playground web
```

## Example Use Cases

The playground app can be used for the following purposes:

1. **Demonstrating Library Capabilities**: Show the real-time audio processing and feature extraction capabilities of the `@siteed/expo-audio-stream` library.
2. **Visualizing Audio Features**: Display and analyze various audio features extracted from real-time audio data.
3. **Interactive Testing**: Provide an interactive environment to test and experiment with different configurations and features of the library.
4. **Speech-to-Text Applications**: Test audio transcription capabilities for voice commands, dictation, or accessibility features.
5. **Learning Resource**: Serve as a code reference for implementing advanced audio features in your own applications.
6. **Performance Benchmarking**: Test the performance of audio processing across different platforms and devices.

## UI Components

The playground also showcases the ready-to-use UI components available in the [@siteed/expo-audio-ui](https://github.com/deeeed/expo-audio-stream/tree/main/packages/expo-audio-ui) package, including:

- Waveform visualizers
- Recording controls
- Playback components
- Spectrogram displays
- Audio analysis visualizations
- Transcription displays

These components can be directly incorporated into your own applications for a polished audio experience.
