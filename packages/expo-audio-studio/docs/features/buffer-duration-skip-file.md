# Buffer Duration & Skip File Writing Features

## Overview

This document describes the implementation of two new recording configuration options:

1. **`bufferDurationSeconds`**: Allows customization of audio buffer duration
2. **`skipFileWriting`**: Enables audio streaming without file persistence

## Implementation Details

### TypeScript Changes

Added to `RecordingConfig` interface in `ExpoAudioStream.types.ts`:

```typescript
bufferDurationSeconds?: number;  // Buffer duration in seconds
skipFileWriting?: boolean;       // Skip file I/O when true
```

### iOS Implementation

#### Buffer Duration

Modified `AudioStreamManager.swift` to calculate buffer size dynamically:

```swift
let bufferSize: AVAudioFrameCount
if let duration = recordingSettings?.bufferDurationSeconds {
    let sampleRate = inputHardwareFormat.sampleRate
    let calculatedSize = AVAudioFrameCount(duration * sampleRate)
    bufferSize = max(256, min(calculatedSize, 16384))
} else {
    bufferSize = 1024 // Default
}
```

**Key Discovery**: iOS AVAudioEngine enforces a minimum buffer size of ~4800 frames (0.1s at 48kHz). Requests below this are ignored by the system.

#### Skip File Writing

Modified file creation and writing logic:

1. **Conditional file creation** in `prepareRecording()`:
   ```swift
   if !settings.skipFileWriting {
       recordingFileURL = createRecordingFile()
       // ... file setup
   } else {
       recordingFileURL = nil
       fileHandle = nil
   }
   ```

2. **Conditional file writing** in `processAudioBuffer()`:
   ```swift
   if !settings.skipFileWriting {
       // Background file writing
   } else {
       // Still track total size for statistics
       self.totalDataSize += Int64(dataToWrite.count)
   }
   ```

3. **Modified result handling** in `stopRecording()`:
   ```swift
   if settings.skipFileWriting {
       return RecordingResult(
           fileUri: "",
           filename: "stream-only",
           // ... other properties
       )
   }
   ```

## Integration Test Results

### Buffer Duration Tests

```
Summary: 8/8 tests passed

Key findings:
- iOS minimum effective buffer: 4800 frames
- Requests < 4800 frames return 4800
- Larger buffers generally work as requested
- Maximum observed: ~19200 frames
```

### Skip File Writing Tests

```
Summary: 5/5 tests passed

Validated:
- No file creation when skipFileWriting = true
- Data emission continues without file I/O
- Compression is also skipped
- Pause/Resume functionality maintained
```

## API Usage

### Low-latency streaming
```typescript
await startRecording({
  bufferDurationSeconds: 0.02, // 20ms
  skipFileWriting: true,
  onAudioStream: (data) => {
    // Process in real-time
  }
});
```

### Efficient file recording
```typescript
await startRecording({
  bufferDurationSeconds: 0.2, // 200ms for efficiency
  compression: { enabled: true }
});
```

## Platform Considerations

### iOS
- Minimum effective buffer: 0.1 seconds
- Buffer accumulation needed for smaller requests
- No file handle errors when skipFileWriting = true

### Android (To be implemented)
- Expected to respect smaller buffer sizes
- Similar skipFileWriting logic needed

### Web (To be implemented)
- Already supports memory-only operation
- Buffer size fully configurable

## Performance Impact

- **Buffer Duration**: Larger buffers reduce CPU usage but increase latency
- **Skip File Writing**: Eliminates I/O overhead, reduces battery usage

## Migration

These features are backward compatible. Existing code continues to work without changes. 