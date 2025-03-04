---
id: extract-mel-spectrogram
title: extractMelSpectrogram
sidebar_label: extractMelSpectrogram
---

# extractMelSpectrogram

The `extractMelSpectrogram` function generates a mel spectrogram from an audio file. Mel spectrograms are frequency-domain representations of audio that are particularly useful for machine learning applications and audio visualization.

## Syntax

```typescript
async function extractMelSpectrogram(options: MelSpectrogramOptions): Promise<MelSpectrogramResult>
```

## Parameters

The function accepts a single object with the following properties:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `fileUri` | string | Yes | - | Path to the audio file to analyze |
| `windowSizeMs` | number | No | 25 | Window size in milliseconds for the STFT |
| `hopLengthMs` | number | No | 10 | Hop length in milliseconds between consecutive frames |
| `nMels` | number | No | 40 | Number of mel bands to generate |
| `fMin` | number | No | 0 | Lowest frequency (in Hz) |
| `fMax` | number | No | 22050 | Highest frequency (in Hz). If null, use sampleRate/2 |
| `normalize` | boolean | No | true | Whether to normalize the spectrogram |

## Return Value

The function returns a Promise that resolves to a `MelSpectrogramResult` object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `melSpectrogram` | number[][] | 2D array containing the mel spectrogram values |
| `timeAxis` | number[] | Time values for each frame (in seconds) |
| `freqAxis` | number[] | Frequency values for each mel band (in Hz) |
| `durationMs` | number | Duration of the audio in milliseconds |
| `sampleRate` | number | Sample rate of the audio in Hz |
| `windowSizeMs` | number | Window size used for the STFT in milliseconds |
| `hopLengthMs` | number | Hop length used between consecutive frames in milliseconds |
| `nMels` | number | Number of mel bands generated |

## Example

```typescript
import { extractMelSpectrogram } from '@siteed/expo-audio-studio';

async function generateMelSpectrogram() {
  try {
    const result = await extractMelSpectrogram({
      fileUri: 'path/to/audio.wav',
      windowSizeMs: 25,
      hopLengthMs: 10,
      nMels: 40,
      fMin: 20,
      fMax: 8000,
      normalize: true
    });
    
    console.log(`Generated mel spectrogram with ${result.melSpectrogram.length} frames`);
    console.log(`Each frame has ${result.melSpectrogram[0].length} mel bands`);
    console.log(`Time range: ${result.timeAxis[0]}s to ${result.timeAxis[result.timeAxis.length-1]}s`);
    console.log(`Frequency range: ${result.freqAxis[0]}Hz to ${result.freqAxis[result.freqAxis.length-1]}Hz`);
    
    // Use the mel spectrogram data for visualization or machine learning
    return result;
  } catch (error) {
    console.error('Error generating mel spectrogram:', error);
    throw error;
  }
}
```

## Visualization Example

Here's an example of how to visualize the mel spectrogram using the `@siteed/expo-audio-ui` package:

```typescript
import React from 'react';
import { View } from 'react-native';
import { MelSpectrogramVisualizer } from '@siteed/expo-audio-ui';
import { extractMelSpectrogram } from '@siteed/expo-audio-studio';

const SpectrogramView = ({ audioUri }) => {
  const [spectrogramData, setSpectrogramData] = React.useState(null);
  
  React.useEffect(() => {
    async function loadSpectrogram() {
      if (audioUri) {
        const data = await extractMelSpectrogram({
          fileUri: audioUri,
          nMels: 80,
          windowSizeMs: 25,
          hopLengthMs: 10
        });
        setSpectrogramData(data);
      }
    }
    
    loadSpectrogram();
  }, [audioUri]);
  
  if (!spectrogramData) {
    return <View style={{ height: 200 }} />;
  }
  
  return (
    <MelSpectrogramVisualizer
      data={spectrogramData.melSpectrogram}
      height={200}
      width="100%"
      colorMap="viridis"
    />
  );
};

export default SpectrogramView;
```

## Performance Considerations

- Generating mel spectrograms is computationally intensive, especially for longer audio files
- Consider using a lower number of mel bands (e.g., 40 instead of 128) for better performance
- The `windowSizeMs` and `hopLengthMs` parameters affect both the resolution and the computation time
- For real-time applications, process shorter audio segments or use lower resolution parameters 