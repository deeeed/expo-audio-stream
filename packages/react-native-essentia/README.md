# React Native Essentia

A React Native wrapper for the [Essentia](https://essentia.upf.edu/) audio analysis library, providing direct access to Essentia's audio processing algorithms from JavaScript.

## Features

- Direct access to Essentia's audio processing algorithms
- Process raw PCM audio data without file loading
- Simple, Promise-based API
- TypeScript support

## Installation

```bash
npm install react-native-essentia
# or
yarn add react-native-essentia
```

### iOS

```bash
cd ios && pod install
```

## API Reference

The API is designed to be minimal and focused on direct usage of Essentia algorithms with raw audio data:

### `initialize(): Promise<boolean>`

Initializes the Essentia library, preparing it for use.

**Returns:** A Promise that resolves to `true` on success or rejects with an error if initialization fails.

**Example:**
```javascript
import EssentiaJS from 'react-native-essentia';

try {
  const initialized = await EssentiaJS.initialize();
  console.log('Essentia initialized:', initialized);
} catch (error) {
  console.error('Failed to initialize Essentia:', error);
}
```

### `setAudioData(pcmData: Float32Array, sampleRate: number): Promise<boolean>`

Sets the raw audio data (PCM samples) and sample rate for subsequent algorithm processing.

**Parameters:**
- `pcmData`: Float32Array of audio samples
- `sampleRate`: Sampling rate in Hz (e.g., 44100)

**Returns:** A Promise that resolves to `true` on success or rejects with an error if data cannot be set.

**Example:**
```javascript
// Create or obtain PCM data
const pcmData = new Float32Array([/* audio samples */]);
const sampleRate = 44100;

try {
  const success = await EssentiaJS.setAudioData(pcmData, sampleRate);
  console.log('Audio data set:', success);
} catch (error) {
  console.error('Failed to set audio data:', error);
}
```

### `executeAlgorithm(algorithm: string, params: object): Promise<object>`

Executes a specified Essentia algorithm on the set audio data, using provided parameters.

**Parameters:**
- `algorithm`: Name of the Essentia algorithm (e.g., "MFCC", "Spectrum", "Key")
- `params`: An object containing key-value pairs for algorithm configuration

**Returns:** A Promise that resolves to an object containing the algorithm's output or rejects with an error if execution fails.

**Example:**
```javascript
try {
  // Execute MFCC algorithm
  const mfccResult = await EssentiaJS.executeAlgorithm("MFCC", {
    numberCoefficients: 13,
    numberBands: 40,
    lowFrequencyBound: 0,
    highFrequencyBound: 22050
  });

  console.log('MFCC coefficients:', mfccResult.data.mfcc);
} catch (error) {
  console.error('Failed to execute MFCC algorithm:', error);
}
```

## Usage Examples

### Extracting MFCC Features

```javascript
import EssentiaJS from 'react-native-essentia';

async function extractMFCC(audioSamples, sampleRate) {
  try {
    // Initialize Essentia
    await EssentiaJS.initialize();

    // Set audio data
    await EssentiaJS.setAudioData(audioSamples, sampleRate);

    // Execute MFCC algorithm
    const result = await EssentiaJS.executeAlgorithm("MFCC", {
      numberCoefficients: 13,
      numberBands: 40,
      sampleRate: sampleRate
    });

    return result.data.mfcc; // Array of MFCC coefficients
  } catch (error) {
    console.error("Error extracting MFCC:", error);
    throw error;
  }
}
```

### Computing Spectrum

```javascript
import EssentiaJS from 'react-native-essentia';

async function computeSpectrum(audioSamples, sampleRate) {
  try {
    // Initialize Essentia
    await EssentiaJS.initialize();

    // Set audio data
    await EssentiaJS.setAudioData(audioSamples, sampleRate);

    // Execute Spectrum algorithm
    const result = await EssentiaJS.executeAlgorithm("Spectrum", {
      size: 2048
    });

    return result.data.spectrum; // Array of spectrum values
  } catch (error) {
    console.error("Error computing spectrum:", error);
    throw error;
  }
}
```

### Processing Chain Example

```javascript
import EssentiaJS from 'react-native-essentia';

async function processAudioChain(audioSamples, sampleRate) {
  try {
    // Initialize Essentia
    await EssentiaJS.initialize();

    // Set audio data
    await EssentiaJS.setAudioData(audioSamples, sampleRate);

    // 1. Compute spectrum
    const spectrumResult = await EssentiaJS.executeAlgorithm("Spectrum", {
      size: 2048
    });

    // 2. Use spectrum to compute MFCC
    // Note: In a real implementation, you would need to pass the spectrum to MFCC
    // This is a simplified example
    const mfccResult = await EssentiaJS.executeAlgorithm("MFCC", {
      numberCoefficients: 13,
      numberBands: 40,
      sampleRate: sampleRate
    });

    return {
      spectrum: spectrumResult.data.spectrum,
      mfcc: mfccResult.data.mfcc
    };
  } catch (error) {
    console.error("Error in audio processing chain:", error);
    throw error;
  }
}
```

## Supported Algorithms

The wrapper supports all Essentia algorithms, but the following are specifically optimized in the current implementation:

- MFCC (Mel-Frequency Cepstral Coefficients)
- Spectrum

For other algorithms, you may need to ensure the correct input/output configuration.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Essentia](https://essentia.upf.edu/) - The open-source library for audio analysis
- [React Native](https://reactnative.dev/) - The framework for building native apps using React
