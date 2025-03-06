# react-native-essentia

A React Native module that provides access to the [Essentia audio analysis library](https://essentia.upf.edu/) on Android devices. This module enables developers to perform advanced audio feature extraction and analysis directly within their React Native applications.

## Features

- Access to Essentia's extensive set of audio analysis algorithms
- Convenience methods for common features (e.g., MFCC, key, tempo)
- Batch processing for efficient multi-feature extraction
- Caching of algorithm information for faster access
- Multi-threading support for performance optimization
- TypeScript support for improved developer experience

## Platform Support

**Currently, this module only supports Android.** iOS support is planned for future releases.

## Installation

Install the module using npm or yarn:

```bash
npm install react-native-essentia
```

or

```bash
yarn add react-native-essentia
```

Since this module uses native code, rebuild your project after installation:

```bash
npx react-native run-android
```

## Prerequisites

- React Native 0.60+ (uses autolinking)
- Android SDK with NDK support (for native compilation)

## Usage

### Basic Example

Here's how to initialize the module, set audio data, and extract features:

```typescript
import Essentia from 'react-native-essentia';

// Initialize Essentia
await Essentia.initialize();

// Set audio data (PCM samples as Float32Array)
const audioData = new Float32Array([/* your audio samples */]);
const sampleRate = 44100;
await Essentia.setAudioData(audioData, sampleRate);

// Extract MFCC
const mfccResult = await Essentia.extractMFCC();
console.log('MFCC:', mfccResult.mfcc);

// Extract multiple features in one go
const features = await Essentia.extractFeatures([
  { name: 'MFCC' },
  { name: 'Spectrum' },
]);
console.log('Features:', features.data.mfcc, features.data.spectrum);
```

### Available Convenience Methods

The module provides convenience methods for common audio features, each returning a promise with specific result types:

- **extractMFCC(params?: MFCCParams): Promise\<MFCCResult>**
  Extracts Mel-frequency cepstral coefficients.

- **extractMelBands(params?: MelBandsParams): Promise\<MelBandsResult>**
  Extracts Mel spectrogram bands.

- **extractKey(params?: AlgorithmParams): Promise\<KeyResult>**
  Detects musical key and scale.

- **extractTempo(params?: AlgorithmParams): Promise\<TempoResult>**
  Estimates tempo (BPM).

- **extractBeats(params?: AlgorithmParams): Promise\<BeatsResult>**
  Detects beat positions.

- **extractLoudness(params?: AlgorithmParams): Promise\<LoudnessResult>**
  Analyzes loudness.

- **extractSpectralFeatures(params?: AlgorithmParams): Promise\<SpectralFeaturesResult>**
  Extracts spectral features (centroid, rolloff, flux, complexity).

- **extractPitch(params?: PitchParams): Promise\<PitchResult>**
  Detects predominant pitch.

- **extractRhythmFeatures(params?: AlgorithmParams): Promise\<RhythmFeaturesResult>**
  Extracts rhythm descriptors.

- **extractEnergy(params?: AlgorithmParams): Promise\<EnergyResult>**
  Analyzes signal energy and RMS.

- **extractOnsets(params?: AlgorithmParams): Promise\<OnsetsResult>**
  Detects onsets.

- **extractDissonance(params?: AlgorithmParams): Promise\<DissonanceResult>**
  Measures dissonance.

- **extractDynamics(params?: AlgorithmParams): Promise\<DynamicsResult>**
  Analyzes dynamic complexity.

- **extractHarmonics(params?: AlgorithmParams): Promise\<HarmonicsResult>**
  Extracts harmonic pitch class profile (HPCP).

- **extractChords(params?: AlgorithmParams): Promise\<ChordsResult>**
  Detects chords.

- **detectSilence(params?: SilenceRateParams): Promise\<SilenceResult>**
  Detects silence regions.

- **extractBarkBands(params?: BarkBandsParams): Promise\<BarkBandsResult>**
  Extracts Bark frequency bands.

- **extractDanceability(params?: AlgorithmParams): Promise\<DanceabilityResult>**
  Analyzes danceability.

- **extractZeroCrossingRate(params?: AlgorithmParams): Promise\<ZeroCrossingRateResult>**
  Measures zero-crossing rate.

- **extractTuningFrequency(params?: AlgorithmParams): Promise\<TuningFrequencyResult>**
  Analyzes tuning frequency.

- **extractERBBands(params?: ERBBandsParams): Promise\<ERBBandsResult>**
  Extracts ERB bands.

- **extractAttackTime(params?: AlgorithmParams): Promise\<AttackTimeResult>**
  Detects attack time.

- **extractInharmonicity(params?: AlgorithmParams): Promise\<InharmonicityResult>**
  Measures inharmonicity.

## Advanced Usage

### Custom Algorithms

For custom algorithms or greater control, use executeAlgorithm:

```typescript
const result = await Essentia.executeAlgorithm('SpectralCentroidTime', { sampleRate: 44100 });
console.log('Centroid:', result);
```

### Batch Processing

Run multiple algorithms in a batch with executeBatch:

```typescript
const batchResult = await Essentia.executeBatch([
  { name: 'MFCC', params: { numberCoefficients: 13 } },
  { name: 'Spectrum' },
]);
console.log('Batch Results:', batchResult.data);
```

### Algorithm Information

Explore available algorithms and their details:

```typescript
// Get info for a specific algorithm
const info = await Essentia.getAlgorithmInfo('MFCC');
console.log('MFCC Info:', info);

// List all algorithms
const algorithms = await Essentia.getAllAlgorithms();
console.log('All Algorithms:', algorithms);
```

## Performance Optimization

### Caching

Enable/disable caching of algorithm information:

```typescript
await Essentia.setCacheEnabled(true);
const isEnabled = await Essentia.isCacheEnabled();
await Essentia.clearCache();
```

### Threading

Adjust the number of threads for computation:

```typescript
await Essentia.setThreadCount(4); // Optimize based on device
const threadCount = await Essentia.getThreadCount();
```

## Types

Key TypeScript interfaces:

- **AlgorithmParams**: `{ [key: string]: string | number | boolean | number[] | string[] | undefined }`
  Configuration object for algorithm parameters.

- **FeatureConfig**: `{ name: string; params?: AlgorithmParams }`
  Defines a feature to extract.

- **EssentiaResult<T>**: `{ success: boolean; data?: T; error?: { code: string; message: string } }`
  Generic result type for most operations.

Specific result types (e.g., MFCCResult, KeyResult) are returned by convenience methods.

## Error Handling

All methods return promises that may reject with errors. Results also include a success field:

```typescript
try {
  const result = await Essentia.extractMFCC();
  if (result.success) {
    console.log('MFCC:', result.mfcc);
  } else {
    console.error('Error:', result.error);
  }
} catch (error) {
  console.error('Exception:', error);
}
```

## Performance Considerations

Audio analysis can be resource-intensive:

- Use batch operations (extractFeatures, executeBatch) to minimize redundant computations.
- Adjust thread count based on device capabilities.
- For large audio files, consider processing in chunks or running in the background.

## Android-Specific Notes

- No additional permissions are required, as the module processes raw PCM data provided by the user.
- Ensure your project includes the native library (libreact-native-essentia.so), which is bundled with the module.

## Contributing

To contribute or build the native library:

1. Clone the repository.
2. Follow instructions in CONTRIBUTING.md for setting up the NDK and building the C++ code.

## License

MIT License (see LICENSE file)

## Acknowledgements

Built with the [Essentia audio analysis library](https://essentia.upf.edu/).

