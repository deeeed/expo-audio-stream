---
id: ml-streaming
title: ML & DSP Streaming
sidebar_label: ML & DSP Streaming
---

# ML & DSP Streaming

When feeding live audio to ML models (speech recognition, VAD, keyword spotting, speaker ID, audio tagging), use `streamFormat: 'float32'` to receive samples as `Float32Array` directly — no manual decoding required.

## Why float32?

Without `streamFormat`, native platforms deliver audio as base64-encoded strings. Every consumer must decode and convert manually:

```typescript
// Before: 4-pass pipeline on every audio chunk
onAudioStream: async (event) => {
  const raw = atob(event.data as string);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  await model.feed(Array.from(samples));
}
```

With `streamFormat: 'float32'`, the native layer does the Int16→Float32 conversion and skips base64 entirely:

```typescript
// After: data is already Float32Array
onAudioStream: async (event) => {
  const samples = event.data as Float32Array;
  await model.feed(Array.from(samples));
}
```

On web, the AudioWorklet already operates on Float32 internally. Setting `streamFormat: 'float32'` skips the lossy Float32→Int16 roundtrip that normally happens for file-format compatibility.

## Configuration

```typescript
import { useAudioRecorder } from '@siteed/expo-audio-studio';

const { startRecording } = useAudioRecorder();

await startRecording({
  sampleRate: 16000,
  channels: 1,
  encoding: 'pcm_32bit',
  interval: 100,
  streamFormat: 'float32',
  onAudioStream: async (event) => {
    const samples = event.data as Float32Array;
    // Feed directly to your ML model, VAD, ASR, etc.
    await myModel.process(samples);
  },
});
```

Key settings for ML consumers:
- **`sampleRate: 16000`** — most speech models expect 16 kHz
- **`channels: 1`** — mono audio for inference
- **`streamFormat: 'float32'`** — Float32Array on all platforms
- **`interval: 100`** — chunk delivery interval in ms (tune to your model's needs)

## Backwards compatibility

The default is `'raw'`, which preserves existing behavior. No changes are needed for consumers that store or upload recorded files — `streamFormat` only affects the data delivered to `onAudioStream`.

| | `'raw'` (default) | `'float32'` |
|---|---|---|
| Native `onAudioStream` data | base64 `string` | `Float32Array` |
| Web `onAudioStream` data | `Float32Array` | `Float32Array` |
| File recording | unaffected | unaffected |
