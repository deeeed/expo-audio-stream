# Issues Triage — 2026-02-23

## Summary

- **13 issues triaged** (6 on-device + code review, 4 code-review only, 3 quick replies)
- **Devices used**: Pixel 6a (Android 16 API 36), iPhone (iOS, physical)
- **3 confirmed bugs** with root cause identified (#288, #298, #299)
- **2 confirmed design gaps** (#294, #300)
- **1 user-side issue** (#296 — version mismatch)

## Results

| # | Title | Type | Status | Verdict | Root Cause |
|---|-------|------|--------|---------|------------|
| 288 | ForegroundServiceDidNotStartInTimeException | Crash | Replied | **Confirmed bug** | Foreground service not gated on `enableBackgroundAudio`; race conditions in service lifecycle |
| 294 | BT permissions crash w/ enableDeviceDetection:false | Crash | Replied | **Confirmed bug** | `AudioDeviceManager` always registers BT receivers regardless of `enableDeviceDetection` |
| 298 | prepareRecorder starts timer prematurely | Bug | Replied | **Confirmed (iOS only)** | `startTime` set in `prepareRecording()`, never reset in `startRecording()` |
| 223 | iOS crash: invalid format sample rate | Crash | Replied | **Confirmed design gap** | No validation of hardware format before `installTap`; device-specific (iPad) |
| 296 | onAudioStream callback never fires | Bug | Replied | **User-side** | `expo-modules-core` v3.x vs v2.x mismatch; works in playground |
| 205 | extractAudioAnalysis OOM on large files | Bug | Replied | **Known limitation** | Entire file loaded into memory; workaround: chunk files or use `extractPreview` |
| 300 | Audio switches to BT breaks analysis | Bug | Replied | **Confirmed design gap** | `.allowBluetooth` hardcoded in defaults; no tap reinstall on route change |
| 299 | Mic switching jumps back after 2s | Bug | Replied | **Confirmed bug** | Interruption handler reconfigures audio session after 2s delay, resetting preferred input |
| 289 | New BT device not in list (Android) | Bug | Replied | **Confirmed design gap** | Missing `ACTION_BOND_STATE_CHANGED`; only 2s retry for BT profile negotiation |
| 275 | Recording continues during phone call | Bug | Replied | **Configuration issue** | `keepAwake+enableBackgroundAudio` → background audio focus (no focus request); READ_PHONE_STATE may not be granted |
| 295 | Why no OPUS for iOS? | Question | Replied | **Answered** | No native Apple Opus encoder; requires bundling libopus |
| 284 | Parakeet Model Integration | Feature | Replied | **Out of scope** | 600MB+ model; suggested OTA download or server-side inference |
| 279 | MelSpectrogramVisualizer request | Feature | Replied | **Acknowledged** | Component referenced in docs but never implemented |

## Priority Fixes Recommended

1. **#288** (High) — Gate foreground service on `enableBackgroundAudio`; fix exception swallowing in `AudioRecordingService.kt`
2. **#294** (High) — Pass `enableDeviceDetection` to `AudioDeviceManager`; skip BT monitoring when disabled
3. **#298** (Medium) — Reset `startTime` unconditionally in `startRecording()` on iOS
4. **#223** (Medium) — Add format validation guard before `installTap` on iOS
5. **#300/#299** (Medium) — Reinstall audio tap on route change; suppress interruption handler for user-initiated device switches
6. **#289** (Low) — Add `ACTION_BOND_STATE_CHANGED` receiver; increase BT retry timeout
