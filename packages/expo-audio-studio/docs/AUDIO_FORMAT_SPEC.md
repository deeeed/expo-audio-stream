# Audio Format Enhancement Specification - Single PR Solution

## Executive Summary

This document describes a complete solution for Issue #253 that will be implemented in a single PR:

### What This PR Will Do:
1. **Fix iOS bug**: Correct file extension from .aac to .m4a (files are already M4A)
2. **Improve Android default**: Switch from raw AAC to M4A container (better seeking)
3. **Add escape hatch**: New `preferRawStream` flag for backward compatibility
4. **Total changes**: ~20 lines of code + 1 optional TypeScript property

### The Complete Change:
```typescript
// Only addition to the API
export interface CompressedOutput {
  enabled?: boolean;
  format?: 'aac' | 'opus';
  bitrate?: number;
  preferRawStream?: boolean;  // NEW: Set to true for raw AAC on Android
}
```

## Immediate Workaround for Issue #253

**iOS Users**: The compressed AAC files are already in M4A format! Simply rename files from `.aac` to `.m4a` for proper seeking support. No conversion needed.

## Current State Analysis

### Existing Format Support

| Platform | Format | Actual Output | Current Extension | Correct Extension | Notes |
|----------|--------|---------------|-------------------|-------------------|-------|
| iOS | AAC | M4A/MP4 container | .aac | .m4a | AVAudioRecorder outputs M4A, not raw AAC |
| Android | AAC | ADTS stream | .aac | .aac | Correct - uses AAC_ADTS format |
| Web | Opus | WebM container | .webm | .webm | Correct - MediaRecorder limitation |
| All | WAV | RIFF/WAVE | .wav | .wav | Correct - uncompressed PCM |

### Current Implementation Issues

1. **iOS File Extension Mismatch**: iOS uses `kAudioFormatMPEG4AAC` which produces M4A container files, but saves with `.aac` extension
2. **No Raw AAC on iOS**: iOS cannot produce raw AAC streams directly; AVAudioRecorder always uses M4A container
3. **Inconsistent Container Behavior**: iOS produces containerized audio while Android produces raw streams
4. **Format Fallback Not Implemented**: iOS code attempts to use Opus but this isn't supported by AVAudioRecorder

## Why MP3 is Not Supported

MP3 encoding is not available in native recording APIs for several reasons:
1. **Patent History**: MP3 was heavily patented until 2017, requiring expensive licensing fees
2. **Platform Decisions**: Both iOS and Android chose AAC as their preferred format
3. **Technical Superiority**: AAC offers better quality at lower bitrates than MP3
4. **No Retrofit**: Even after patents expired, platforms haven't added MP3 encoding support

## Opus Support Analysis (Verified)

Despite `kAudioFormatOpus` being defined in iOS SDK:
1. **Constant Exists**: `kAudioFormatOpus = 1869641075` (0x6f707573 = 'opus')
2. **No Errors**: AVAudioRecorder accepts Opus settings without throwing errors
3. **Silent Failure**: Recording produces 0-byte files - no actual encoding occurs
4. **Fallback Required**: The expo-audio-studio correctly implements AAC fallback

## Proposed Enhancement

### Understanding Native Capabilities

Each platform has different capabilities for real-time audio encoding:

| Platform | Direct AAC Output | Direct M4A Output | Direct Opus Output | Container Control |
|----------|-------------------|-------------------|--------------------|-------------------|
| iOS | ❌ | ✅ (via kAudioFormatMPEG4AAC) | ❌ | Limited |
| Android | ✅ (ADTS) | ✅ (MPEG_4) | ✅ | Full |
| Web | ❌ | ❌ | ✅ (WebM) | None |

### Simplified Format Architecture

```typescript
export interface CompressedOutput {
  enabled?: boolean;
  format?: 'aac' | 'opus';  // Keep existing options
  // New field to control container behavior
  useContainer?: boolean;    // Default: platform-specific
  bitrate?: number;
}
```

### Platform-Specific Behavior

| Format Setting | iOS Output | Android Output | Web Output |
|----------------|------------|----------------|------------|
| format: 'aac', useContainer: false | M4A (.m4a)* | AAC ADTS (.aac) | Opus/WebM (.webm) |
| format: 'aac', useContainer: true | M4A (.m4a) | M4A (.m4a) | Opus/WebM (.webm) |
| format: 'opus' | M4A (.m4a)** | Opus/OGG (.opus) | Opus/WebM (.webm) |

\* iOS cannot produce raw AAC streams  
\** iOS does not support Opus encoding

### Implementation Strategy

