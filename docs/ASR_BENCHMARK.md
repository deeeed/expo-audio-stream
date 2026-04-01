# ASR Benchmark

## Purpose
This benchmark isolates Recorder-like ASR experiments in `apps/sherpa-voice` without changing the existing demo screen.

The page is designed to compare:
- practical live mobile models
- practical offline baselines
- heavier offline reference models

It intentionally does not benchmark only the likely winner. The matrix keeps weaker but useful baselines in place so tradeoffs are visible.

## Current Matrix
- `streaming-zipformer-en-20m-mobile`
  Purpose: compact live mobile baseline
- `streaming-zipformer-en-general`
  Purpose: current practical live baseline
- `streaming-zipformer-en-kroko-2025-08-06`
  Purpose: newer upstream live candidate
- `whisper-tiny-en`
  Purpose: small offline English baseline
- `whisper-small-multilingual`
  Purpose: heavier offline multilingual quality reference
- `sense-voice-zh-en-ja-ko-yue-int8-2025-09-09`
  Purpose: multilingual offline ASR reference
- `nemo-canary-180m-flash-en-es-de-fr`
  Purpose: offline translation-capable reference

## Benchmark Modes
- `Sample File`
  Runs the same local sample audio through the selected model or all downloaded matrix models.
- `Live Mic`
  Runs streaming-only models and records init time, first partial latency, first commit latency, update counts, and final transcript.

## Results
The page keeps results in memory for the current session and exports them as JSON through the clipboard.

Each result records:
- model id and name
- runtime type (`streaming` or `offline`)
- benchmark mode
- init time
- recognize time or live latency metrics
- transcript
- error, if any

## sherpa-onnx.rn Changes In This Branch
- Added ASR config fields for `language`, `task`, `useItn`, `srcLang`, `tgtLang`, and `usePnc`.
- Added `canary` to the RN ASR model type union.
- Removed web and Android hardcoded Whisper and SenseVoice defaults so benchmark settings can reach the runtime.
- Enabled Canary config planning on web and Canary config wiring on Android.

## Remaining Package Follow-Ups
- iOS bridge/codegen still needs the new ASR fields forwarded explicitly if iOS should match Android/web behavior for Whisper translation, SenseVoice options, and Canary config.
- The vendored Sherpa runtime is still behind upstream `v1.12.34`. Updating it should be treated as a separate validated package refresh, not assumed from the benchmark UI work.
- If benchmarking becomes a permanent workflow, some timing and transcript instrumentation may belong in `sherpa-onnx.rn` instead of staying app-local.

## Translation Note
This branch still focuses on Recorder-like live transcription first.

Translation remains a reference track because:
- the current practical live path in Sherpa for RN is streaming ASR, not true streaming translation
- the included local sample assets are English-only
- Canary is useful for offline translation feasibility, not as a drop-in replacement for Google Recorder style live UX
