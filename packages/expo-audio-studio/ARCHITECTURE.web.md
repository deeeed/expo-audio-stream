# Web Architecture: expo-audio-studio

This document describes the architecture of the web implementation of the audio recording system in expo-audio-studio.

## Overview

The web implementation of expo-audio-studio provides a complete audio recording solution that works in web browsers. It supports:

- Recording compressed and uncompressed audio
- Real-time audio analysis
- Streaming audio data to clients
- Various audio formats and quality settings

## Key Components

The web implementation consists of several key components:

1. **ExpoAudioStreamWeb**: Main entry point that provides the public API
2. **WebRecorder**: Core recording implementation for web platform
3. **AudioWorklet**: Low-level audio processing in a dedicated thread
4. **FeatureExtractor**: Audio analysis for visualization and features

## Data Flow

```
┌────────────────┐       ┌─────────────────┐       ┌────────────────────┐
│                │       │                 │       │                    │
│  Browser       │       │   WebRecorder   │       │  ExpoAudioStream   │
│  Audio API     ├──────►│   (processing)  ├──────►│  (events/API)      │
│                │       │                 │       │                    │
└────────────────┘       └─────────────────┘       └────────────────────┘
        │                        │                           │
        │                        │                           │
        ▼                        ▼                           ▼
┌────────────────┐       ┌─────────────────┐       ┌────────────────────┐
│                │       │                 │       │                    │
│  AudioWorklet  │       │  MediaRecorder  │       │  Client App        │
│  (PCM data)    │       │  (Compression)  │       │  (Consuming API)   │
│                │       │                 │       │                    │
└────────────────┘       └─────────────────┘       └────────────────────┘
```

## File Structure

- **src/ExpoAudioStream.web.ts**: Main module implementation
- **src/WebRecorder.web.ts**: Core recording implementation
- **src/workers/inlineAudioWebWorker.web.tsx**: AudioWorklet processor
- **src/workers/InlineFeaturesExtractor.web.ts**: Audio analysis worker
- **src/hooks/useAudioRecorder.tsx**: React hook for easy API consumption

## Detailed Component Description

### 1. ExpoAudioStreamWeb (src/ExpoAudioStream.web.ts)

This is the main class that implements the Expo module interface for web. It:

- Provides the public API for recording operations
- Manages the recording lifecycle
- Emits events to the client application
- Handles compressed and uncompressed audio data

Key methods:
- `startRecording()`: Begins a recording session
- `stopRecording()`: Ends recording and finalizes audio
- `pauseRecording()`: Temporarily suspends recording
- `resumeRecording()`: Continues a paused recording
- `emitAudioEvent()`: Sends audio data to clients

### 2. WebRecorder (src/WebRecorder.web.ts)

This class handles the actual recording implementation:

- Creates and manages the AudioContext and audio worklet
- Processes audio data from the microphone
- Implements compression via MediaRecorder API
- Handles device switching and interruptions
- Creates WAV files from PCM data

Key methods:
- `init()`: Sets up the audio worklet
- `start()`: Begins audio capture
- `stop()`: Stops recording and finalizes audio
- `createWavFromPcmData()`: Converts PCM to WAV format

### 3. AudioWorklet (src/workers/inlineAudioWebWorker.web.tsx)

This component runs in a separate thread to process audio efficiently:

- Receives raw audio samples from the microphone
- Processes audio in real-time
- Handles sample rate conversion and bit depth
- Emits chunks of audio data at regular intervals

The AudioWorklet is implemented as an inline script that's injected at runtime to avoid CORS issues.

### 4. FeatureExtractor (src/workers/InlineFeaturesExtractor.web.ts)

This worker extracts audio features for visualization:

- Analyzes audio for amplitude, frequency, etc.
- Generates data for waveform visualization
- Runs in a separate thread for performance

## Audio Data Flow

1. **Capture**: Browser's MediaDevices API captures audio from the microphone
2. **Processing**: AudioWorklet processes raw PCM data in real-time
3. **Compression** (optional): MediaRecorder API compresses audio chunks
4. **Analysis**: FeatureExtractor analyzes audio for visualization
5. **Event Emission**: ExpoAudioStreamWeb emits events with audio data
6. **Storage**: Audio data is stored in memory and/or as files

## Audio Formats

The system supports two parallel audio paths:

1. **Uncompressed PCM**:
   - Format: 32-bit float PCM (in memory), 16-bit WAV (for storage)
   - Source: AudioWorklet
   - Use: High-quality processing, visualization, analysis

2. **Compressed Audio**:
   - Format: Opus (WebM container) or AAC
   - Source: MediaRecorder API
   - Use: Efficient storage, network transmission

## Audio Flow Synchronization

### Methods to Access Audio Data

The system provides several ways to access audio data:

1. **Event-based access** (during recording):
   - `onAudioStream` callback in the recording configuration
   - Events contain both PCM data and optional compressed chunks
   - Real-time access as chunks are generated

2. **File-based access** (after recording):
   - `stopRecording()` returns a result with file URIs
   - Access to both compressed (`compression.compressedFileUri`) and uncompressed (`fileUri`) formats
   - Complete audio files suitable for playback or storage

