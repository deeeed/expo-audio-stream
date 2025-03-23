# @siteed/sherpa-onnx.rn

React Native wrapper for [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) providing Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities for mobile applications.

## Features

- Speech-to-text (STT) using Sherpa-ONNX
- Streaming recognition support
- Low-level API for direct access to Sherpa-ONNX capabilities
- Support for both old and new React Native architectures
- Pre-built native libraries for Android and iOS

## Installation

```sh
npm install @siteed/sherpa-onnx.rn
# or
yarn add @siteed/sherpa-onnx.rn
```

### Linking

This package is a native module and requires proper linking. For React Native 0.60 and above, linking should happen automatically through auto-linking.

If you're using Expo, you'll need to use a custom development client or eject to a bare workflow:

```sh
npx expo prebuild
```

### iOS

For iOS, run pod install:

```bash
cd ios && pod install
```

### Android

Android integration is handled automatically by the package.

## React Native Compatibility

This module is compatible with both the old and new React Native architectures. See [COMPATIBILITY.md](./COMPATIBILITY.md) for details on how this is achieved and considerations when using this module.

## Usage

### Text-to-Speech (TTS)

This example demonstrates how to use the TTS functionality:

```typescript
import SherpaOnnx, { TtsModelConfig } from '@siteed/sherpa-onnx.rn';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Initialize TTS
const initTts = async () => {
  try {
    // First validate the library is loaded
    const validateResult = await SherpaOnnx.validateLibraryLoaded();
    if (!validateResult.loaded) {
      throw new Error(`Library validation failed: ${validateResult.status}`);
    }
    
    // Configure TTS with your model
    const modelConfig: TtsModelConfig = {
      modelDir: 'assets/tts/kokoro-en-v0_19',
      modelName: 'model.onnx',
      voices: 'voices.bin',
      dataDir: 'assets/tts/kokoro-en-v0_19/espeak-ng-data',
    };
    
    // Initialize TTS
    const initResult = await SherpaOnnx.initTts(modelConfig);
    console.log(`TTS initialized with ${initResult.numSpeakers} speakers at ${initResult.sampleRate}Hz`);
    return initResult;
  } catch (error) {
    console.error('Failed to initialize TTS:', error);
    throw error;
  }
};

// Generate speech
const generateSpeech = async (text: string) => {
  try {
    // Generate TTS without playing (we'll play with Expo AV)
    const result = await SherpaOnnx.generateTts(text, {
      speakerId: 0,
      speakingRate: 1.0,
      playAudio: false
    });
    
    // Play with Expo AV
    const { sound } = await Audio.Sound.createAsync({ 
      uri: Platform.OS === 'ios' ? result.filePath : `file://${result.filePath}` 
    });
    await sound.playAsync();
    
    return { sound, result };
  } catch (error) {
    console.error('Failed to generate speech:', error);
    throw error;
  }
};

// Clean up resources
const cleanup = async () => {
  await SherpaOnnx.releaseTts();
};
```

### Basic Speech-to-Text

```typescript
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

// Initialize the API
const sherpaOnnx = new SherpaOnnxAPI({
  modelPath: '/path/to/models',
  sampleRate: 16000,
  channels: 1,
  language: 'en',
});

// Initialize the recognizer
await sherpaOnnx.initialize();

// Convert speech to text from audio buffer
const audioData = [...]; // Array of audio samples
const result = await sherpaOnnx.speechToText(audioData);
console.log('Recognized text:', result.text);

// Or from an audio file
const fileResult = await sherpaOnnx.speechToText('/path/to/audio.wav');
console.log('Recognized text from file:', fileResult.text);

// Clean up when done
await sherpaOnnx.release();
```

### Streaming Recognition

```typescript
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

const sherpaOnnx = new SherpaOnnxAPI({
  modelPath: '/path/to/models',
  sampleRate: 16000,
});

// Initialize
await sherpaOnnx.initialize();

// Start streaming
await sherpaOnnx.startStreaming();

