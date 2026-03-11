# WASM Build Guide

This document explains how to build the sherpa-onnx WebAssembly binaries used by the web platform in `apps/sherpa-voice`.

## Prerequisites

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.53
./emsdk activate 3.1.53
source ./emsdk_env.sh
```

Verify: `emcc --version` should print version 3.1.53.

> **Note:** Newer versions of emsdk may also work but 3.1.53 is tested.

---

## Build Scripts

All scripts live in `packages/sherpa-onnx.rn/`. They delegate to upstream build scripts inside `third_party/sherpa-onnx/`.

### Combined Build (recommended for demo app)

Builds a single WASM binary with **all** features: Online ASR, Offline TTS, VAD, KWS, Speaker Diarization, Speech Enhancement.
No model files are preloaded — they are fetched at runtime from the web server.

```bash
cd packages/sherpa-onnx.rn
./build-sherpa-wasm.sh --combined
```

Output files are copied to:
- `packages/sherpa-onnx.rn/prebuilt/web/combined/sherpa-onnx-wasm-combined.{js,wasm}`
- `apps/sherpa-voice/public/wasm/sherpa-onnx-wasm-combined.{js,wasm}` (deployed directly)

### Per-Feature Builds

Use these when you need a standalone build for a single feature (with models preloaded into `.data`):

```bash
./build-sherpa-wasm.sh --tts
./build-sherpa-wasm.sh --asr
./build-sherpa-wasm.sh --vad
./build-sherpa-wasm.sh --kws
./build-sherpa-wasm.sh --speaker-diarization
./build-sherpa-wasm.sh --speech-enhancement
```

Per-feature builds require model assets in the corresponding `third_party/sherpa-onnx/wasm/{feature}/assets/` directory before building. See the README.md in each assets directory.

---

## Combined WASM Architecture

```
sherpa-onnx-wasm-combined.js   ← Emscripten JS loader (auto-generated)
sherpa-onnx-wasm-combined.wasm ← Compiled C++ (all features, ~19 MB)
```

The combined binary is built from:
- **Source**: `third_party/sherpa-onnx/wasm/combined/sherpa-onnx-wasm-main-combined.cc`
- **CMake**: `third_party/sherpa-onnx/wasm/combined/CMakeLists.txt`
- **Build script**: `third_party/sherpa-onnx/build-wasm-simd-combined.sh`

### Exported C API Functions

The combined WASM exports these function groups:

| Group | Key Functions |
|-------|--------------|
| Online ASR | `SherpaOnnxCreateOnlineRecognizer`, `SherpaOnnxCreateOnlineStream`, `SherpaOnnxDecodeOnlineStream`, `SherpaOnnxGetOnlineStreamResultAsJson` |
| Offline TTS | `SherpaOnnxCreateOfflineTts`, `SherpaOnnxOfflineTtsGenerate`, `SherpaOnnxOfflineTtsSampleRate` |
| VAD | `SherpaOnnxCreateVoiceActivityDetector`, `SherpaOnnxVoiceActivityDetectorAcceptWaveform`, `SherpaOnnxVoiceActivityDetectorDetected` |
| KWS | `SherpaOnnxCreateKeywordSpotter`, `SherpaOnnxCreateKeywordStream`, `SherpaOnnxDecodeKeywordStream`, `SherpaOnnxGetKeywordResult` |
| Speaker Diarization | `SherpaOnnxCreateOfflineSpeakerDiarization`, `SherpaOnnxOfflineSpeakerDiarizationProcess`, `SherpaOnnxOfflineSpeakerDiarizationResultSortByStartTime` |
| Speech Enhancement | `SherpaOnnxCreateOfflineSpeechDenoiser`, `SherpaOnnxOfflineSpeechDenoiserRun`, `SherpaOnnxDestroyDenoisedAudio` |
| Utilities | `CopyHeap`, `SherpaOnnxReadWave`, `SherpaOnnxWriteWave`, `SherpaOnnxFileExists` |

Full list in `wasm/combined/CMakeLists.txt`.

### CMake Flags

```cmake
-DSHERPA_ONNX_ENABLE_WASM=ON
-DSHERPA_ONNX_ENABLE_WASM_COMBINED=ON
-DSHERPA_ONNX_ENABLE_TTS=ON           # required for TTS + Speaker Diarization
-DSHERPA_ONNX_ENABLE_SPEAKER_DIARIZATION=ON
-DSHERPA_ONNX_ENABLE_C_API=ON
-DSHERPA_ONNX_ENABLE_BINARY=OFF
-s INITIAL_MEMORY=512MB
-s ALLOW_MEMORY_GROWTH=1
-s FORCE_FILESYSTEM=1
```

### Key Build Differences vs Per-Feature Builds

| | Per-Feature | Combined |
|--|------------|---------|
| Models | Preloaded via `--preload-file` (.data file) | None — loaded at runtime |
| Memory | Feature-specific (64MB–512MB) | 512MB initial |
| Output | `sherpa-onnx-wasm-main-{feature}.{js,wasm,data}` | `sherpa-onnx-wasm-combined.{js,wasm}` |
| Use case | Standalone demo pages | React Native Web / Expo Web app |

---

## Model Loading Flow (Runtime)

The demo app loads models dynamically:

```
Web browser fetches model from /wasm/{feature}/{model.onnx}
  └── SherpaOnnx.FileSystem.safeLoadFile(url, fsPath)
        └── Module.FS.writeFile(fsPath, uint8array)  ← Emscripten virtual FS
              └── C API create functions reference FS paths as strings
