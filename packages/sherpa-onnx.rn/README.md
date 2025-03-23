# @siteed/sherpa-onnx.rn

React Native wrapper for [Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx) speech recognition library.

## Features

- Speech-to-text (STT) using Sherpa-ONNX
- Streaming recognition support
- Low-level API for direct access to Sherpa-ONNX capabilities
- Support for both old and new React Native architectures
- Pre-built native libraries for Android and iOS

## Installation

```bash
# Using npm
npm install @siteed/sherpa-onnx.rn

# Using yarn
yarn add @siteed/sherpa-onnx.rn
```

### iOS

For iOS, run pod install:

```bash
cd ios && pod install
```

### Android

Android integration is handled automatically by the package.

## Usage

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

## License

MIT 