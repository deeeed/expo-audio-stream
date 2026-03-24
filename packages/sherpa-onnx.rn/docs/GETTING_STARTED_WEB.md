# Getting Started: Web (External Consumers)

This guide is for apps that install `@siteed/sherpa-onnx.rn` from npm and want to use speech features in the browser. No local WASM files or model downloads are needed — everything loads from CDN.

For self-hosting WASM and models, see [WEB.md](./WEB.md).

## Install

```bash
yarn add @siteed/sherpa-onnx.rn
# or
npm install @siteed/sherpa-onnx.rn
```

## 1. Load WASM at App Startup

Call `loadWasmModule()` in your app entry point. This fetches the ~12 MB WASM binary from jsDelivr CDN and compiles it. It only needs to run once.

```typescript
// index.ts (or App.tsx — before registerRootComponent)
import { loadWasmModule } from '@siteed/sherpa-onnx.rn';
import { Platform } from 'react-native';

async function initializeApp() {
  if (Platform.OS === 'web') {
    await loadWasmModule({ debug: true });
  }
  // register your root component...
}
```

The WASM runtime is served automatically from jsDelivr (matching your installed package version). No need to copy files to `public/`.

## 2. Use ASR (Speech-to-Text)

`ASR.initialize()` internally waits for the WASM runtime to be ready, so you don't need to gate on `loadWasmModule()` completion.

### Streaming (online) — transducer models

```typescript
import { ASR } from '@siteed/sherpa-onnx.rn';

await ASR.initialize({
  modelDir: '/wasm/asr',
  modelType: 'zipformer2',
  streaming: true,
  modelBaseUrl: 'https://huggingface.co/deeeed/sherpa-voice-models/resolve/main/asr',
});

const result = await ASR.recognizeFromFile(fileUri);
console.log(result.text);

await ASR.release();
```

### Offline — whisper, paraformer, moonshine, etc.

```typescript
import { ASR } from '@siteed/sherpa-onnx.rn';

// Whisper example
await ASR.initialize({
  modelDir: '/wasm/asr-whisper',
  modelType: 'whisper',
  // streaming defaults to false for offline-only types
  modelBaseUrl: 'https://example.com/models/whisper-tiny',
  modelFiles: {
    encoder: 'tiny-encoder.onnx',
    decoder: 'tiny-decoder.onnx',
    tokens: 'tokens.txt',
  },
});

const result = await ASR.recognizeFromFile(fileUri);
console.log(result.text);

await ASR.release();
```

### Config fields

| Field | Description |
|-------|-------------|
| `modelDir` | Virtual FS path for model files (e.g. `/wasm/asr`) |
| `modelType` | Model architecture (see table below) |
| `streaming` | `true` for online/streaming, `false` or omit for offline |
| `modelBaseUrl` | Remote URL where model files are served |
| `modelFiles` | Custom file names (overrides defaults like `encoder.onnx`) |
| `decodingMethod` | `'greedy_search'` (default) or `'beam_search'` |
| `onProgress` | Callback for download progress (web only) |

When `modelBaseUrl` is set, model files are fetched from that URL at init time and written to the Emscripten virtual filesystem. They are cached by the browser's HTTP cache.

## 3. Supported Model Types

### Online (streaming) models

These support real-time streaming via `createAsrOnlineStream()`:

| `modelType` | Files needed |
|---|---|
| `transducer` / `zipformer` / `zipformer2` | encoder.onnx, decoder.onnx, joiner.onnx, tokens.txt |
| `paraformer` | encoder.onnx, decoder.onnx, tokens.txt |
| `nemo_ctc` / `wenet_ctc` / `zipformer2_ctc` | model.onnx, tokens.txt |

### Offline (non-streaming) models

These process complete audio in one pass via `recognizeFromSamples()` / `recognizeFromFile()`:

| `modelType` | Files needed |
|---|---|
| `whisper` | encoder.onnx, decoder.onnx, tokens.txt |
| `moonshine` | preprocessor.onnx, encoder.onnx, uncached_decoder.onnx, cached_decoder.onnx, tokens.txt |
| `sense_voice` | model.onnx, tokens.txt |
| `fire_red_asr` | encoder.onnx, decoder.onnx, tokens.txt |
| `dolphin` | model.onnx, tokens.txt |
| `tdnn` | model.onnx, tokens.txt |
| `telespeech_ctc` | model.onnx, tokens.txt |
| `paraformer` (with `streaming: false`) | model.onnx, tokens.txt |
| `transducer` variants (with `streaming: false`) | encoder.onnx, decoder.onnx, joiner.onnx, tokens.txt |

### Model sources

**sherpa-onnx model zoo** (full catalog):
- https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
- Host model files on any CDN or static server and pass the URL as `modelBaseUrl`

### Model file layout

Your `modelBaseUrl` must serve the files listed for your model type. For example, a transducer model:
```
<modelBaseUrl>/
  encoder.onnx
  decoder.onnx
  joiner.onnx
  tokens.txt
```

Use `modelFiles` to override default file names if your model uses different names:
```typescript
modelFiles: {
  encoder: 'encoder-int8.onnx',
  decoder: 'decoder-int8.onnx',
}
```

## Full Example

See the [demo-audiolab](https://github.com/nickhitos/demo-audiolab) project for a complete working example:

- `index.ts` — WASM preloading
- `app/(tabs)/stt.tsx` — ASR with remote model URL

## Troubleshooting

**"Loading WASM..." stays for a long time**: The ~12 MB WASM binary takes time to download and compile on first visit. Subsequent visits use the browser cache.

**ASR.initialize() hangs**: Check browser console for 404 errors on model files. Verify your `modelBaseUrl` serves the required files for your model type.

**"WASM load failed"**: Check browser console for network errors. The WASM runtime loads from `cdn.jsdelivr.net` — ensure it's not blocked by your network.

**"Unsupported offline model type"**: The model type you specified isn't supported on web. Check the supported model types table above.
