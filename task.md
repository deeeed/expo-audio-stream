# Recorder-Like ASR Benchmark Task

## Objective
Create a separate `sherpa-voice` benchmark page for recorder-like transcription experiments so multiple ASR models can be compared without changing the existing feature demos.

## Success Criteria
- New benchmark page exists under the `sherpa-voice` feature stack.
- The page supports repeatable `sample file` benchmarks across multiple ASR models.
- The page supports `live mic` benchmarks for streaming models with latency-oriented metrics.
- Benchmark results are kept in-session and can be copied/exported.
- The RN ASR config surface supports model-specific fields needed for fair comparisons instead of hardcoded Whisper/SenseVoice defaults.

## Benchmark Scope
- Android-first
- On-device-first
- English-first
- Transcription-first

## Initial Model Matrix
- `streaming-zipformer-en-20m-mobile`
- `streaming-zipformer-en-general`
- `streaming-zipformer-en-kroko-2025-08-06`
- `whisper-tiny-en`
- `whisper-small-multilingual`
- `sense-voice-zh-en-ja-ko-yue-int8-2025-09-09`
- `nemo-canary-180m-flash-en-es-de-fr`

## Metrics To Capture
- model id
- benchmark mode (`sample` or `live`)
- init time
- run duration
- first partial latency
- first commit latency
- trailing commit latency after last audio chunk
- transcript output
- error state

## Notes
- Translation stays experimental in this PR; the first benchmark focus is Recorder-like transcription responsiveness.
- Upstream Sherpa freshness should be tracked separately from any claim about rebuilt native binaries.
- The benchmark matrix intentionally includes non-winner baselines so recommendations are based on tradeoffs, not only on the strongest model.
- `packages/sherpa-onnx.rn` is part of the scope: package-level hardcoded ASR defaults were removed where needed for fair benchmarking, and remaining bridge/runtime gaps are documented in `docs/ASR_BENCHMARK.md`.
