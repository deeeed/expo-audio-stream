---
id: audio-recording
title: AudioRecording
sidebar_label: AudioRecording
---

# AudioRecording

The `AudioRecording` interface represents the result of an audio recording. This result is obtained by calling the `stopRecording` function. It contains various details about the recording such as the file URI, duration, size, and more.

## Interface

```ts
export interface AudioRecording {
    fileUri: string // on web is this is the same as the filename
    filename: string
    durationMs: number
    size: number
    mimeType: string
    channels: number
    bitDepth: BitDepth
    sampleRate: SampleRate
    analysisData?: AudioAnalysis // Analysis data for the recording depending on enableProcessing flag
    compression?: CompressionInfo & {
        compressedFileUri: string
    }
}
```

## Example Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-studio';

const {
    startRecording,
    stopRecording,
    isRecording,
    durationMs,
    size,
} = useAudioRecorder({ debug: true });

const handleStop = async () => {
    const result: AudioRecording = await stopRecording();
    if (result) {
        console.log('Recording stopped:', result);
        console.log('File URI:', result.fileUri);
        console.log('Duration (ms):', result.durationMs);
        console.log('Size (bytes):', result.size);
        console.log('MIME type:', result.mimeType);
        console.log('Channels:', result.channels);
        console.log('Bit depth:', result.bitDepth);
        console.log('Sample rate:', result.sampleRate);
        
        if (result.compression) {
            console.log('Compressed File URI:', result.compression.compressedFileUri);
            console.log('Compressed Size:', result.compression.size);
            console.log('Compression Format:', result.compression.format);
            console.log('Compressed Bitrate:', result.compression.bitrate);
        }
        
        if (result.analysisData) {
            console.log('Analysis Data:', result.analysisData);
        }
    } else {
        console.log('No recording result available.');
    }
};
```