# Web / WASM Feature Parity Plan

## Overview

The sherpa-onnx-demo app runs on iOS, Android, and web. This document describes the architecture for web/WASM feature parity, which features are implemented, and how to extend them.

## Architecture

```
Browser
  └── WebSherpaOnnxImpl.ts
        ├── loadCombinedWasm()
        │     ├── sherpa-onnx-wasm-combined.js   ← Emscripten WASM binary (all features)
        │     ├── sherpa-onnx-wasm-combined.wasm ← Compiled C++ native code
        │     ├── /wasm/tts/sherpa-onnx-tts.js   ← Defines global createOfflineTts()
        │     └── sherpa-onnx-combined.js         ← Loads feature JS modules sequentially:
        │           ├── sherpa-onnx-core.js       ← FileSystem utilities, Utils
        │           ├── sherpa-onnx-vad.js        ← VAD.loadModel / createVoiceActivityDetector
        │           ├── sherpa-onnx-asr.js        ← ASR.loadModel / createOnlineRecognizer
        │           ├── sherpa-onnx-tts.js        ← TTS.loadModel / createOfflineTts
        │           ├── sherpa-onnx-speaker.js    ← SpeakerDiarization (placeholder)
        │           ├── sherpa-onnx-enhancement.js← SpeechEnhancement (placeholder)
        │           └── sherpa-onnx-kws.js        ← KWS.loadModel / createKeywordSpotter
        │
        └── per-feature init methods:
              initTts()      → SherpaOnnx.TTS.loadModel + createOfflineTts
              initVad()      → SherpaOnnx.VAD.loadModel + createVoiceActivityDetector
              initAsr()      → SherpaOnnx.ASR.loadModel + createOnlineRecognizer
              initKws()      → SherpaOnnx.KWS.loadModel + createKeywordSpotter
              initDenoiser() → Not implemented (C API not in combined WASM build)
              initDiarization() → Not implemented (C API not in combined WASM build)
```

## Emscripten Virtual Filesystem Flow

```
Model files served at /wasm/{feature}/
        ↓  (SherpaOnnx.FileSystem.safeLoadFile)
Emscripten virtual FS (in-memory)
        ↓
C API functions (_SherpaOnnxCreate*, etc.)
        ↓
Inference result
```

1. Model files are served as static files from `apps/sherpa-onnx-demo/public/wasm/`
2. `safeLoadFile(url, fsPath)` fetches the URL and writes bytes to `Module.FS.writeFile(fsPath, uint8array)`
3. C API functions reference FS paths as strings
4. Results are read back from WASM HEAP via typed arrays

## Feature Status Table

| Feature | Status | WASM Support | JS Helper | Preloaded Models | Notes |
|---------|--------|-------------|-----------|-----------------|-------|
| TTS (VITS) | **Working** | Combined | sherpa-onnx-tts.js | `/wasm/tts/model.onnx` (78 MB) | Loads on init |
| VAD | **Working** | Combined | sherpa-onnx-vad.js (complete) | `/wasm/vad/silero_vad.onnx` (1.7 MB) | Speech detected, no segment timestamps |
| ASR (online streaming zipformer) | **Working** | Combined | sherpa-onnx-asr.js | `/wasm/asr/*.onnx` (~200 MB) | Uses OnlineRecognizer (streaming models) |
| KWS | **Working** | Combined | sherpa-onnx-kws.js | `/wasm/kws/*.onnx` (~16 MB) | Keyword file required |
| Speech Denoising | Not possible | Missing C API | placeholder | `/wasm/enhancement/gtcrn.onnx` | `_SherpaOnnxCreateOfflineSpeechDenoiser` not exported |
| Speaker Diarization | Not possible | Missing C API | placeholder | `/wasm/speakers/*.onnx` | `_SherpaOnnxCreateOfflineSpeakerDiarization` not exported |
| Speaker ID | Not possible | Missing C API | none | none | Not in combined WASM build |
| Audio Tagging | Not possible | Not built | none | none | Separate WASM build needed |
| Language ID | Not possible | Not built | none | none | Separate WASM build needed |
| Punctuation | Not possible | Not built | none | none | Separate WASM build needed |
| Streaming ASR | Possible | Combined | sherpa-onnx-asr.js | `/wasm/asr/*.onnx` | Same models as batch ASR; no streaming UI |

## Per-Feature Implementation Notes

