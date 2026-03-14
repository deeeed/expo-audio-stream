# Stream Format Improvement: Eliminate Consumer-Side Conversions

## Problem

`onAudioStream` delivers audio in the **file storage format** rather than a format suited for real-time processing. Every consumer that wants float32 samples (ML inference, DSP, speech recognition) must perform its own conversion, resulting in 2–4 redundant passes over the data per chunk.

The `encoding` config option was designed to control the WAV file format on disk. It accidentally also controls what `onAudioStream.data` contains — two unrelated concerns sharing one config.

---

## Current conversion chains (100 ms chunk, 16 kHz, pcm_16bit)

### Web

AudioContext always captures Float32 internally. When `encoding: 'pcm_16bit'`:

```
Float32 (AudioContext)
  → [AudioWorklet: convertBitDepth Float32→Int16, lossy]  pass 1
  → Int16Array (onAudioStream.data)
  → [consumer: /32768 loop → number[]]                    pass 2
  → sherpa / VAD / KWS
```

The Float32→Int16→float roundtrip is lossy and entirely avoidable — the file encoding has nothing to do with what the stream callback receives.

With `encoding: 'pcm_32bit'` the worklet skips `convertBitDepth` and posts Float32Array directly, reducing to one pass (`Array.from`). This is the workaround applied in `sherpa-voice` for now.

### Native (iOS & Android)

Hardware delivers raw Int16 PCM bytes. The bridge only supports JSON-serializable types, so the module base64-encodes before sending:

```
Int16 PCM bytes (hardware)
  → [native: Base64.encodeToString / base64EncodedString]  pass 1  (+33% size)
  → base64 string (JSON bridge)
  → [JS: atob() + charCodeAt loop → Uint8Array]            pass 2
  → [JS: DataView.getInt16 loop / 32768 → Float32Array]    pass 3
  → [JS: Array.from → number[]]                            pass 4
  → sherpa / VAD / KWS
```

**4 passes** over the data, with `atob` + `charCodeAt` being the worst offender (O(n) on a binary string, no SIMD path).

---

## Why the design needs a `streamFormat` option

File encoding and stream format are independent:

| Concern | Config today | Should be |
|---|---|---|
| File stored on disk | `encoding: 'pcm_16bit'` | `encoding: 'pcm_16bit'` (unchanged) |
| Data in `onAudioStream` | same as above (wrong) | `streamFormat: 'float32'` |

A consumer doing ML inference doesn't care what bit depth the WAV file uses. It always needs float32 samples in [-1, 1].

---

## Proposed API change

```typescript
// RecordingConfig addition
streamFormat?: 'float32' | 'raw'
// 'raw'   — current behaviour, backwards compatible (default)
// 'float32' — library guarantees onAudioStream.data is always Float32Array
```

When `streamFormat: 'float32'` is set:

- `AudioDataEvent.data` is typed as `Float32Array` (no union, no runtime branching)
- The single conversion happens inside the library, in the right place
- Consumers call `sherpa.acceptWaveform(event.data)` with no intermediate steps

---

## Implementation plan

### 1. Web — `WebRecorder` / AudioWorklet (`inlineAudioWebWorker.web.tsx`)

**Current**: `processChunk()` calls `convertBitDepth(resampledChunk, exportBitDepth)` which converts Float32 → Int16Array when `exportBitDepth = 16`.

**Fix**: when `streamFormat === 'float32'`, skip `convertBitDepth` for the postMessage payload. The worklet already has Float32 — just post it unchanged. The file-writing path (`appendPcmData`) is separate and can still use whatever bit depth the file needs.

```js
// inside processChunk(), AudioWorklet
const streamData = this.streamFormat === 'float32'
  ? resampledChunk          // already Float32, zero extra work
  : finalBuffer             // converted for file compat

this.port.postMessage({ command: 'newData', recordedData: streamData, ... })
```

The `streamFormat` value is passed via the existing `init` message from `WebRecorder`.

### 2. Android — `AudioRecorderManager.kt` + `AudioStudioModule.kt`

**Current**: `emitAudioData()` calls `audioDataEncoder.encodeToBase64(audioData)` and puts the result in the `encoded` field of the Bundle sent via `sendExpoEvent`.

**Fix**: when `streamFormat === 'float32'`, convert Int16 bytes → Float32Array in Kotlin and send as a typed array instead of a base64 string.

Expo modules support `TypedArray` via JSI on the new architecture. The Bundle field would carry a `FloatArray` (Kotlin) which crosses the JSI bridge as a `Float32Array` on the JS side with zero extra allocation.

```kotlin
// AudioRecorderManager.kt — emitAudioData()
if (recordingConfig.streamFormat == "float32") {
    val float32 = FloatArray(length / 2)
    for (i in float32.indices) {
        val lo = audioData[i * 2].toInt() and 0xFF
        val hi = audioData[i * 2 + 1].toInt() and 0xFF
        float32[i] = ((hi shl 8) or lo).toShort() / 32768f
    }
    bundle.putFloatArray("pcmFloat32", float32)
} else {
    bundle.putString("encoded", audioDataEncoder.encodeToBase64(audioData))
}
```

