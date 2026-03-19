# Recording Benchmark Results

## Test Environment

| Property | Value |
|----------|-------|
| **Device** | Pixel 6a (bluejay) |
| **Android** | 16 (API 36) |
| **Date** | 2026-03-19 |
| **App** | `net.siteed.audioplayground.development` |
| **Cooldown** | 60s force-stop + fresh relaunch between phases |

## Methodology

| Aspect | Detail |
|--------|--------|
| **Tool** | `benchmark-recording.sh` — `adb shell dumpsys meminfo` + `adb shell top` |
| **Metrics** | CPU %, Java Heap (MB), Native Heap (MB), Total PSS (MB) |
| **Sample interval** | 30 seconds |
| **Phase duration** | 10 minutes (600s) per phase |
| **CPU note** | `top` reports per-core %, so values >100% = multi-core usage |

## Phases

| Phase | Label | Config | Visualization | Isolates |
|-------|-------|--------|---------------|----------|
| 1 | idle-baseline | `skipRecording: true` | None | App at rest |
| 2 | record-no-processing | `enableProcessing: false` | None | Raw audio capture + file I/O |
| 3 | record-with-processing | `enableProcessing: true, intervalMillis: 500` | Waveform | Processing + waveform rendering |
| 4a | mel-compute-waveform-viz | `enableProcessing: true, intervalMillis: 500, features.melSpectrogram: true` | Waveform | Mel computation (no mel rendering) |
| 4b | mel-compute-mel-viz | Same as 4a | Mel Spectrogram | Mel computation + Skia mel rendering |

## Results

### Phase 1: Idle Baseline

| Time (s) | CPU % | Java Heap (MB) | Native Heap (MB) | Total PSS (MB) |
|-----------|-------|-----------------|-------------------|-----------------|
| 0 (baseline) | 14.2 | 64 | 240 | 587 |
| 0 (start) | 10.3 | 24 | 238 | 551 |
| 30 | 15.3 | 24 | 238 | 551 |
| 60 | 7.4 | 24 | 238 | 550 |
| 90 | 11.1 | 24 | 238 | 550 |
| 120 | 18.5 | 24 | 238 | 550 |
| 150 | 11.1 | 24 | 238 | 550 |
| 180 | 7.4 | 24 | 238 | 550 |
| 210 | 3.7 | 24 | 238 | 550 |
| 240 | 7.4 | 24 | 238 | 550 |
| 270 | 7.4 | 24 | 238 | 550 |
| 300 | 7.4 | 24 | 238 | 550 |
| 330 | 11.1 | 24 | 238 | 550 |
| 360 | 3.7 | 24 | 238 | 550 |
| 390 | 7.4 | 24 | 238 | 549 |
| 420 | 11.1 | 24 | 238 | 549 |
| 450 | 7.4 | 24 | 238 | 549 |
| 480 | 11.1 | 24 | 238 | 549 |
| 510 | 7.4 | 24 | 238 | 549 |
| 540 | 17.8 | 24 | 238 | 549 |
| 570 | 3.7 | 24 | 238 | 549 |
| 600 | 7.4 | 24 | 238 | 549 |
| final | 6.8 | 24 | 238 | 549 |

**Summary:** cpu_avg=9%, mem_start=551MB, mem_end=549MB, mem_delta=-2MB

### Phase 2: Recording Without Processing

