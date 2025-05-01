# Web PCM Audio Recording Enhancements

## Primary Feature: Memory Optimization Option

The main purpose of this PR was to add memory optimization for web recordings by making PCM data storage optional:

- Added a `storeUncompressedAudio` configuration option for web recordings
- When enabled (default), PCM data is stored in memory for WAV generation
- When disabled, only compressed audio is kept, significantly reducing memory usage for long recordings
- Added UI controls in advanced settings to toggle this option

This addresses a critical performance issue on web platforms where long recordings could consume excessive memory.

## Secondary Issue: Unplayable WAV Files

While implementing the memory optimization feature, we discovered and fixed a bug with WAV file generation:

1. **Unplayable WAV Files**: The generated WAV files had valid headers but corrupted audio data:
   * Files appeared to save correctly
   * Visualizer could detect amplitude ranges
   * But playback failed with: `EncodingError: Unable to decode audio data`

2. **Timer Reset Issue**: The recording duration counter wasn't being reset between recordings, causing subsequent recordings to show incorrect timing.

## Technical Solutions

### 1. Memory Optimization

```javascript
// Only store PCM data if web.storeUncompressedAudio is not explicitly false
const shouldStoreUncompressed = this.config.web?.storeUncompressedAudio !== false;

// Store PCM chunks when needed
if (shouldStoreUncompressed) {
    // Store the original Float32Array data for later WAV creation
    this.appendPcmData(chunk);
    this.totalSampleCount += chunk.length;
}
```

This allows developers to disable PCM storage for memory-sensitive applications or long recordings, while keeping it enabled by default for backward compatibility.

### 2. WAV Generation Fix

We fixed the Float32Array to Int16Array conversion for proper WAV file generation:

```javascript
// Convert Float32 (-1 to 1) to Int16 (-32768 to 32767) 
for (let i = 0; i < this.pcmData.length; i++) {
    const sample = Math.max(-1, Math.min(1, this.pcmData[i]))
    const int16Value = Math.round(sample * 32767)
    view.setInt16(i * 2, int16Value, true)
}
```

### 3. State Reset Fix

Added code to reset all recording state variables between sessions:

```javascript
// Reset recording state variables
this.currentDurationMs = 0
this.currentSize = 0
this.lastEmittedSize = 0
this.totalCompressedSize = 0
this.lastEmittedCompressionSize = 0
this.audioChunks = []
```

### 4. Blob Handling Improvements

Enhanced type checking for ArrayBuffer/Blob conversions during storage:

```javascript
// Check if arrayBuffer is actually a Blob
if (arrayBuffer instanceof Blob || 
   (typeof arrayBuffer === 'object' && arrayBuffer !== null && 'arrayBuffer' in arrayBuffer)) {
    const buffer = await arrayBuffer.arrayBuffer();
    arrayBuffer = buffer;
}
```

## Current Status

* Memory usage can now be optimized for web platforms by disabling uncompressed audio storage
* Both compressed (WebM/Opus) and uncompressed (WAV) formats work correctly when selected
* WAV playback issues are fixed with proper audio data conversion
* Duration timer resets properly between recordings

These changes significantly improve the web recording experience, especially for longer recordings where memory constraints are a concern. 