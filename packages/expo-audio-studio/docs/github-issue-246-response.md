Thank you for reporting this issue! I've investigated the fallback tap block implementation and can confirm this is indeed a bug.

## Analysis

You're correct - the current implementation causes duplicate data emission during device fallback:
1. `processAudioBuffer` is called, which handles normal data processing and emission based on configured intervals
2. The fallback tap block also forces emission of the same data for the first 30 buffers

This results in audio data being emitted twice, which can cause issues in downstream processing.

## Recommended Fix

The solution is to simplify the fallback tap block to rely solely on `processAudioBuffer`:

```swift
// Create a simplified tap block for fallback - rely on processAudioBuffer for proper emission
let fallbackTapBlock = { [weak self] (buffer: AVAudioPCMBuffer, time: AVAudioTime) -> Void in
    guard let self = self, self.isRecording else { return }
    
    // Process the buffer normally - processAudioBuffer handles all emission logic
    self.processAudioBuffer(buffer, fileURL: self.recordingFileURL!)
    self.lastBufferTime = time
}
```

This removes:
- The `buffersSinceFallback` counter
- The forced emission logic 
- The duplicate delegate calls

## Why This Works

- `processAudioBuffer` already handles proper data accumulation and emission timing
- The existing fallback recovery attempts (scheduled at 0.5, 1.0, 2.0, 3.0 seconds) ensure data flow resumes
- This prevents duplicate data while maintaining continuity

## Testing

An integration test has been created to validate this behavior:
```bash
cd packages/expo-audio-studio/ios/tests/integration
swift buffer_and_fallback_test.swift
```

Would you like to submit a PR with this fix, or shall I create one? 