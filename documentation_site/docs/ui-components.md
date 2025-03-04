---
id: ui-components
title: UI Components
sidebar_label: UI Components
---

# UI Components

The [@siteed/expo-audio-ui](https://github.com/deeeed/expo-audio-stream/tree/main/packages/expo-audio-ui) package provides ready-to-use UI components for audio applications. These components are built with React Native, Reanimated, and Skia for optimal performance across platforms.

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

## Available Components

The package currently includes the following components:

### AudioVisualizer

A powerful component for visualizing audio waveforms with extensive customization options. Features include:

- Waveform visualization with customizable appearance
- Interactive navigation and selection
- Support for both static and live audio data
- Amplitude scaling options (normalized, absolute, or human voice range)
- Optional decibel visualization
- Customizable themes

### DecibelGauge

A gauge component for displaying audio levels in decibels with various formatting options:

- Support for different decibel formats (dBFS, dB SPL, dBA, dBC)
- Customizable appearance with themes
- Optional tick marks, value display, and needle
- Configurable min/max ranges

## Usage Example: AudioVisualizer

Here's a simple example of using the AudioVisualizer component:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AudioVisualizer } from '@siteed/expo-audio-ui';
import { extractAudioAnalysis } from '@siteed/expo-audio-stream';

const AudioWaveform = ({ audioUri }) => {
  const [audioData, setAudioData] = React.useState(null);
  
  React.useEffect(() => {
    async function loadAudioData() {
      if (audioUri) {
        const analysis = await extractAudioAnalysis({
          fileUri: audioUri,
          features: { rms: true }
        });
        setAudioData(analysis);
      }
    }
    
    loadAudioData();
  }, [audioUri]);
  
  if (!audioData) {
    return <View style={styles.container} />;
  }
  
  return (
    <View style={styles.container}>
      <AudioVisualizer
        audioData={audioData}
        canvasHeight={150}
        candleWidth={3}
        candleSpace={1}
        showRuler={true}
        showNavigation={true}
        amplitudeScaling="normalized"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 150,
    width: '100%',
  },
});

export default AudioWaveform;
```

## Usage Example: DecibelGauge

Here's how to use the DecibelGauge component:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DecibelGauge } from '@siteed/expo-audio-ui';

const AudioLevelMeter = ({ level }) => {
  return (
    <View style={styles.container}>
      <DecibelGauge
        db={level}
        inputFormat="dBFS"
        showTickMarks={true}
        showValue={true}
        theme={{
          minDb: -60,
          maxDb: 0,
          colors: {
            needle: '#FF3B30',
            progress: '#007AFF',
            high: '#FF9500'
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});

export default AudioLevelMeter;
```

## Development Status

This package is currently under active development. More components will be added in future releases. The current focus is on providing robust visualization tools for audio data.

## Storybook

The package includes a Storybook with examples of all components. You can run it locally:

```bash
cd packages/expo-audio-ui
yarn storybook
```

Or view it online at [https://deeeed.github.io/expo-audio-stream/expo-audio-ui-storybook](https://deeeed.github.io/expo-audio-stream/expo-audio-ui-storybook).

## Contributing

Contributions to the UI components package are welcome! Please see the [contributing guidelines](https://github.com/deeeed/expo-audio-stream/blob/main/CONTRIBUTING.md) for more information. 