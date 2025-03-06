#  @siteed/react-native-essentia

A React Native module that provides access to the [Essentia audio analysis library](https://essentia.upf.edu/) on Android devices. This module enables developers to perform advanced audio feature extraction and analysis directly within their React Native applications.

## Features

- Access to Essentia's extensive set of audio analysis algorithms
- Convenience methods for common features (e.g., MFCC, key, tempo)
- Batch processing for efficient multi-feature extraction
- Flexible audio processing pipelines with custom preprocessing and post-processing
- Caching of algorithm information for faster access
- Multi-threading support for performance optimization
- TypeScript support for improved developer experience

## Platform Support

**Currently, this module only supports Android.** iOS and Web support is planned for future releases.

## Installation

Install the module using npm or yarn:

```bash
npm install @siteed/react-native-essentia
```

or

```bash
yarn add @siteed/react-native-essentia
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
import Essentia from '@siteed/react-native-essentia';

// Note: Explicit initialization is optional as the library implements lazy initialization
// await Essentia.initialize();

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

### Core Methods

The module provides the following core methods for basic operation and more advanced control:

- **initialize(): Promise\<boolean>**
  Initializes the Essentia library. Note: Explicit initialization is optional as the library implements lazy initialization and will automatically initialize when needed.

- **setAudioData(pcmData: number[] | Float32Array, sampleRate: number): Promise\<boolean>**
  Sets the audio data to be analyzed.

- **executeAlgorithm(algorithm: string, params?: AlgorithmParams): Promise\<AlgorithmResult>**
  Executes a single Essentia algorithm with custom parameters.

- **executeBatch(algorithms: FeatureConfig[]): Promise\<BatchProcessingResults>**
  Runs multiple algorithms in a batch for efficient processing.

- **executePipeline(config: PipelineConfig): Promise\<PipelineResult>**
  Creates a full audio processing pipeline with preprocessing, feature extraction, and post-processing steps.

- **extractFeatures(features: FeatureConfig[]): Promise\<BatchProcessingResults>**
  Extracts multiple audio features with optimized execution.

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

### Audio Processing Pipeline

Define customizable audio processing pipelines with the `executePipeline` method:

```typescript
const pipelineResult = await Essentia.executePipeline({
  preprocess: [
    { name: "FrameCutter", params: { frameSize: 2048, hopSize: 1024 } },
    { name: "Windowing", params: { type: "hann" } },
    { name: "Spectrum", params: { size: 2048 } }
  ],
  features: [
    {
      name: "MFCC",
      input: "Spectrum",
      params: { numberCoefficients: 13 },
      postProcess: { mean: true }
    },
    {
      name: "MelBands",
      input: "Spectrum",
      params: { numberBands: 40 },
      postProcess: { mean: true }
    }
  ],
  postProcess: { concatenate: true }
});

// Access results
console.log('MFCC:', pipelineResult.data.MFCC);
console.log('MelBands:', pipelineResult.data.MelBands);
console.log('Concatenated features:', pipelineResult.data.concatenatedFeatures);
```

The pipeline configuration allows you to:
- Define preprocessing steps including frame cutting and windowing
- Extract multiple features in sequence
- Specify the input for each feature (e.g., connecting a feature to a preprocessing step)
- Apply post-processing such as frame averaging or feature concatenation
- Create both frame-based and signal-based processing workflows

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

- **PipelineConfig**:
  ```typescript
  {
    preprocess: Array<{ name: string; params?: AlgorithmParams }>;
    features: Array<{
      name: string;
      input: string; // Source of input data (e.g., "Spectrum")
      params?: AlgorithmParams;
      postProcess?: { mean?: boolean };
    }>;
    postProcess?: { concatenate?: boolean };
  }
  ```
  Configures an audio processing pipeline with preprocessing, feature extraction, and post-processing steps.

- **PipelineResult**: `{ success: boolean; data?: Record<string, number | number[]>; error?: { code: string; message: string; details?: string } }`
  Result type for pipeline operations, containing the extracted features.

- **EssentiaResult<T>**: `{ success: boolean; data?: T; error?: { code: string; message: string } }`
  Generic result type for most operations.

- **BatchResult**: `{ success: boolean; data?: { [key: string]: any }; error?: { code: string; message: string } }`
  Specific result type for batch operations like extractFeatures and executeBatch.

Specific result types (e.g., MFCCResult, KeyResult) are returned by convenience methods alongside the generic EssentiaResult structure.

### Return Type Consistency

The module uses two patterns for result types:

1. **Specific Result Types**: Methods like `extractMFCC()` return specialized types (e.g., `MFCCResult`) for better type safety and IDE autocompletion.

2. **Generic Result Wrapper**: All responses are wrapped in the `EssentiaResult<T>` structure that includes `success` and possible `error` information.

For example, when calling `extractMFCC()`:

```typescript
// The return type combines both patterns
type MFCCResponse = MFCCResult & EssentiaResult<MFCCResult>;

const result = await Essentia.extractMFCC();
if (result.success) {
  // Access typed fields directly
  const coefficients = result.mfcc;
  const bands = result.bands;
} else {
  // Handle errors
  console.error(result.error?.message);
}
```

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
- Take advantage of the automatic lazy initialization feature, which ensures the library is initialized only when needed.
- Adjust thread count based on device capabilities.
- For large audio files, consider processing in chunks or running in the background.

## Available Algorithms

The module provides access to over 200 audio analysis algorithms from the Essentia library. Some key categories include:

- **Spectral Analysis**: FFT, Spectrum, SpectralPeaks, SpectralContrast
- **Feature Extraction**: MFCC, MelBands, BFCC, GFCC, BarkBands, ERBBands
- **Musical Analysis**: Key, Tempo, BPM, Chords, Pitch, Scale
- **Rhythm Analysis**: BeatTracker, Onsets, RhythmExtractor
- **Signal Processing**: Filters (HighPass, LowPass, BandPass), Windowing, Normalization
- **Audio Segmentation**: SilenceRate, Slicer, Onsets, RMS

For a complete list of algorithms and their parameters, use the `getAllAlgorithms()` method.

### Example Algorithm Parameters

Here are commonly used parameter examples for popular algorithms:

```typescript
// MFCC with custom parameters
const mfccParams = {
  numberBands: 40,
  numberCoefficients: 13,
  lowFrequencyBound: 20,
  highFrequencyBound: 20000,
  sampleRate: 44100
};

// BarkBands extraction
const barkBandsParams = {
  sampleRate: 44100,
  numberBands: 27
};

// Key detection
const keyParams = {
  profileType: "temperley",
  usePolyphony: false,
  useThreeChords: true
};

// Tempo/BPM detection
const tempoParams = {
  minTempo: 40,
  maxTempo: 208
};
```

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

