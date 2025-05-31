Thank you for identifying this issue! You're absolutely right - the buffer size calculation is using the hardware sample rate instead of the target sample rate.

## ✅ Fixed

I've fixed this issue in commit [link to commit]. The buffer size calculation now correctly uses the target sample rate from the recording settings.

### What Changed

```swift
// Before (incorrect):
let sampleRate = inputHardwareFormat.sampleRate  // e.g., 48000 Hz
let calculatedSize = AVAudioFrameCount(duration * sampleRate)

// After (fixed):
let targetSampleRate = Double(recordingSettings?.sampleRate ?? 16000)  // User's target rate
let calculatedSize = AVAudioFrameCount(duration * targetSampleRate)
```

### Additional Improvements

1. **Added logging** to warn when requested buffer size is below iOS minimum (~4800 frames):
   ```swift
   if calculatedSize < 4800 {
       Logger.debug("AudioStreamManager", "Requested buffer size \(calculatedSize) frames (from \(duration)s at \(targetSampleRate)Hz) is below iOS minimum of ~4800 frames")
   }
   ```

2. **Debug logging** shows both requested and clamped buffer sizes for transparency

### Example

With your configuration:
- `bufferDurationSeconds: 0.02`
- `sampleRate: 16000`

**Before**: Would incorrectly calculate 960 frames (0.02 × 48000)  
**After**: Correctly calculates 320 frames (0.02 × 16000)

Note: iOS will still enforce its minimum buffer size of ~4800 frames, but at least the calculation is now based on the correct sample rate.

### Testing

An integration test validates this fix:
```bash
cd packages/expo-audio-studio/ios/tests/integration
swift buffer_and_fallback_test.swift
```

The fix is minimal and focused on correcting the calculation without affecting other functionality. Thank you for the clear bug report! 