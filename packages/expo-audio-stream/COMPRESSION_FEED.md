# Features compression feed

Enable recording audio in both raw (WAV/PCM) and compressed formats (AAC/OPUS) simultaneously, while maintaining existing analysis capabilities and cross-platform compatibility.

# Compressed Audio Support Implementation Plan

## Overview
Add support for simultaneous raw (WAV/PCM) and compressed (AAC/OPUS) audio recording while maintaining existing analysis capabilities across all platforms (iOS, Android, Web).

## Current Architecture
- Records audio in WAV/PCM format
- Provides real-time analysis features
- Uses platform-specific implementations:
  - Android: AudioRecord
  - iOS: AVAudioEngine
  - Web: Web Audio API

## Proposed Changes

### 1. API Extensions

```ts
interface RecordingConfig {
    // Existing fields remain unchanged
    compression?: {
    enabled: boolean
    format: 'aac' | 'opus' | 'mp3'
    bitrate?: number
}

interface AudioRecording {
    // Existing fields remain unchanged
    compressedUri?: string
    compressedMimeType?: string
    compressedSize?: number
}

export interface AudioStreamStatus {
    isRecording: boolean
    isPaused: boolean
    durationMs: number
    size: number
    interval: number
    mimeType: string
    compression?: {
        size: number        // Size of compressed data in bytes
        mimeType: string    // MIME type of compressed format
        bitrate: number     // Current bitrate of compression
        format: string      // Format being used (aac/opus/mp3)
    }
}

export interface AudioDataEvent {
    data: string | Float32Array
    position: number
    fileUri: string
    eventDataSize: number
    totalSize: number
    compression?: {
        data?: string        // Base64 encoded compressed data chunk
        position: number     // Current position in compressed stream
        fileUri: string      // URI to compressed file
        eventDataSize: number // Size of this compressed chunk
        totalSize: number    // Total size of compressed data
    }
}


```

### 2. Platform-Specific Implementation

#### Android
- Use MediaCodec for hardware-accelerated encoding
- Modify AudioRecorderManager to handle dual streams:
  - Primary PCM stream for analysis
  - Secondary compressed stream for storage
- Leverage existing permission and notification systems

#### iOS
- Use AVAudioEngine for PCM recording
- Add AVAudioConverter for compressed format
- Implement dual stream recording using AVFoundation
- Maintain existing audio session handling

#### Web
- Use MediaRecorder with multiple streams
- Fallback to WebCodecs API where available
- Maintain Web Audio API for analysis features