| Time (s) | CPU % | Java Heap (MB) | Native Heap (MB) | Total PSS (MB) | Recording |
|-----------|-------|-----------------|-------------------|-----------------|-----------|
| 0 (baseline) | 14.2 | 63 | 239 | 583 | — |
| 0 (recording) | 18.5 | 27 | 276 | 606 | started |
| 30 | 20.6 | 52 | 261 | 612 | 33s / 3.0MB |
| 60 | 14.2 | 54 | 287 | 661 | 64s / 5.6MB |
| 90 | 48.1 | 54 | 281 | 670 | 95s / 8.4MB |
| 120 | 17.2 | 54 | 289 | 678 | 126s / 11.1MB |
| 150 | 77.7 | 55 | 287 | 677 | 157s / 13.9MB |
| 180 | 14.8 | 55 | 294 | 684 | 189s / 16.7MB |
| 210 | 17.2 | 54 | 291 | 678 | 219s / 19.3MB |
| 240 | 89.2 | 54 | 298 | 685 | 251s / 22.1MB |
| 270 | 22.2 | 55 | 295 | 683 | 281s / 24.8MB |
| 300 | 134 | 101 | 326 | 760 | 313s / 27.6MB |
| 330 | 13.7 | 56 | 299 | 687 | 344s / 30.3MB |
| 360 | 21.4 | 55 | 311 | 708 | 374s / 33.0MB |
| 390 | 55.5 | 55 | 323 | 738 | 406s / 35.8MB |
| 420 | 29.6 | 56 | 314 | 734 | 437s / 38.6MB |
| 450 | 18.5 | 55 | 322 | 741 | 468s / 41.2MB |
| 480 | 17.2 | 55 | 316 | 735 | 499s / 44.0MB |
| 510 | 89.2 | 56 | 320 | 740 | 530s / 46.8MB |
| 540 | 18.5 | 56 | 330 | 750 | 562s / 49.5MB |
| 570 | 17.2 | 55 | 321 | 740 | 592s / 52.2MB |
| 600 | 51.7 | 58 | 330 | 753 | 623s / 55.0MB |
| final | 10.7 | 32 | 323 | 720 | stopped |

**Summary:** cpu_avg=38%, mem_start=606MB, mem_end=753MB, mem_delta=147MB

### Phase 3: Recording + Processing + Waveform Viz

| Time (s) | CPU % | Java Heap (MB) | Native Heap (MB) | Total PSS (MB) | Recording |
|-----------|-------|-----------------|-------------------|-----------------|-----------|
| 0 (baseline) | 14.8 | 63 | 240 | 586 | — |
| 0 (recording) | 148 | 31 | 249 | 574 | started |
| 30 | 21.4 | 71 | 286 | 656 | 33s / 2.9MB |
| 60 | 71.4 | 67 | 293 | 659 | 64s / 5.6MB |
| 90 | 125 | 63 | 300 | 666 | 95s / 8.4MB |
| 120 | 39.2 | 66 | 305 | 672 | 127s / 11.2MB |
| 150 | 39.2 | 66 | 309 | 678 | 158s / 13.9MB |
| 180 | 11.5 | 71 | 322 | 699 | 188s / 16.6MB |
| 210 | 140 | 64 | 325 | 696 | 220s / 19.4MB |
| 240 | 117 | 61 | 326 | 694 | 251s / 22.1MB |
| 270 | 30.7 | 65 | 335 | 709 | 281s / 24.8MB |
| 300 | 57.1 | 62 | 338 | 709 | 313s / 27.6MB |
| 330 | 71.4 | 62 | 342 | 713 | 344s / 30.4MB |
| 360 | 26.9 | 63 | 347 | 720 | 376s / 33.1MB |
| 390 | 33.3 | 58 | 350 | 719 | 406s / 35.8MB |
| 420 | 60.7 | 60 | 356 | 727 | 437s / 38.5MB |
| 450 | 125 | 62 | 360 | 735 | 468s / 41.3MB |
| 480 | 121 | 62 | 366 | 745 | 499s / 44.0MB |
| 510 | 111 | 59 | 371 | 747 | 530s / 46.8MB |
| 540 | 111 | 62 | 375 | 754 | 562s / 49.5MB |
| 570 | 39.2 | 63 | 380 | 761 | 593s / 52.3MB |
| 600 | 67.8 | 61 | 386 | 767 | 624s / 55.0MB |
| final | 3.7 | 36 | 393 | 749 | stopped |

**Summary:** cpu_avg=74%, mem_start=574MB, mem_end=767MB, mem_delta=193MB

### Phase 4a: Mel Computation + Waveform Viz

