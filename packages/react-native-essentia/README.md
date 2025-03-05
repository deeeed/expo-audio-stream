# React Native Essentia

A React Native wrapper for the Essentia audio analysis library.

## Installation

```bash
npm install react-native-essentia
# or
yarn add react-native-essentia
```

## Features

- Access to Essentia's powerful audio analysis algorithms from React Native
- Support for various categories of audio features:
  - Spectral analysis (MFCC, spectral centroid, etc.)
  - Tonal analysis (key detection, chords, etc.)
  - Rhythm analysis (beat tracking, tempo, etc.)
  - High-level audio features
  - Voice analysis
- Audio file loading and processing
- Both high-level API and low-level access to individual algorithms

## Usage

### Basic Usage

```typescript
import { essentiaAPI } from 'react-native-essentia';

// Initialize the library
await essentiaAPI.initialize();

// Get the version
const version = await essentiaAPI.getVersion();
console.log(`Essentia version: ${version}`);

// Load an audio file
const audioLoaded = await essentiaAPI.loadAudio('/path/to/audio.mp3', 44100);

// Process the audio
await essentiaAPI.processAudio(2048, 1024);

// Execute an algorithm
const mfccResult = await essentiaAPI.spectral.mfcc({
  numberCoefficients: 13,
  numberBands: 40
});

// Clean up
await essentiaAPI.unloadAudio();
```

### Analyzing Audio Segments

To analyze a specific segment of an audio file, you can use the `extractMFCCFromFile` method in combination with `trimAudio` from the `expo-audio-studio` package. This approach allows you to first trim the audio to the segment you want to analyze, and then extract features from that segment.

```typescript
import { essentiaAPI } from 'react-native-essentia';
import { trimAudio } from 'expo-audio-studio';

async function analyzeMFCCFromSegment(audioPath, startMs, endMs) {
  try {
    // First trim the audio to get just the segment we want
    const trimResult = await trimAudio({
      fileUri: audioPath,
      mode: 'single',
      startTimeMs: startMs,
      endTimeMs: endMs
    });

    // Then extract MFCC features from the trimmed segment
    const mfccResult = await essentiaAPI.extractMFCCFromFile({
      audioPath: trimResult.uri,
      sampleRate: 44100,
      numCoeffs: 13,
      numBands: 40,
      cleanup: true // automatically unload audio when done
    });

    if (mfccResult.success) {
      console.log('MFCC features extracted successfully:', mfccResult.features);
      return mfccResult.features;
    } else {
      console.error('Failed to extract MFCC features:', mfccResult.error);
      return null;
    }
  } catch (error) {
    console.error('Error analyzing audio segment:', error);
    return null;
  }
}

// Usage
analyzeMFCCFromSegment(
  '/path/to/audio.mp3',  // Audio file path
  5000,                  // Start time in milliseconds (5 seconds)
  10000                  // End time in milliseconds (10 seconds)
);
```

### Troubleshooting File Loading Issues

If you're having trouble loading audio files, try these steps:

1. Make sure the file path is correct and the file exists
2. Check if the file path needs protocol handling:
   - Android: Remove `file://` prefix if present
   - iOS: Add `file://` prefix if missing

You can use the built-in path normalization:

```typescript
import { normalizeFilePath } from 'react-native-essentia';

const normalizedPath = normalizeFilePath('/path/to/audio.mp3');
// Will handle platform-specific path formatting automatically
```

## API Reference

### Core Methods

- `initialize()`: Initialize the Essentia library
- `getVersion()`: Get the Essentia version
- `loadAudio(path, sampleRate)`: Load an audio file
- `unloadAudio()`: Unload the current audio
- `processAudio(frameSize, hopSize)`: Process the loaded audio
- `executeAlgorithm(category, algorithm, params)`: Execute a specific algorithm

### Helper Methods

- `extractMFCCFromFile(options)`: One-step MFCC extraction from an audio file
- `normalizeFilePath(path)`: Normalize file paths for cross-platform compatibility

### Specialized Algorithm Categories

- `spectral.mfcc(params)`: Extract MFCC features
- `tonal.key(params)`: Analyze musical key
- `rhythm.beatTracking(params)`: Detect beats

## License

MIT

## Requirements

- React Native >= 0.63.0
- iOS 11.0+ / Android API 21+

## Acknowledgments

This project uses the [Essentia library](https://essentia.upf.edu/) - an open-source C++ library for audio analysis developed by the Music Technology Group at Universitat Pompeu Fabra.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
