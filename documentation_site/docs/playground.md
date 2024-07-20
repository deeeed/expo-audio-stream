---
id: playground
title: Playground Application
sidebar_label: Playground Application
---

# Playground Application

![Playground App on WEB](/img/playground_web.png)

The playground application is a showcase for the `@siteed/expo-audio-stream` library. It demonstrates the various features of the library and provides visualizations for different audio features.


## Features

The playground app includes the following features:

- **Real-time Audio Streaming**: Stream audio data in real-time across different platforms.
- **Audio Visualization**: Visualize audio waveforms and other audio features such as energy, RMS, and spectral data.
- **Feature Extraction**: Extract and display various audio features such as MFCC, chromagram, and tempo.
- **Interactive Controls**: Control audio recording and playback interactively.

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
