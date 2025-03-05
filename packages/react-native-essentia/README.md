# react-native-essentia

React Native wrapper for the Essentia audio analysis library.

## Installation

```sh
npm install react-native-essentia
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

## Basic Usage

```typescript
import { essentiaAPI } from 'react-native-essentia';

// Initialize Essentia
await essentiaAPI.initialize();

// Get Essentia version
const version = await essentiaAPI.getVersion();
console.log(`Using Essentia version: ${version}`);

// Load an audio file
const audioPath = '/path/to/audio/file.mp3';
const loaded = await essentiaAPI.loadAudio(audioPath);
if (loaded) {
  // Process audio with default frame size and hop size
  await essentiaAPI.processAudio();

  // Compute MFCCs
  const mfccResult = await essentiaAPI.spectral.mfcc({
    numberBands: 40,
    numberCoefficients: 13
  });

  console.log('MFCC results:', mfccResult);

  // Detect key
  const keyResult = await essentiaAPI.tonal.key();
  console.log(`Detected key: ${keyResult.key} ${keyResult.scale}`);

  // Track beats
  const beatResult = await essentiaAPI.rhythm.beatTracking();
  console.log(`Detected tempo: ${beatResult.tempo} BPM`);

  // Unload audio when done
  await essentiaAPI.unloadAudio();
}
```

## Advanced Usage

### Using Raw Algorithm Execution

For direct access to any Essentia algorithm, you can use the `executeAlgorithm` method:

```typescript
import { essentiaAPI, EssentiaCategory, AlgorithmParams } from 'react-native-essentia';

// Initialize Essentia
await essentiaAPI.initialize();

// Load and process audio
await essentiaAPI.loadAudio('/path/to/audio/file.mp3');
await essentiaAPI.processAudio(2048, 1024);

// Configure algorithm parameters
const params: AlgorithmParams = {
  minFrequency: 20,
  maxFrequency: 20000,
  numberBands: 40,
  numberCoefficients: 13,
  sampleRate: 44100
};

// Execute an algorithm directly
const result = await essentiaAPI.executeAlgorithm(
  EssentiaCategory.SPECTRAL,
  'MFCC',
  params
);

console.log('Algorithm result:', result);
```

## Supported Algorithms

The wrapper currently supports the following algorithms (more will be added):

### Spectral
- MFCC
- Spectrum
- SpectralCentroid
- SpectralContrast

### Tonal
- Key
- Chords
- TuningFrequency

### Rhythm
- BeatTracking
- RhythmExtractor
- BPM

## Requirements

- React Native >= 0.63.0
- iOS 11.0+ / Android API 21+

## License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

## Troubleshooting

### Audio Loading Issues

If you encounter errors like "No audio loading algorithms available" or "Failed to load audio file", it may be due to missing audio codec support in your Essentia build.

#### Solutions:

1. **Check Essentia Initialization**: Make sure Essentia is properly initialized before attempting to load audio files.

   ```typescript
   const initialized = await essentiaAPI.initialize();
   console.log('Essentia initialized:', initialized);
   ```

2. **Verify Audio File Path**: Ensure the audio file path is correct and accessible.

3. **Audio Codec Support**: The default Essentia build might not include all audio codecs. You may need to rebuild Essentia with FFmpeg support:

   ```bash
   # In your native build process
   ./waf configure --with-examples --with-python --with-ffmpeg
   ```

4. **Check Available Algorithms**: You can check which algorithms are available in your Essentia build:

   ```typescript
   // After initializing Essentia
   const validation = await essentiaAPI.validateIntegration();
   console.log('Available algorithms:', validation.algorithmResults);
   ```

5. **File Format Compatibility**: Try using WAV files instead of compressed formats if you're having issues.

### Android-Specific Issues

If you're experiencing issues on Android:

1. Make sure the necessary codec libraries (libavcodec, libavformat, etc.) are included in your build.
2. Check the Android logs for specific error messages from the Essentia wrapper.
3. Ensure your app has proper file read permissions.

## Acknowledgments

This project uses the [Essentia library](https://essentia.upf.edu/) - an open-source C++ library for audio analysis developed by the Music Technology Group at Universitat Pompeu Fabra.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