#### Phase 1: Fix iOS File Extension (Immediate)
```swift
// iOS - AudioStreamManager.swift
private func getFileExtension(format: String, isCompressed: Bool) -> String {
    if !isCompressed {
        return "wav"
    }
    
    // iOS always produces M4A container when using AAC
    switch format.lowercased() {
    case "aac":
        return "m4a"  // Fix: use correct extension for M4A container
    case "opus":
        return "m4a"  // Fallback: iOS doesn't support Opus
    default:
        return "m4a"
    }
}
```

#### Phase 2: Add Container Control (Future)
```kotlin
// Android - AudioRecorderManager.kt
private fun configureMediaRecorder(config: RecordingConfig) {
    val useContainer = config.output.compressed.useContainer ?: false
    
    when (config.output.compressed.format) {
        "aac" -> {
            if (useContainer) {
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                // This produces .m4a files
            } else {
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS)
                // This produces .aac files
            }
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        }
        "opus" -> {
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.OGG)
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.OPUS)
        }
    }
}

private fun getFileExtension(format: String, useContainer: Boolean?): String {
    return when (format) {
        "aac" -> if (useContainer == true) "m4a" else "aac"
        "opus" -> "opus"
        else -> "aac"
    }
}
```

## Key Insights

### 1. iOS Already Produces M4A Files
- iOS `AVAudioRecorder` with `kAudioFormatMPEG4AAC` produces M4A container files
- Current bug: These files are saved with `.aac` extension instead of `.m4a`
- **No additional processing needed** - just fix the file extension

### 2. Platform Limitations
- **iOS**: 
  - Cannot produce raw AAC streams, only M4A containers
  - Opus format (`kAudioFormatOpus`) is defined but not functional - AVAudioRecorder produces 0-byte files
- **Android**: Can produce both raw AAC (.aac) and M4A containers (.m4a)
- **Web**: Limited to WebM/Opus, no AAC support in MediaRecorder

### 3. No Post-Processing Required
- Native APIs directly output the desired format
- Android can switch between AAC_ADTS and MPEG_4 output formats
- iOS always outputs M4A when using AAC codec

## Proposed Minimal Enhancement

### What We're NOT Changing
- ❌ NOT adding new audio formats (no MP3, no FLAC, etc.)
- ❌ NOT adding OGG as a new option
- ❌ NOT changing the API in Phase 1
- ✅ ONLY fixing file extensions and improving defaults

### What Currently Happens (v2.10.6)

| Platform | When you set `format: 'aac'` | When you set `format: 'opus'` |
|----------|-------------------------------|--------------------------------|
| iOS | Creates M4A file, saves as .aac ❌ | Tries Opus, falls back to M4A, saves as .aac ❌ |
| Android | Creates raw AAC file (.aac) ✅ | Creates Opus in OGG container (.opus) ✅ |
| Web | Creates WebM with Opus (.webm) | Creates WebM with Opus (.webm) |

### Complete Solution (v2.10.7)

**Minimal API addition to support both better defaults AND backward compatibility:**

```typescript
export interface CompressedOutput {
  enabled?: boolean;
  format?: 'aac' | 'opus';  // Still just these two options!
  bitrate?: number;
  preferRawStream?: boolean;  // NEW: Optional flag for backward compatibility
}
```

**New behavior:**

| Settings | iOS | Android | Web |
|----------|-----|---------|-----|
| `{ format: 'aac' }` | M4A file (.m4a) ✅ | M4A file (.m4a) 🆕 | WebM (.webm) |
| `{ format: 'aac', preferRawStream: true }` | M4A file (.m4a)* | Raw AAC (.aac) ✅ | WebM (.webm) |
| `{ format: 'opus' }` | M4A file (.m4a)** | Opus file (.opus) ✅ | WebM (.webm) |

\* iOS cannot produce raw streams, ignores this flag  
\** iOS falls back to AAC in M4A container

**What this accomplishes:**
1. ✅ Fixes iOS file extension bug
2. ✅ Provides better defaults (seekable M4A files)
3. ✅ Maintains backward compatibility for those who need raw AAC
4. ✅ Minimal API change - just one optional boolean
5. ✅ Ships everything in one PR

**Usage Examples:**

```typescript
// Default - Better for most users (seekable files)
{ format: 'aac' }  
// iOS: recording.m4a, Android: recording.m4a

// Need raw AAC stream on Android (like v2.10.6)
{ format: 'aac', preferRawStream: true }  
// iOS: recording.m4a (can't do raw), Android: recording.aac

// Opus format (unchanged)
{ format: 'opus' }
// iOS: recording.m4a (fallback), Android: recording.opus
```