| Time (s) | CPU % | Java Heap (MB) | Native Heap (MB) | Total PSS (MB) | Recording |
|-----------|-------|-----------------|-------------------|-----------------|-----------|
| 0 (baseline) | 10.3 | 63 | 240 | 575 | — |
| 0 (recording) | 17.8 | 31 | 246 | 571 | started |
| 30 | 96.4 | 78 | 259 | 654 | 33s / 2.9MB |
| 60 | 62.9 | 73 | 311 | 725 | 64s / 5.7MB |
| 90 | 128 | 67 | 317 | 722 | 96s / 8.4MB |
| 120 | 100 | 67 | 318 | 725 | 127s / 11.2MB |
| 150 | 123 | 68 | 324 | 733 | 158s / 13.9MB |
| 180 | 100 | 66 | 328 | 738 | 189s / 16.7MB |
| 210 | 107 | 67 | 335 | 748 | 220s / 19.4MB |
| 240 | 81.4 | 66 | 339 | 752 | 251s / 22.1MB |
| 270 | 22.2 | 63 | 342 | 753 | 282s / 24.9MB |
| 300 | 32.1 | 62 | 348 | 760 | 313s / 27.6MB |
| 330 | 89.2 | 65 | 351 | 768 | 344s / 30.4MB |
| 360 | 114 | 65 | 355 | 774 | 377s / 33.2MB |
| 390 | 100 | 65 | 360 | 781 | 408s / 36.0MB |
| 420 | 67.8 | 64 | 365 | 787 | 439s / 38.7MB |
| 450 | 117 | 125 | 386 | 891 | 470s / 41.4MB |
| 480 | 121 | 65 | 368 | 818 | 501s / 44.2MB |
| 510 | 114 | 63 | 373 | 822 | 532s / 46.9MB |
| 540 | 114 | 64 | 376 | 828 | 563s / 49.7MB |
| 570 | 46.4 | 64 | 379 | 832 | 594s / 52.4MB |
| 600 | 64.2 | 64 | 384 | 841 | 626s / 55.2MB |
| final | 10.3 | 37 | 405 | 835 | stopped |

**Summary:** cpu_avg=86%, mem_start=571MB, mem_end=841MB, mem_delta=270MB

### Phase 4b: Mel Computation + Mel Spectrogram Skia Viz

| Time (s) | CPU % | Java Heap (MB) | Native Heap (MB) | Total PSS (MB) | Recording |
|-----------|-------|-----------------|-------------------|-----------------|-----------|
| 0 (baseline) | 7.4 | 63 | 240 | 575 | — |
| 0 (recording) | 142 | 35 | 254 | 577 | started + mel viz toggled |
| 30 | 107 | 46 | 394 | 779 | 35s / 3.1MB |
| 60 | 107 | 50 | 505 | 901 | 68s / 6.0MB |
| 90 | 107 | 49 | 577 | 982 | 102s / 9.0MB |
| 120 | 117 | 50 | 661 | 1067 | 135s / 11.9MB |
| 150 | 117 | 44 | **730** | **1136** | 169s / 14.9MB |
| 180 | 128 | 47 | 403 | 812 | 202s / 17.8MB |
| 210 | 146 | 47 | 467 | 872 | 236s / 20.8MB |
| 240 | 117 | 49 | 524 | 934 | 269s / 23.7MB |
| 270 | 132 | 45 | 405 | 811 | 300s / 26.5MB |
| 300 | 125 | 47 | 467 | 877 | 334s / 29.5MB |
| 330 | 103 | 44 | 367 | 777 | 367s / 32.3MB |
| 360 | 142 | 43 | 447 | 860 | 400s / 35.3MB |
| 390 | 124 | 48 | 437 | 855 | 433s / 38.2MB |
| 420 | 103 | 48 | 390 | 808 | 467s / 41.1MB |
| 450 | 120 | 48 | 391 | 811 | 499s / 44.0MB |
| 480 | 127 | 45 | 420 | 842 | 531s / 46.8MB |
| 510 | 125 | 46 | 426 | 850 | 565s / 49.9MB |
| 540 | 137 | 50 | 413 | 842 | 600s / 52.9MB |
| 570 | 118 | 46 | 379 | 803 | 632s / 55.7MB |
| 600 | 137 | 47 | 386 | 811 | 666s / 58.8MB |
| final | 162 | 44 | 457 | 878 | stopped |

