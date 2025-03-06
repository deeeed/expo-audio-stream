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
  - Tonal analysis (key detection, chroma, etc.)
  - Rhythm analysis (beat tracking, tempo, etc.)
  - High-level audio features
- Audio data processing with PCM arrays
- Both high-level API and low-level access to individual algorithms

## Usage

```js
import { essentiaAPI } from 'react-native-essentia';

// Initialize the library
await essentiaAPI.initialize();

// Get the version
const version = await essentiaAPI.getVersion();
console.log(`Essentia version: ${version}`);

// Example: Process PCM data for feature extraction
const pcmData = [...]; // Your PCM audio data as a number array
const sampleRate = 44100; // Sample rate in Hz

// Convert PCM data to string format for processing
const pcmString = JSON.stringify(pcmData);

// Load the audio data
await essentiaAPI.loadAudio(pcmString, sampleRate);

// Extract features with custom parameters
const features = await essentiaAPI.extractFeatures(pcmString, {
  sampleRate: 44100,
  nMfcc: 13,
  nFft: 2048,
  hopLength: 512,
  winLength: 1024,
  window: 'hann',
  nChroma: 12,
  nMels: 40,
  nBands: 7,
  fmin: 100
});

console.log('Extracted features:', features);
```

## Feature Extraction

The library provides a comprehensive feature extraction API that matches the parameters used in the Python implementation:

```js
// Extract features from PCM data
const features = await essentiaAPI.extractFeatures(pcmString, {
  // All parameters are optional and have sensible defaults
  sampleRate: 44100, // Sample rate of the audio
  nMfcc: 13,        // Number of MFCC coefficients
  nFft: 2048,       // FFT size
  hopLength: 512,   // Hop length in samples
  winLength: 1024,  // Window length in samples
  window: 'hann',   // Window type (hann, hamming, blackman, etc.)
  nChroma: 12,      // Number of chroma bins
  nMels: 40,        // Number of mel bands
  nBands: 7,        // Number of spectral contrast bands
  fmin: 100         // Minimum frequency
});
```

The returned features object contains:

```js
{
  mfcc: [...],      // Array of MFCC coefficients (length: nMfcc)
  mel: [...],       // Array of mel band energies (length: nMels)
  chroma: [...],    // Array of chroma features (length: nChroma)
  spectralContrast: [...],  // Array of spectral contrast features (length: nBands + 1)
}
```

## API Reference

### Core Methods

- `initialize()`: Initialize the Essentia library
- `getVersion()`: Get the Essentia version
- `listAlgorithms()`: List all available algorithms

### Audio Processing

- `loadAudio(pcmString, sampleRate)`: Load audio data for processing
- `processAudioFrames(frameSize, hopSize)`: Process the loaded audio with the specified frame and hop sizes

### Feature Extraction

- `extractFeatures(pcmString, params)`: Extract features from PCM data with customizable parameters

## Example

See the [example directory](example/) for a complete sample application demonstrating how to use the feature extraction API.

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