### TTS
- Model: VITS piper-en (`/wasm/tts/model.onnx`, 78 MB)
- Espeak data: `/wasm/tts/espeak-ng-data.zip` (9 MB, auto-extracted via JSZip)
- Init time: ~10-30s depending on connection (model download)
- `SherpaOnnx.TTS.loadModel` uses `prepareModelDirectory` to create a timestamped model dir
- `createOfflineTts` global (from `/wasm/tts/sherpa-onnx-tts.js`) is called by `createOfflineTtsInternal`

### VAD (Voice Activity Detection)
- Model: Silero VAD (`/wasm/vad/silero_vad.onnx`, 1.7 MB)
- `VoiceActivityDetector.detected()` returns boolean — no segment start/end timestamps
- To get segments, the C API `SherpaOnnxVoiceActivityDetectorFront/Pop` would need to be wrapped in the JS helper
- Current web implementation returns `{ isSpeechDetected, segments: [] }`

### ASR (Online Streaming Transducer)
- Models: encoder/decoder/joiner + tokens (~200 MB total in `/wasm/asr/`)
- Uses `OnlineRecognizer` (streaming model with `inputFinished()` for batch file recognition)
- The preloaded models are **online** (streaming) zipformer models — NOT offline batch models
- `recognizeFromSamples(sampleRate, samples)` is implemented using the online flow
- `recognizeFromFile(filePath)` uses fetch() + WAV decoder (16-bit PCM only)
- Result: `{ text: string }`
- **Key struct fix**: `lm_config.scale` must be `0.0` (not `1.0`) when no LM model is used,
  to avoid the float value `0x3F800000` (~1GB) being read as a pointer and exceeding 512MB WASM memory

### KWS (Keyword Spotting)
- Models: encoder/decoder/joiner + tokens from `/wasm/kws/`
- Keywords specified as phoneme strings in `sherpa-onnx format` (e.g. `"h e l l o @Hello"`)
- Stream persists between `acceptKwsWaveform` calls
- Auto-resets stream after keyword detection

### Speech Denoising (Not implementable with current WASM build)
- Model: GTCRN (`/wasm/enhancement/gtcrn.onnx`, preloaded)
- The combined WASM binary does NOT export `_SherpaOnnxCreateOfflineSpeechDenoiser`
- To implement: rebuild WASM with `-DSHERPA_ONNX_ENABLE_DENOISING=ON` and add exported function

### Speaker Diarization (Not implementable with current WASM build)
- Models: segmentation + embedding from `/wasm/speakers/`
- The combined WASM binary does NOT export `_SherpaOnnxCreateOfflineSpeakerDiarization`
- To implement: rebuild WASM with diarization exports

## Model Files Reference

| Path | Size | Feature | Description |
|------|------|---------|-------------|
| `/wasm/tts/model.onnx` | 78.5 MB | TTS | VITS piper EN model |
| `/wasm/tts/tokens.txt` | 5 KB | TTS | Phoneme tokens |
| `/wasm/tts/espeak-ng-data.zip` | 9 MB | TTS | Espeak phoneme data |
| `/wasm/vad/silero_vad.onnx` | 1.7 MB | VAD | Silero VAD model |
| `/wasm/asr/encoder.onnx` | ~181 MB | ASR | Online zipformer encoder |
| `/wasm/asr/decoder.onnx` | ~14 MB | ASR | Online zipformer decoder |
| `/wasm/asr/joiner.onnx` | ~3 MB | ASR | Online zipformer joiner |
| `/wasm/asr/tokens.txt` | ~55 KB | ASR | Vocabulary tokens |
| `/wasm/kws/encoder.onnx` | ~8 MB | KWS | KWS transducer encoder |
| `/wasm/kws/decoder.onnx` | ~1 MB | KWS | KWS transducer decoder |
| `/wasm/kws/joiner.onnx` | ~1 MB | KWS | KWS transducer joiner |
| `/wasm/kws/tokens.txt` | ~10 KB | KWS | KWS vocabulary tokens |
| `/wasm/enhancement/gtcrn.onnx` | ~5 MB | Denoising | GTCRN denoiser (not usable — C API not exported) |
| `/wasm/speakers/embedding.onnx` | ~5 MB | Diarization | Speaker embedding (not usable — C API not exported) |
| `/wasm/speakers/segmentation.onnx` | ~10 MB | Diarization | Pyannote segmentation (not usable — C API not exported) |
| `/wasm/test-en.wav` | ~500 KB | Testing | 16-bit PCM 16kHz WAV for ASR testing |

## Loading Sequence

