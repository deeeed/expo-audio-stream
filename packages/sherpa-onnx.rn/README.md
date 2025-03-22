# @siteed/sherpa-onnx.rn

A React Native wrapper for [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx), providing Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities for React Native applications.

## Features

- Speech-to-Text (STT) conversion
- Text-to-Speech (TTS) synthesis
- Streaming audio recognition
- Support for multiple languages
- iOS and Android support

## Installation

```sh
yarn add @siteed/sherpa-onnx.rn
```

### iOS

```sh
cd ios && pod install
```

### Android

No additional steps required for Android installation.

## Setup

You need to download the Sherpa-onnx models before using this package. The models can be downloaded from [Hugging Face](https://huggingface.co/k2-fsa). You can either:

1. Include them in your app bundle
2. Download them at runtime
3. Use a remote URL (remote model loading is not supported for all models)

## Usage

### Basic STT (Speech-to-Text)

```typescript
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

// Initialize
const sherpaOnnx = new SherpaOnnxAPI({
  modelPath: '/path/to/models',
  language: 'en',
  sampleRate: 16000,
  channels: 1,
});

// Initialize the engine
await sherpaOnnx.initialize();

// Convert speech to text from an audio file
const result = await sherpaOnnx.speechToText('/path/to/audio.wav');
console.log('Recognized text:', result.text);

// Clean up
await sherpaOnnx.release();
```

### Basic TTS (Text-to-Speech)

```typescript
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

// Initialize
const sherpaOnnx = new SherpaOnnxAPI({
  modelPath: '/path/to/models',
  language: 'en',
  sampleRate: 24000, // TTS models often use higher sample rates
  channels: 1,
});

// Initialize the engine
await sherpaOnnx.initialize();

// Convert text to speech
const audioFilePath = await sherpaOnnx.textToSpeech('Hello, world!', {
  voiceId: 'en-US-female-1',
  speakingRate: 1.0,
  pitch: 0.0,
  volumeGainDb: 0.0,
});
console.log('Audio file generated at:', audioFilePath);

// Clean up
await sherpaOnnx.release();
```

### Streaming Recognition

```typescript
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

// Initialize
const sherpaOnnx = new SherpaOnnxAPI({
  modelPath: '/path/to/models',
  language: 'en',
  sampleRate: 16000,
  channels: 1,
});

// Initialize the engine
await sherpaOnnx.initialize();

// Start streaming
await sherpaOnnx.startStreaming({
  interimResults: true,
  enablePunctuation: true,
});

// Feed audio chunks
// This would typically be in a loop where you get audio data from a microphone
const interimResult = await sherpaOnnx.feedAudioContent(audioChunk);
console.log('Interim result:', interimResult.text);

// Stop streaming when done
const finalResult = await sherpaOnnx.stopStreaming();
console.log('Final result:', finalResult.text);

// Clean up
await sherpaOnnx.release();
```

## API Reference

### SherpaOnnxAPI

#### Constructor

```typescript
constructor(config: SherpaOnnxConfig)
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| config | SherpaOnnxConfig | Configuration for Sherpa-onnx |

#### Methods

- `initialize(): Promise<boolean>` - Initialize the Sherpa-onnx engine
- `speechToText(audioData: number[] | string, options?: SttOptions): Promise<SherpaOnnxResult>` - Convert speech to text
- `textToSpeech(text: string, options?: TtsOptions): Promise<string>` - Convert text to speech
- `startStreaming(options?: SttOptions): Promise<boolean>` - Start streaming recognition
- `feedAudioContent(audioChunk: number[]): Promise<SherpaOnnxResult>` - Feed audio data to streaming recognition
- `stopStreaming(): Promise<SherpaOnnxResult>` - Stop streaming recognition
- `release(): Promise<boolean>` - Release resources
- `getAvailableVoices(): Promise<string[]>` - Get available TTS voices
- `static isFeatureSupported(feature: string): Promise<boolean>` - Check if a feature is supported

## License

MIT 