// Feed audio chunks
const audioChunk = [...]; // Array of audio samples from microphone
const partialResult = await sherpaOnnx.feedAudioContent(audioChunk);
console.log('Partial result:', partialResult.text);

// Stop streaming when done
const finalResult = await sherpaOnnx.stopStreaming();
console.log('Final result:', finalResult.text);

// Clean up
await sherpaOnnx.release();
```

### Low-level API

For advanced usage, you can access the low-level API that maps directly to Sherpa-ONNX functions:

```typescript
import { NativeModules } from 'react-native';
const { SherpaOnnx } = NativeModules;

// Create a recognizer
const config = {
  sampleRate: 16000,
  featureDim: 80,
  modelType: 'transducer',
  transducer: {
    encoder: '/path/to/encoder.onnx',
    decoder: '/path/to/decoder.onnx',
    joiner: '/path/to/joiner.onnx',
  },
  tokens: '/path/to/tokens.txt',
  enableEndpoint: true,
};

const recognizerId = await SherpaOnnx.createRecognizer(config);

// Create a stream
const streamId = await SherpaOnnx.createStream(recognizerId, '');

// Process audio
const samples = [...]; // Float array of audio samples
await SherpaOnnx.acceptWaveform(streamId, samples, 16000);
await SherpaOnnx.decode(recognizerId, streamId);

// Get results
const result = await SherpaOnnx.getResult(recognizerId, streamId);
console.log('Text:', result.text);

// Clean up
await SherpaOnnx.releaseStream(streamId);
await SherpaOnnx.releaseRecognizer(recognizerId);
```

## Models

You need to provide Sherpa-ONNX model files to use this library. You can download pre-trained models from the [Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx) repository or train your own.

The most common model types are:
- Transducer models (encoder, decoder, joiner)
- CTC models (single model file)
- Paraformer models (encoder, decoder)

## Building from Source

If you need to build the native libraries yourself:

```bash
# Clone the repository
git clone https://github.com/yourusername/yourrepo.git
cd yourrepo/packages/sherpa-onnx.rn

# Set up dependencies
./setup.sh

# Build for all platforms
./build-all.sh
```

## API Reference

### Library Validation

#### `validateLibraryLoaded()`

Validates if the Sherpa ONNX library is properly loaded.

**Returns:** Promise<ValidateResult>

### Text-to-Speech

#### `initTts(config: TtsModelConfig)`

Initializes the TTS engine with the provided model configuration.

**Parameters:**
- `config`: TTS model configuration

**Returns:** Promise<TtsInitResult>

#### `generateTts(text: string, options?: TtsOptions)`

Generates speech from the given text.

**Parameters:**
- `text`: Text to synthesize
- `options`: TTS generation options (optional)

**Returns:** Promise<TtsGenerateResult>

#### `stopTts()`

Stops any ongoing TTS generation.

**Returns:** Promise<{ stopped: boolean; message?: string }>

#### `releaseTts()`

Releases TTS resources.

**Returns:** Promise<{ released: boolean }>

## Model Configuration

### TtsModelConfig

```typescript
interface TtsModelConfig {
  // Directory containing model files
  modelDir: string;
  
  // Model file name for VITS models
  modelName?: string;
  
  // Acoustic model file name for Matcha models
  acousticModelName?: string;
  
  // Vocoder file name for Matcha models
  vocoder?: string;
  
  // Voices file name for Kokoro models
  voices?: string;
  
  // Lexicon file name
  lexicon?: string;
  
  // Data directory path
  dataDir?: string;
  
  // Dictionary directory path
  dictDir?: string;
  
  // Rule FSTs file paths (comma-separated)
  ruleFsts?: string;
  
  // Rule FARs file paths (comma-separated)
  ruleFars?: string;
  
  // Number of threads to use for processing
  numThreads?: number;
}
```

## Troubleshooting

### Android

If you're having issues with the Android build, check that:

1. The Kotlin standard library is properly included in your app's `build.gradle`
2. JNI libraries are properly included in the build

### iOS

For iOS, ensure that:

1. The necessary static libraries are included in your Xcode project
2. The pod installation completed successfully

## License

MIT 