---
id: trim-audio
title: trimAudio
sidebar_label: trimAudio
---

# trimAudio

The `trimAudio` function allows you to trim audio files with precision, supporting multiple segments and various output formats. This is useful for removing silence, extracting specific parts of recordings, or compiling multiple segments into a single audio file.

## Syntax

```typescript
async function trimAudio(options: TrimAudioOptions): Promise<string>
```

## Parameters

The function accepts a single object with the following properties:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `fileUri` | string | Yes | - | Path to the audio file to trim |
| `startTimeMs` | number | No* | - | Start time in milliseconds (for single segment mode) |
| `endTimeMs` | number | No* | - | End time in milliseconds (for single segment mode) |
| `mode` | 'keep' \| 'remove' | No | 'keep' | Whether to keep or remove the specified ranges |
| `ranges` | Array<{startTimeMs: number, endTimeMs: number}> | No* | - | Array of time ranges (for multi-segment mode) |
| `outputFormat` | OutputFormatOptions | No | { format: 'wav' } | Output format configuration |

\* Either `startTimeMs`/`endTimeMs` pair or `ranges` must be provided

### OutputFormatOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `format` | 'wav' \| 'mp3' \| 'aac' \| 'opus' | No | 'wav' | Output audio format |
| `bitrate` | number | No | - | Bitrate for compressed formats (in kbps) |
| `quality` | 'low' \| 'medium' \| 'high' | No | 'medium' | Quality preset for compressed formats |

## Return Value

The function returns a Promise that resolves to a string containing the URI of the trimmed audio file.

## Examples

### Basic Trimming

```typescript
import { trimAudio } from '@siteed/expo-audio-stream';

async function trimAudioSegment() {
  try {
    // Trim audio from 1 second to 5 seconds
    const trimmedAudioUri = await trimAudio({
      fileUri: 'path/to/recording.wav',
      startTimeMs: 1000,
      endTimeMs: 5000,
      outputFormat: { format: 'wav' }
    });
    
    console.log(`Trimmed audio saved to: ${trimmedAudioUri}`);
    return trimmedAudioUri;
  } catch (error) {
    console.error('Error trimming audio:', error);
    throw error;
  }
}
```

### Multiple Segments

```typescript
import { trimAudio } from '@siteed/expo-audio-stream';

async function extractMultipleSegments() {
  try {
    // Extract and combine two segments from the audio file
    const compiledAudioUri = await trimAudio({
      fileUri: 'path/to/recording.wav',
      mode: 'keep',
      ranges: [
        { startTimeMs: 1000, endTimeMs: 5000 },
        { startTimeMs: 10000, endTimeMs: 15000 }
      ],
      outputFormat: { format: 'mp3', quality: 'high' }
    });
    
    console.log(`Compiled audio saved to: ${compiledAudioUri}`);
    return compiledAudioUri;
  } catch (error) {
    console.error('Error extracting audio segments:', error);
    throw error;
  }
}
```

### Removing Segments

```typescript
import { trimAudio } from '@siteed/expo-audio-stream';

async function removeSilenceOrNoise() {
  try {
    // Remove specific segments (e.g., silence or noise) from the audio
    const cleanedAudioUri = await trimAudio({
      fileUri: 'path/to/recording.wav',
      mode: 'remove',
      ranges: [
        { startTimeMs: 2000, endTimeMs: 3000 },  // Remove silence
        { startTimeMs: 7000, endTimeMs: 8500 }   // Remove noise
      ],
      outputFormat: { format: 'aac', bitrate: 128 }
    });
    
    console.log(`Cleaned audio saved to: ${cleanedAudioUri}`);
    return cleanedAudioUri;
  } catch (error) {
    console.error('Error removing audio segments:', error);
    throw error;
  }
}
```

## Use Cases

- **Content Editing**: Extract the most important parts of a recording
- **Silence Removal**: Remove silent segments from recordings
- **Compilation**: Combine multiple segments into a single audio file
- **Noise Removal**: Remove sections containing unwanted noise
- **Audio Clipping**: Create short clips from longer recordings

## Performance Considerations

- Processing large audio files may take longer, especially when converting formats
- When possible, use the same output format as the input to avoid transcoding overhead
- For multiple small segments, it's more efficient to process them in a single operation using the `ranges` parameter rather than making multiple calls
- The function is optimized to minimize memory usage even for large files 