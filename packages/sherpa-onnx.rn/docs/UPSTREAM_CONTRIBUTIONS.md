# Upstream Contributions Tracker

Changes made to sherpa-onnx (pinned at v1.12.28) that should be proposed upstream to https://github.com/k2-fsa/sherpa-onnx.

## 1. Combined WASM build target (NEW — upstream doesn't have this)

**Priority**: High — enables single WASM binary with all features
**Status**: Not submitted

### What
A new `wasm/combined/` build target that compiles ALL sherpa-onnx features into a single WASM binary. Upstream only has per-feature WASM targets (tts, asr, vad, kws, etc.), each with preloaded model files. The combined target:
- Exports all C API functions for all features
- No `--preload-file` — models loaded at runtime via `Module.FS.writeFile()`
- 512 MB initial memory with growth enabled

### Files
- `wasm/combined/CMakeLists.txt` (new)
- `wasm/combined/sherpa-onnx-wasm-main-combined.cc` (new)
- `CMakeLists.txt` — add `SHERPA_ONNX_ENABLE_WASM_COMBINED` option
- `wasm/CMakeLists.txt` — add `add_subdirectory(combined)`
- `build-wasm-simd-combined.sh` (new build script)

### Why upstream should care
The per-feature WASM builds force users to load multiple WASM modules if they need more than one feature. A combined build is simpler for web apps that need multiple features (e.g., VAD + ASR + TTS + punctuation).

---

## 2. ssentencepiece ThreadPool WASM fix

**Priority**: High — punctuation is completely broken in WASM without this
**Status**: Not submitted
**Upstream repo**: https://github.com/pkufool/simple-sentencepiece (dependency of sherpa-onnx)

### What
`ssentencepiece::Ssentencepiece` constructor creates a `ThreadPool` that spawns `std::thread` workers. WASM builds without `-sUSE_PTHREADS=1` abort when `std::thread` is constructed because `pthread_create` is stubbed to fail.

### Fix
In `ssentencepiece/csrc/ssentencepiece.h`, default `num_threads=0` when `__EMSCRIPTEN__` is defined:

```cpp
#ifdef __EMSCRIPTEN__
  Ssentencepiece(const std::string &vocab_path, int32_t num_threads = 0) {
#else
  Ssentencepiece(const std::string &vocab_path,
                 int32_t num_threads = std::thread::hardware_concurrency()) {
#endif
    pool_ = std::make_unique<ThreadPool>(num_threads);
    Build(vocab_path);
  }
```

`ThreadPool(0)` creates zero worker threads. The single-string `Encode()` methods (used by punctuation) don't use the pool, so this is safe.

### Impact
Without this fix, `SherpaOnnxCreateOnlinePunctuation` calls `abort()` in any WASM build. This affects all WASM punctuation usage, not just combined builds.

### Where to submit
- Primary: PR to https://github.com/pkufool/simple-sentencepiece
- Secondary: mention in sherpa-onnx issue since they vendor the dependency

---

## 3. No other upstream code changes needed

The remaining work (JS wrappers, WebSherpaOnnxImpl, model registration) is all in our own code (`@siteed/sherpa-onnx.rn` and `apps/sherpa-voice`), not in upstream sherpa-onnx.

---

## Action Items

- [ ] File issue on https://github.com/pkufool/simple-sentencepiece for the ThreadPool WASM fix (#2)
- [ ] File issue/PR on https://github.com/k2-fsa/sherpa-onnx for combined WASM build (#1)
- [ ] Reference this doc when upgrading sherpa-onnx beyond v1.12.28 — patches must be re-applied