```

Model files are served as static files from `apps/sherpa-voice/public/wasm/`.

---

## Analysis: Why the Original Combined WASM Lacks Denoising/Diarization

The original `sherpa-onnx-wasm-combined.{js,wasm}` (built from the `deeeed/sherpa-onnx#webwasm` fork) only exported 80 functions with minified names (J, K, L...). Inspection via `node + WebAssembly.Module.exports()` confirmed:

```
Total WASM exports: 82 (80 functions, 1 memory, 1 table)
Function names: J, K, L, M, N, ... (closure-compiler minified)
SherpaOnnxCreateOfflineSpeechDenoiser: NOT PRESENT
SherpaOnnxCreateOfflineSpeakerDiarization: NOT PRESENT
```

The fork was built without `-DSHERPA_ONNX_ENABLE_TTS=ON` and `-DSHERPA_ONNX_ENABLE_SPEAKER_DIARIZATION=ON`, which are required to compile the TTS and diarization C code (both use conditional compilation: `#if SHERPA_ONNX_ENABLE_TTS == 1` and `#if SHERPA_ONNX_ENABLE_SPEAKER_DIARIZATION == 1` in `c-api.cc`).

### Upstream Status

The upstream k2-fsa/sherpa-onnx has no "combined" or "all" WASM build — only per-feature builds in `wasm/{asr,tts,vad,kws,speaker-diarization,speech-enhancement}`. Each produces a separate `.wasm` with its own `.data` preloaded model file.

### Our Patch

We added `wasm/combined/` to the upstream third_party copy:
- `wasm/combined/CMakeLists.txt` — exports all feature functions, no `--preload-file`
- `wasm/combined/sherpa-onnx-wasm-main-combined.cc` — minimal C++ entry point
- `build-wasm-simd-combined.sh` — upstream-style build script
- `CMakeLists.txt` updated: added `SHERPA_ONNX_ENABLE_WASM_COMBINED` option
- `wasm/CMakeLists.txt` updated: adds `combined` subdirectory when enabled

### Build Result (Verified)

```
Old combined WASM:  19.5 MB .wasm — Missing diarization/denoising
New combined WASM:  12 MB .wasm  — All 72+ functions present
```

Verification via `node -e`:
```
PRESENT _SherpaOnnxCreateOfflineSpeechDenoiser     ✓ NEW
PRESENT _SherpaOnnxDestroyOfflineSpeechDenoiser    ✓ NEW
PRESENT _SherpaOnnxOfflineSpeechDenoiserRun        ✓ NEW
PRESENT _SherpaOnnxCreateOfflineSpeakerDiarization ✓ NEW
PRESENT _SherpaOnnxOfflineSpeakerDiarizationProcess ✓ NEW
PRESENT _SherpaOnnxCreateOnlineRecognizer          ✓ existing
PRESENT _SherpaOnnxCreateOfflineTts                ✓ existing
PRESENT _SherpaOnnxCreateVoiceActivityDetector     ✓ existing
PRESENT _SherpaOnnxCreateKeywordSpotter            ✓ existing
```

## Adding New Exported Functions

To export additional C API functions in the combined build:

1. Add the function name to `set(exported_functions ...)` in `wasm/combined/CMakeLists.txt`
2. Rebuild: `./build-sherpa-wasm.sh --combined`
3. Copy output: auto-copied to `apps/sherpa-voice/public/wasm/`

---

## Troubleshooting

### `EEXIST` error on directory creation

Emscripten uses `errno=20` for EEXIST (POSIX uses 17). JS code must check `e.errno !== 20` (not `e.code !== 'EEXIST'`).

### Memory access out of bounds

- Verify struct size assertions in the `.cc` file match the actual C struct sizes
- Run: `grep "static_assert" wasm/*/sherpa-onnx-wasm-main-*.cc`

### LM config float pointer crash

When using `OnlineRecognizer` without a language model, set `lm_config.scale = 0.0` (not `1.0`). Float `1.0` is `0x3F800000` ≈ 1 GB, which exceeds 512 MB WASM memory limit when read as a pointer.

### Build fails with "Please use ./build-wasm-simd-combined.sh"

The cmake guard checks `$ENV{SHERPA_ONNX_IS_USING_BUILD_WASM_SH}`. Set this env var or use the build script directly.
