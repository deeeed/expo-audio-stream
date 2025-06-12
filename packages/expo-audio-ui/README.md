<div align="center">
  <h1 align="center">
    @siteed/expo-audio-studio-ui
  </h1>
  <p>
  <strong>@siteed/expo-audio-studio-ui<strong> is a UI component library designed to complement the @siteed/expo-audio-studio library for real-time audio processing and streaming.
  </p>
  <div align="center">
    <b>Storybook</b>
    <p><a href="https://deeeed.github.io/expo-audio-stream/expo-audio-ui-storybook">https://deeeed.github.io/expo-audio-stream/expo-audio-ui-storybook</a></p>
  </div>
  <a href="https://deeeed.github.io/expo-audio-stream/playground/">
    <img src="../../docs/demo.gif" alt="Screenshot Playground">
  </a>
</div>

## Features

- Customizable UI components for real-time audio streaming.
- Intuitive interfaces for audio controls and visualizations.
- Seamless integration with @siteed/expo-audio-studio.
- Support for iOS, Android, and web platforms.

## Currently Available Components

- **AudioVisualizer**: A powerful component for visualizing audio waveforms with extensive customization options, including interactive navigation, amplitude scaling, and theming.
- **DecibelGauge**: A gauge component for displaying audio levels in decibels with various formatting options and customizable appearance.
- **DecibelMeter**: A linear meter component for displaying audio levels in decibels with customizable appearance and thresholds.
- **RecordButton**: A button component specifically designed for audio recording with visual feedback and animated transitions.
- **Waveform**: A lightweight component for rendering audio waveforms with customizable styling options.
- **AudioTimeRangeSelector**: A component for selecting a time range within an audio file with interactive handles.

## Upcoming Components

The following components are currently in development:

- **NavigationControls**: Advanced controls for audio navigation and playback
- **EmbeddingVisualizer**: Visualization tools for audio embeddings and feature vectors
- **YAxis**: Customizable Y-axis component for audio visualizations
- **SkiaTimeRuler**: High-performance time ruler component using Skia
- **AnimatedCandle**: Animated visualization for audio levels

## Installation

```bash
# Install the UI components package
npm install @siteed/expo-audio-ui

# or with yarn
yarn add @siteed/expo-audio-ui
```

Make sure you have the required peer dependencies installed:

```bash
npm install @shopify/react-native-skia react-native-gesture-handler react-native-reanimated
```

## Development Status

This package is currently under active development and is primarily used for testing purposes. The API and features are subject to change. Future updates will focus on optimization and expanding the component library with additional audio visualization and control components.

## Development

### Storybook

This package uses Storybook v9 for component development and documentation.

```bash
# Run Storybook locally (web-only)
cd packages/expo-audio-ui
yarn storybook
# Opens at http://localhost:6068
```

**Note**: Currently using React 18.3.1 for Storybook compatibility. React Native Storybook support is planned for future releases.

## Documentation

For detailed documentation and usage instructions, please refer to the [Getting Started Guide](https://deeeed.github.io/expo-audio-stream/docs/).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
<sub>Created by [Arthur Breton](https://siteed.net) • See more projects at [siteed.net](https://siteed.net)</sub>