```
1. loadCombinedWasm() called
   ├── window.onSherpaOnnxReady promise set up
   ├── sherpa-onnx-wasm-combined.js loaded (Emscripten WASM setup)
   ├── /wasm/tts/sherpa-onnx-tts.js loaded (defines global createOfflineTts)
   ├── sherpa-onnx-combined.js loaded (hooks WASM init, queues feature module loading)
   └── WASM binary initializes → feature modules load → onSherpaOnnxReady fires

2. Per-feature init (lazy, on first use)
   └── Model files fetched → written to WASM FS → C API create functions called
```

## Known Limitations

1. **Online ASR only**: The preloaded `/wasm/asr/` models are online (streaming) zipformer models. Offline batch models (Whisper, paraformer, etc.) would need separate model files.
2. **No segment timestamps from VAD**: The JS wrapper doesn't expose `front()/pop()` for speech segments
3. **File path ASR**: `recognizeFromFile` only supports 16-bit PCM WAV files
4. **Large initial downloads**: ASR requires ~200MB model download on first init; TTS requires 87+ MB
5. **Memory**: Combined WASM uses `INITIAL_MEMORY=512MB, ALLOW_MEMORY_GROWTH=1` — large footprint
6. **Single WASM context**: Only one WASM module can be active; all features share it
7. **Denoising/Diarization/Speaker ID**: Not in combined WASM build — require separate WASM rebuild with additional C API exports
8. **Audio Tagging/Language ID/Punctuation**: Not included in combined WASM build — require separate builds
9. **Emscripten FS errno**: Emscripten uses errno=20 for EEXIST (POSIX uses 17) — JS modules must check `e.errno !== 20` to safely handle existing directories
10. **Web model auto-selection**: Web uses `DEFAULT_WEB_ASR_MODEL_ID`, `DEFAULT_WEB_VAD_MODEL_ID`, `DEFAULT_WEB_KWS_MODEL_ID` constants to inject preloaded model states into the model management context

## Rebuilding Combined WASM

If you need to rebuild the combined WASM with updated models or additional C API exports:

```bash
# From the sherpa-onnx source tree
cd sherpa-onnx
./build-wasm-simd-all.sh   # Builds sherpa-onnx-wasm-combined.{js,wasm}

# Copy outputs to the demo app
cp build-wasm-simd/sherpa-onnx-wasm-combined.{js,wasm} \
   apps/sherpa-onnx-demo/public/wasm/
```

To add denoising/diarization support, the WASM build needs these additional exported functions:
- `_SherpaOnnxCreateOfflineSpeechDenoiser`
- `_SherpaOnnxOfflineSpeechDenoiserRun`
- `_SherpaOnnxDestroyOfflineSpeechDenoiser`
- `_SherpaOnnxCreateOfflineSpeakerDiarization`
- `_SherpaOnnxOfflineSpeakerDiarizationProcess`
- `_SherpaOnnxDestroyOfflineSpeakerDiarization`

The WASM build flags used:
```cmake
-DSHERPA_ONNX_ENABLE_TTS=ON
-DSHERPA_ONNX_ENABLE_SPEAKER_DIARIZATION=ON
-DSHERPA_ONNX_ENABLE_BINARY=OFF
-s INITIAL_MEMORY=512MB
-s ALLOW_MEMORY_GROWTH=1
-s EXPORTED_FUNCTIONS=[...]
```

## Verification Steps

```bash
# Start dev server
cd apps/sherpa-onnx-demo && npx expo start --web --port 7500

# Open browser at http://localhost:7500
# Open DevTools → Console

# Expected on page load:
# "All SherpaOnnx modules loaded successfully"

# Navigate to Features → TTS → Initialize
# Wait ~30s for 87MB model download
# Generate "Hello world" → should play audio

# Navigate to Features → VAD → Initialize
# Click "Detect Speech" on JFK audio → should detect speech (isSpeechDetected=true)

# Navigate to Features → ASR → Initialize (loads ~200MB encoder)
# Wait for init → Click "Recognize Speech" on JFK audio → should return transcript

# Navigate to Features → KWS → Initialize
# Say configured keywords → should detect (or test via testKWSFull agentic method)
```

## Cross-Platform File Reading

All file reading in feature pages uses `src/utils/fileUtils.ts`:

```typescript
// Works on both web (fetch) and native (expo-file-system)
import { readFileAsArrayBuffer, readFileAsText, fileExists } from '../utils/fileUtils';

const buffer = await readFileAsArrayBuffer(audioUri);
const text = await readFileAsText(textFileUri);
const exists = await fileExists(uri);
```

On web: uses `fetch()` — works with http:// and relative URLs served by dev server.
On native: uses `expo-file-system/legacy` with Base64 decoding.
