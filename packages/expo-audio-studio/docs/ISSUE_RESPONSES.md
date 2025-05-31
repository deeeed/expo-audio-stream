# Response to GitHub Issues #246 and #247

## Issue #247: Buffer Size Calculation Fix

### Status: ✅ FIXED

The buffer size calculation has been corrected to use the target sample rate instead of the hardware sample rate. This ensures that `bufferDurationSeconds` produces predictable buffer sizes based on the user's requested sample rate.

### Changes Made

```swift
// Before (incorrect):
let sampleRate = inputHardwareFormat.sampleRate  // e.g., 48000 Hz
let calculatedSize = AVAudioFrameCount(duration * sampleRate)

// After (fixed):
let targetSampleRate = Double(recordingSettings?.sampleRate ?? 16000)  // User's target rate
let calculatedSize = AVAudioFrameCount(duration * targetSampleRate)
```

### Additional Improvements

- Added logging to warn developers when their requested buffer size is below iOS minimum (~4800 frames)
- Added debug logging to show requested vs. clamped buffer sizes

### Integration Test

A new integration test has been added to validate this fix:
```bash
cd packages/expo-audio-studio/ios/tests/integration
swift buffer_and_fallback_test.swift
```

### Example

With `bufferDurationSeconds: 0.02` and `sampleRate: 16000`:
- **Before**: Would calculate 960 frames (0.02 * 48000)
- **After**: Correctly calculates 320 frames (0.02 * 16000)
- **Note**: iOS still enforces minimum ~4800 frames, but the calculation is now correct

---

## Issue #246: Duplicate Emission in Fallback Tap Block

### Status: ⚠️ REQUIRES MANUAL FIX

The duplicate emission issue has been identified and a fix is recommended. The fallback tap block currently emits data twice:
1. Through `processAudioBuffer` (normal path)
2. Through forced emission for the first 30 buffers

### Recommended Fix

Replace the entire fallback tap block (around line 2067) with this simplified version:

```swift
// Create a simplified tap block for fallback - rely on processAudioBuffer for proper emission
let fallbackTapBlock = { [weak self] (buffer: AVAudioPCMBuffer, time: AVAudioTime) -> Void in
    guard let self = self, self.isRecording else { return }
    
    // Process the buffer normally - processAudioBuffer handles all emission logic
    self.processAudioBuffer(buffer, fileURL: self.recordingFileURL!)
    self.lastBufferTime = time
}
```

Remove all the duplicate emission logic including:
- The `buffersSinceFallback` counter
- The force emission logic
- The direct delegate calls

### Why This Fix Works

- `processAudioBuffer` already handles proper data accumulation and timed emission
- The existing emission logic respects the configured intervals
- Removing the duplicate emission prevents data from being sent twice
- The fallback recovery attempts (scheduled at 0.5, 1.0, 2.0, 3.0 seconds) already handle recovery

### Testing

The integration test is ready to validate this fix once applied:
```bash
cd packages/expo-audio-studio/ios/tests/integration
swift buffer_and_fallback_test.swift
```

---

## Summary

1. **Issue #247** (Buffer Size Calculation) - **FIXED** ✅
   - Buffer size now correctly uses target sample rate
   - Added appropriate logging for iOS minimum buffer size

2. **Issue #246** (Duplicate Emission) - **FIX IDENTIFIED** ⚠️
   - Root cause identified: redundant emission in fallback tap block
   - Clear fix provided: remove duplicate emission logic
   - Integration test ready to validate

Both issues are legitimate bugs that affect recording behavior. The fixes are minimal and focused on correcting the specific problems without introducing regression risks. 