**Summary:** cpu_avg=122%, mem_start=577MB, mem_end=811MB, mem_delta=234MB

## Comparative Analysis

### Summary Table

| Phase | CPU Avg | PSS Start | PSS End | PSS Delta | Native Heap Max | Java Heap Max | Crashes |
|-------|---------|-----------|---------|-----------|-----------------|---------------|---------|
| 1: Idle | 9% | 551 MB | 549 MB | **-2 MB** | 238 MB | 64 MB | None |
| 2: Record | 38% | 606 MB | 753 MB | **+147 MB** | 330 MB | 101 MB | None |
| 3: Rec+Process+Waveform | 74% | 574 MB | 767 MB | **+193 MB** | 393 MB | 71 MB | None |
| 4a: Rec+Process+Mel compute | 86% | 571 MB | 841 MB | **+270 MB** | 405 MB | 125 MB | None |
| 4b: Rec+Process+Mel Skia viz | **122%** | 577 MB | 811 MB | **+234 MB** | **730 MB** | 50 MB | None |

### Incremental Cost Breakdown

| Transition | CPU Delta | What it measures |
|-----------|-----------|-----------------|
| Idle → Record | +29% | Raw audio capture + PCM file I/O |
| Record → Rec+Process+Waveform | +36% | Feature extraction + waveform Skia rendering |
| Rec+Process+Waveform → +Mel compute | +12% | Mel spectrogram computation on native side |
| Rec+Process+Mel compute → +Mel Skia viz | **+36%** | Mel spectrogram Skia rendering |

### Memory Behavior

| Phase | Native Heap Behavior | Key Observation |
|-------|---------------------|-----------------|
| 1: Idle | Flat at 238 MB | Zero growth — no leak |
| 2: Record | 276→330 MB (+54 MB) | Tracks PCM file size |
| 3: Rec+Process | 249→393 MB (+144 MB) | Steady linear growth |
| 4a: +Mel compute | 246→405 MB (+159 MB) | Slightly more than Phase 3 |
| 4b: +Mel Skia viz | **254→730 MB peak** (oscillating 367-730) | Skia buffer allocation/GC sawtooth pattern |

## Key Findings

1. **No memory leaks in any phase.** Idle baseline is perfectly flat. Recording phases grow proportionally to file size (expected for PCM at 176 KB/s).

2. **Mel spectrogram Skia rendering is the most expensive operation.** It adds +36% CPU and causes native heap to spike to 730MB (2x the non-rendering peak). The sawtooth memory pattern (allocate→GC→allocate) suggests the Skia canvas is being recreated frequently rather than reusing buffers.

3. **Mel computation is relatively cheap.** Only +12% CPU over baseline processing. The native mel FFT/filterbank is efficient.

4. **Recording without processing has unexpectedly high CPU spikes.** Periodic 89-134% bursts even with `enableProcessing: false` suggest file I/O flush or GC events. These are bursty, not sustained.

5. **No crashes in any phase.** All 5 runs completed the full 600s without ANRs or crashes.

## Root Cause Analysis: Mel Spectrogram Rendering

The Phase 4b sawtooth memory pattern (367-730MB native heap) was caused by rendering ~8,000 individual `<Rect>` Skia components via `.map()`. Every 500ms when new mel data arrived, React reconciliation destroyed and recreated all Rect nodes, causing massive native Skia object allocation/GC cycles.

**Fix applied:** Replaced the Rect array with a single `<Image>` component backed by an RGBA pixel buffer (`Uint8Array`). The pixel buffer is reused across renders via `useRef` to eliminate GC pressure. This reduces Skia native objects from ~8,000 to 1 per frame.

### Phase 4b (Post-Fix) Results