On the JS side (`useAudioRecorder.tsx`), prefer `pcmFloat32` over `encoded` when present:

```typescript
if (eventData.pcmFloat32 instanceof Float32Array) {
    onAudioStreamRef.current?.({ data: eventData.pcmFloat32, ... })
} else if (eventData.encoded) {
    // existing base64 path — backwards compat
}
```

### 3. iOS — `AudioStudioModule.swift` + `AudioStreamManager.swift`

**Current**: `data.base64EncodedString()` in the `didReceiveAudioData` delegate method.

**Fix**: same pattern as Android. When `streamFormat == "float32"`, convert `Data` (Int16 LE bytes) → `[Float32]` in Swift and include in the event dict as an array. Expo's JSI layer will deliver it as a `Float32Array` to JS.

```swift
// AudioStudioModule.swift — didReceiveAudioData delegate
if recordingSettings?.streamFormat == "float32" {
    let sampleCount = data.count / 2
    var floatArray = [Float](repeating: 0, count: sampleCount)
    data.withUnsafeBytes { ptr in
        let int16Ptr = ptr.bindMemory(to: Int16.self)
        for i in 0..<sampleCount {
            floatArray[i] = Float(int16Ptr[i]) / 32768.0
        }
    }
    resultDict["pcmFloat32"] = floatArray
} else {
    resultDict["encoded"] = data.base64EncodedString()
}
```

### 4. `AudioDataEvent` type (`AudioStudio.types.ts`)

```typescript
// Current
export interface AudioDataEvent {
    data: string | Float32Array
    // ...
}

// After — use overloaded types or a discriminated union
export interface AudioDataEventRaw {
    data: string | Float32Array   // backwards compat
    streamFormat?: undefined | 'raw'
}
export interface AudioDataEventFloat32 {
    data: Float32Array            // guaranteed when streamFormat: 'float32'
    streamFormat: 'float32'
}
export type AudioDataEvent = AudioDataEventRaw | AudioDataEventFloat32
```

Or simpler: just document that `data` is always `Float32Array` when `streamFormat: 'float32'` is set, and consumers narrow the type themselves with a helper.

### 5. Consumer side — `sherpa-voice`

Once the library delivers Float32Array unconditionally, `audioDataToSamples` in `audioDataUtils.ts` becomes a one-liner or disappears entirely:

```typescript
// With streamFormat: 'float32', onAudioStream callback becomes:
onAudioStream: async (event: AudioDataEvent) => {
    if (!streamCreatedRef.current) return
    liveAsr.feedAudio(event.data as Float32Array, 16000)
}
```

No conversion utility needed. The `audioDataUtils.ts` file can be deleted.

---

## Performance impact (100 ms chunk, 16 kHz)

| Metric | Current (native) | After fix (native) |
|---|---|---|
| Passes over data | 4 | 1 (single Int16→Float32 in Kotlin/Swift) |
| Base64 overhead | +33% bytes on bridge | eliminated |
| JS allocations per chunk | 3 (Uint8Array, Float32Array, number[]) | 0 (typed array from JSI) |
| `atob` call | yes (~3200 chars) | no |

| Metric | Current (web, pcm_16bit) | After fix (web, any encoding) |
|---|---|---|
| Passes over data | 2 (lossy) | 0 extra (Float32 passed through) |
| Precision loss | yes (Float32→Int16→float) | no |

---

## Backwards compatibility

- Default `streamFormat` is `'raw'` — existing behaviour unchanged
- Base64 path in `useAudioRecorder.tsx` remains as the fallback
- Old consumers ignore the new field; new consumers opt in explicitly

---

## Files to change

| File | Change |
|---|---|
| `src/AudioStudio.types.ts` | Add `streamFormat` to `RecordingConfig`; refine `AudioDataEvent.data` type |
| `src/workers/inlineAudioWebWorker.web.tsx` | Skip `convertBitDepth` for stream payload when `streamFormat === 'float32'` |
| `src/WebRecorder.web.ts` | Pass `streamFormat` in `init` message to worklet |
| `src/useAudioRecorder.tsx` | Prefer `pcmFloat32` typed array over `encoded` string when present |
| `android/.../AudioRecorderManager.kt` | Emit `FloatArray` instead of base64 when `streamFormat == "float32"` |
| `android/.../RecordingConfig.kt` | Add `streamFormat` field |
| `ios/AudioStreamManager.swift` | Emit float array instead of base64 when `streamFormat == "float32"` |
| `ios/RecordingSettings.swift` | Add `streamFormat` field |
| `apps/sherpa-voice/src/utils/audioDataUtils.ts` | Remove or simplify once library guarantees Float32Array |

---

## Related

- Current workaround in `sherpa-voice`: `encoding: 'pcm_32bit'` avoids the lossy Float32→Int16 roundtrip on web (merged in same branch as this doc)
- `audioDataUtils.ts` centralises the conversion logic in the meantime so there is a single place to update when the library fix lands