### Implementation Details

#### Android Changes
```kotlin
// Support both M4A (new default) and raw AAC (backward compatibility)
private fun getOutputFormat(config: RecordingConfig): Int {
    val format = config.output.compressed.format
    val preferRaw = config.output.compressed.preferRawStream ?: false
    
    return when (format) {
        "aac" -> if (preferRaw) {
            MediaRecorder.OutputFormat.AAC_ADTS  // Raw AAC stream
        } else {
            MediaRecorder.OutputFormat.MPEG_4    // M4A container (new default)
        }
        "opus" -> MediaRecorder.OutputFormat.OGG
        else -> MediaRecorder.OutputFormat.MPEG_4
    }
}

private fun getFileExtension(config: RecordingConfig): String {
    val format = config.output.compressed.format
    val preferRaw = config.output.compressed.preferRawStream ?: false
    
    return when (format) {
        "aac" -> if (preferRaw) "aac" else "m4a"
        "opus" -> "opus"
        else -> "m4a"
    }
}
```

#### iOS Changes
```swift
// Fix the extension to match actual output
private func getFileExtension(format: String) -> String {
    switch format.lowercased() {
    case "aac", "opus":  // Both produce M4A container on iOS
        return "m4a"
    default:
        return "m4a"
    }
}
// Note: preferRawStream is ignored on iOS as it can't produce raw streams
```

## Benefits for Issue #253

The requester wants M4A for better seeking support. The good news:
- **iOS already produces M4A files** - just with wrong extension
- **Android can easily switch** to M4A with `OutputFormat.MPEG_4`
- **No slow post-processing needed** - native APIs handle it directly
- **Seeking works out of the box** with M4A container format

## Why This Approach Works

### 1. Minimal Changes, Maximum Impact
- **Phase 1**: Just 2-3 line changes per platform
- **Phase 2**: Optional advanced API preserves simplicity
- Solves Issue #253 without breaking existing code

### 2. Platform-Optimized Defaults
- iOS users get M4A files with correct extension
- Android users get seekable M4A by default (can opt for raw AAC)
- Web users continue with WebM/Opus

### 3. Progressive Disclosure
- Basic usage stays simple: `{ format: 'aac' }`
- Advanced users can control container format when needed
- File extension override for special requirements

## Migration Impact

### What Changes for Existing Users

```typescript
// v2.10.6 and earlier
{ format: 'aac' } 
// iOS: recording.aac (actually M4A inside)
// Android: recording.aac (raw AAC stream)

// v2.10.7 and later
{ format: 'aac' } 
// iOS: recording.m4a (same format, correct extension)
// Android: recording.m4a (M4A container instead of raw)

// To get old Android behavior in v2.10.7+
{ format: 'aac', preferRawStream: true }
// Android: recording.aac (raw AAC stream, like before)
```

**Who is affected:**
- ✅ iOS users: Just a file extension fix, format unchanged
- ✅ Most Android users: Get better seekable files
- ⚠️ Android users who need raw AAC: Must add `preferRawStream: true`

### Migration Guide

For Android users who specifically need raw AAC streams:
```typescript
// Old code (v2.10.6)
const recording = await startRecording({
  output: {
    compressed: {
      enabled: true,
      format: 'aac'  // Produced raw .aac files
    }
  }
});

// New code (v2.10.7+)
const recording = await startRecording({
  output: {
    compressed: {
      enabled: true,
      format: 'aac',
      preferRawStream: true  // Keep raw .aac files
    }
  }
});
```

## Testing Requirements

```bash
# Core functionality tests
- Verify iOS produces .m4a files (not .aac) 
- Verify Android produces .m4a files by default
- Verify Android produces .aac files with preferRawStream: true
- Test seeking works in M4A files on all platforms
- Ensure web continues to work with WebM

# Backward compatibility tests
- Test existing code without preferRawStream works
- Test preferRawStream flag on all platforms
- Verify iOS ignores preferRawStream (always M4A)

# File format validation
file recording.m4a  # Should show: ISO Media, MP4 Base Media
file recording.aac  # Should show: ADTS, AAC (only on Android with flag)
```

## Summary

This complete solution in a single PR:
1. **Fixes Issue #253** - M4A files with seeking on all platforms
2. **Minimal code changes** - ~20 lines total across platforms
3. **Minimal API change** - Just one optional boolean flag
4. **Maintains compatibility** - Raw AAC still available when needed
5. **Better defaults** - 99% of users get seekable files automatically

The key insight: Most users want seekable audio files, not raw streams. By defaulting to M4A containers while keeping raw AAC as an option, we provide the best experience for everyone.