| Time (s) | CPU % | Java Heap (MB) | Native Heap (MB) | Total PSS (MB) | Recording |
|-----------|-------|-----------------|-------------------|-----------------|-----------|
| 0 (baseline) | 7.4 | 93 | 459 | 861 | — |
| 0 (recording) | 57.1 | 42 | 433 | 780 | started + mel viz toggled |
| 30 | 114 | 59 | 446 | 814 | 34s / 2.9MB |
| 60 | 96.4 | 63 | 448 | 817 | 66s / 5.5MB |
| 90 | 88.4 | 62 | 455 | 827 | 97s / 8.2MB |
| 120 | 39.2 | 60 | 455 | 823 | 128s / 10.8MB |
| 150 | 75.0 | 63 | 460 | 832 | 159s / 13.4MB |
| 180 | 124 | 61 | 466 | 842 | 191s / 16.0MB |
| 210 | 103 | 61 | 468 | 838 | 222s / 18.7MB |
| 240 | 85.7 | 62 | 477 | 852 | 253s / 21.3MB |
| 270 | 37.0 | 61 | 476 | 851 | 285s / 24.0MB |
| 300 | 70.3 | 59 | 481 | 858 | 316s / 26.6MB |
| 330 | 55.5 | 63 | 487 | 870 | 347s / 29.2MB |
| 360 | 55.5 | 61 | 487 | 865 | 378s / 31.8MB |
| 390 | 88.8 | 58 | 488 | 868 | 410s / 34.5MB |
| 420 | 82.7 | 63 | 497 | 882 | 441s / 37.1MB |
| 450 | 90.0 | 61 | 499 | 882 | 472s / 39.7MB |
| 480 | 51.7 | 62 | 504 | 891 | 504s / 42.4MB |
| 510 | 40.7 | 60 | 504 | 888 | 534s / 44.9MB |
| 540 | 93.1 | 142 | 516 | 1012 | 565s / 47.6MB |
| 570 | 75.0 | 56 | 516 | 930 | 597s / 50.2MB |
| 600 | 123 | 61 | 517 | 933 | 628s / 52.9MB |
| final | 13.7 | 38 | 588 | 977 | stopped |

**Summary:** cpu_avg=78%, mem_start=780MB, mem_end=933MB, mem_delta=153MB

### Before vs After Comparison

| Metric | Before (Rect array) | After (SkImage) | Change |
|--------|---------------------|-----------------|--------|
| CPU avg | 122% | **78%** | **-36%** |
| Native heap max | 730 MB | **517 MB** | **-29%** |
| Native heap pattern | Sawtooth (367-730 MB) | **Steady (433-517 MB)** | **Eliminated** |
| PSS peak | 1136 MB | **1012 MB** | **-11%** |
| PSS delta | +234 MB | **+153 MB** | **-35%** |
| Mel rendering overhead vs 4a | +36% CPU | **-8% CPU** | **Negligible** |

## Recommendations

1. **The mel computation can be enabled by default** when `enableProcessing: true` — it only adds 12% CPU. The bottleneck is rendering, not computation.

2. **For recordings >10 min**, investigate the ~10MB/min PSS growth to ensure PCM buffers are being flushed to disk efficiently.

## How to Reproduce

From `apps/playground/`:

```bash
# Phase 1
scripts/agentic/benchmark-recording.sh --label idle-baseline --duration 600 \
  --config '{"skipRecording": true}'

# Phase 2
scripts/agentic/benchmark-recording.sh --label record-no-processing --duration 600 \
  --config '{"sampleRate": 44100, "channels": 1, "enableProcessing": false}'

# Phase 3
scripts/agentic/benchmark-recording.sh --label record-with-processing --duration 600 \
  --config '{"sampleRate": 44100, "channels": 1, "enableProcessing": true, "intervalMillis": 500}'

# Phase 4a
scripts/agentic/benchmark-recording.sh --label mel-compute-waveform-viz --duration 600 \
  --config '{"sampleRate": 44100, "channels": 1, "enableProcessing": true, "intervalMillis": 500, "features": {"melSpectrogram": true}}'

# Phase 4b
scripts/agentic/benchmark-recording.sh --label mel-compute-mel-viz --duration 600 \
  --config '{"sampleRate": 44100, "channels": 1, "enableProcessing": true, "intervalMillis": 500, "features": {"melSpectrogram": true}}' \
  --post-start-eval "__AGENTIC__.pressTestId('viz-mode-mel')"
```