3. **Raw data access**:
   - PCM chunks as Float32Array
   - Compressed chunks as Blob objects

### Uncompressed vs. Compressed Flow

| Aspect            | Uncompressed (PCM)                     | Compressed (Opus/AAC)              |
|-------------------|----------------------------------------|------------------------------------|
| **Source**        | AudioWorklet processor                 | MediaRecorder API                  |
| **Chunk Size**    | Small (typically ~500ms intervals)     | Larger (1-2s intervals)           |
| **Frequency**     | High frequency chunks                  | Lower frequency chunks             |
| **Intermediate**  | Often includes micro-chunks (64 samples)| No intermediate chunks            |
| **Memory Usage**  | Higher (32-bit floats)                 | Lower (compressed data)            |
| **Latency**       | Lower latency                          | Higher latency due to compression  |
| **Quality**       | Lossless                               | Lossy compression                  |

### Synchronization Mechanisms

The system employs several mechanisms to synchronize the two audio paths:

1. **Position Tracking**:
   - Each audio chunk includes a `position` value (in seconds)
   - Timestamps allow aligning chunks between compressed and uncompressed paths
   - WebRecorder maintains a global position counter

2. **Data Association**:
   - `pendingCompressedChunk` mechanism in WebRecorder
   - Associates each compressed chunk with corresponding PCM data
   - Emits both when available in a single event

3. **Shared Start/Stop Control**:
   - Both MediaRecorder and AudioWorklet are initialized together
   - Start/pause/resume/stop operations affect both simultaneously
   - Ensures timeline alignment between formats

### Starting and Stopping Synchronization

To ensure both audio paths start and stop at exactly the same time:

1. **Initialization**:
   ```javascript
   // Both paths initialized simultaneously in WebRecorder.init()
   this.audioWorkletNode = new AudioWorkletNode(audioContext, 'recorder-processor');
   this.compressedMediaRecorder = new MediaRecorder(source.mediaStream);
   ```

2. **Starting**:
   ```javascript
   // Both paths started in sequence in WebRecorder.start()
   this.source.connect(this.audioWorkletNode);
   this.audioWorkletNode.connect(this.audioContext.destination);
   this.compressedMediaRecorder.start(interval);
   ```

3. **Stopping**:
   ```javascript
   // Stop compressed recording first
   this.compressedMediaRecorder.stop();
   
   // Allow time for final compressed chunks
   await new Promise(resolve => setTimeout(resolve, 100));
   
   // Final cleanup and disconnection
   this.cleanup();
   ```

### Synchronization Challenges

There are several challenges in perfect synchronization:

1. **Timing differences**: MediaRecorder and AudioWorklet operate at different timescales
2. **Browser variations**: Different browsers implement MediaRecorder with different timing
3. **Compression latency**: Encoding introduces variable delay

To address these challenges:

1. **Time alignment**: Both sources use the same timeline base
2. **Chunk correlation**: Compressed chunks are paired with PCM data by position
3. **Final processing delay**: Stop sequence includes a delay to ensure all data is processed
4. **Metadata preservation**: Position data is preserved through the entire pipeline

### Practical Considerations

When working with both audio paths:

1. **Choosing the right format**:
   - Use compressed for efficient storage and transmission
   - Use uncompressed for highest quality processing and visualization

2. **Handling chunk misalignment**:
   - Sort chunks by position before concatenation or processing
   - Use the position value for alignment rather than arrival order

3. **End-of-recording handling**:
   - Wait for both paths to complete before finalizing 
   - Check for trailing micro-chunks in the uncompressed path

## Event System

Audio data is streamed to clients via events:

1. `AudioData`: Contains PCM data and optional compressed chunks
2. `AudioAnalysis`: Contains visualization and analysis data

Events include metadata such as:
- Position (timestamp)
- File information
- Size and format details
- Compression information

## Implementation Notes

### Preventing Duplicate Chunks

The system includes mechanisms to prevent duplicate audio chunks:

1. ~~Position-based detection in WebRecorder~~ (Removed to prevent data loss)
2. Time-based throttling in AudioWorklet
3. Synchronization between compressed and uncompressed paths

Note: Position-based duplicate detection was removed because it could incorrectly filter out legitimate audio chunks, causing significant data loss (up to 48%) in reconstructed audio from onAudioStream events.

### Device Interruption Handling

The system handles device disconnections and other interruptions:

1. Detecting disconnection events
2. Optional fallback to other devices
3. Graceful pause/resume functionality

### Compression Options

Compression is configurable with:
- Format selection (Opus, AAC)
- Bitrate control
- Enable/disable options

## Usage in React Applications

The `useAudioRecorder` hook provides a React-friendly interface:

```tsx
const {
  isRecording,
  isPaused,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  // Additional state and controls...
} = useAudioRecorder();
```

## Performance Considerations

1. Audio processing is done in a separate thread via AudioWorklet
2. Feature extraction runs in a Web Worker
3. Memory usage is managed by limiting buffer sizes
4. Compressed chunks reduce storage requirements

## Browser Compatibility

The implementation supports modern browsers with Web Audio API support:
- Chrome/Edge (best support)
- Firefox (good support)
- Safari (limited support in some versions)

The code includes fallbacks for browser differences and feature detection.
