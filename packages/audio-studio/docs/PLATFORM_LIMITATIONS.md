# Platform Limitations and Capabilities

This document outlines platform-specific limitations and capabilities for audio recording in expo-audio-studio.

## Bit Depth Support

### Overview

Not all platforms support all bit depths for audio recording. The library automatically validates and adjusts bit depth based on platform capabilities.

### Platform Support Matrix

| Platform | 8-bit | 16-bit | 32-bit | Notes |
|----------|-------|--------|--------|-------|
| iOS | ❌ | ✅ | ✅ | 8-bit not supported by AVAudioFormat |
| Android | ✅ | ✅ | ✅ | Full support for all bit depths |
| Web | ❌ | ✅ | ✅ | 32-bit float is default for Web Audio API |

### Automatic Fallback

When an unsupported bit depth is requested, the library will:
1. Log a warning to the console
2. Automatically fallback to 16-bit (universally supported)
3. Continue recording with the fallback configuration

Example:
```typescript
// iOS: This will fallback to 16-bit with a warning
const { startRecording } = useAudioRecorder()
await startRecording({
  encoding: 'pcm_8bit',  // Will become 'pcm_16bit' on iOS
  bitDepth: 8,           // Will become 16 on iOS
})
```

### Programmatic Detection

You can check platform capabilities before starting recording:

```typescript
import { getPlatformCapabilities, validateRecordingConfig } from '@siteed/expo-audio-studio'

// Get current platform capabilities
const capabilities = getPlatformCapabilities()
console.log('Supported bit depths:', capabilities.supportedBitDepths)
// iOS: [16, 32]
// Android: [8, 16, 32]
// Web: [16, 32]

// Validate a recording configuration
const validation = validateRecordingConfig({
  encoding: 'pcm_8bit',
  bitDepth: 8
})

if (validation.warnings.length > 0) {
  console.warn('Configuration warnings:', validation.warnings)
}

// Use validated configuration
await startRecording({
  encoding: validation.encoding,
  bitDepth: validation.bitDepth,
  // ... other options
})
```

## Audio Analysis Bit Depth

### Important Note

The `bitDepth` field in `AudioAnalysis` data represents the bit depth used for internal processing, which may differ from the recording bit depth:

- **Android**: Analysis is performed on 32-bit float arrays for precision
- **iOS**: Analysis uses 32-bit float processing internally
- **Web**: Uses 32-bit float (Web Audio API standard)

The actual recorded file will use the requested bit depth (or fallback), while analysis data shows the processing bit depth.

## Compression Format Support

| Platform | AAC | Opus | MP3 | Notes |
|----------|-----|------|-----|-------|
| iOS | ✅ | ❌ | ❌ | Outputs M4A container, not raw AAC |
| Android | ✅ | ✅ | ❌ | Can output both raw AAC and M4A |
| Web | ❌ | ✅ | ❌ | Limited to Opus in WebM container |

## Sample Rate Support

All platforms support the standard sample rates:
- 16000 Hz (narrowband)
- 44100 Hz (CD quality)
- 48000 Hz (professional)

## Channel Support

All platforms support:
- Mono (1 channel)
- Stereo (2 channels)

## Best Practices

1. **Always use 16-bit or 32-bit** for cross-platform compatibility
2. **Check capabilities** if you need specific bit depths
3. **Handle warnings** gracefully in your UI
4. **Test on all target platforms** to ensure expected behavior

## Example: Cross-Platform Recording

```typescript
import { useAudioRecorder, getPlatformCapabilities } from '@siteed/expo-audio-studio'

function AudioRecorder() {
  const { startRecording } = useAudioRecorder()
  
  const handleRecord = async () => {
    const capabilities = getPlatformCapabilities()
    
    // Use 16-bit for maximum compatibility
    const config = {
      encoding: 'pcm_16bit' as const,
      bitDepth: 16,
      sampleRate: 44100,
      channels: 1,
    }
    
    // Optional: Log platform notes
    if (capabilities.notes.length > 0) {
      console.log('Platform notes:', capabilities.notes)
    }
    
    await startRecording(config)
  }
  
  return <Button onPress={handleRecord} title="Start Recording" />
}
```