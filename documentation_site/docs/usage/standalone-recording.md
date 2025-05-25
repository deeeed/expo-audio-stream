---
id: standalone-recording
title: Standalone Recording
sidebar_label: Standalone Recording
---

# Standalone Recording

This library provides hooks for recording audio. Here, we demonstrate how to use `useAudioRecorder` for standalone recording.

## Standalone Usage

The `useAudioRecorder` hook provides a complete API for recording audio in a single component. It manages the recording state internally and provides methods for controlling the recording process.

```tsx
import {
  AudioRecording,
  useAudioRecorder,
  ExpoAudioStreamModule,
  RecordingConfig
} from '@siteed/expo-audio-studio'
import { useAudioPlayer } from 'expo-audio'
import { useState } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'

const STOP_BUTTON_COLOR = 'red'

const styles = StyleSheet.create({
  container: {
      gap: 10,
      margin: 40,
      padding: 20,
  },
  stopButton: {
      backgroundColor: 'red',
  },
})

export default function App() {
  const {
      startRecording,
      stopRecording,
      pauseRecording,
      resumeRecording,
      durationMs,
      size,
      isRecording,
      isPaused,
      analysisData, // Audio analysis data if enableProcessing is true
      compression, // Compression information if compression is enabled
  } = useAudioRecorder()
  const [audioResult, setAudioResult] = useState<AudioRecording | null>(null)
  const player = useAudioPlayer(audioResult?.fileUri ?? "")

  const handleStart = async () => {
    const { status } = await ExpoAudioStreamModule.requestPermissionsAsync()
    if (status !== 'granted') {
      return
    }
      
    // Configure recording options
    const config: RecordingConfig = {
        interval: 500, // Emit recording data every 500ms
        enableProcessing: true, // Enable audio analysis
        sampleRate: 44100, // Sample rate in Hz (16000, 44100, or 48000)
        channels: 1, // Mono recording
        encoding: 'pcm_16bit', // PCM encoding (pcm_8bit, pcm_16bit, pcm_32bit)
        
        // Optional: Configure audio compression
        compression: {
            enabled: false, // Set to true to enable compression
            format: 'aac', // 'aac' or 'opus'
            bitrate: 128000, // Bitrate in bits per second
        },
        
        // Optional: Handle audio stream data
        onAudioStream: async (audioData) => {
            console.log(`onAudioStream`, audioData)
        },
        
        // Optional: Handle audio analysis data
        onAudioAnalysis: async (analysisEvent) => {
            console.log(`onAudioAnalysis`, analysisEvent)
        },
        
        // Optional: Handle recording interruptions
        onRecordingInterrupted: (event) => {
            console.log(`Recording interrupted: ${event.reason}`)
        },
        
        // Optional: Auto-resume after interruption
        autoResumeAfterInterruption: false,
        
        // Optional: Buffer duration control
        bufferDurationSeconds: 0.1, // Buffer size in seconds
        // Default: undefined (uses 1024 frames, but iOS enforces minimum 0.1s)
        
        // Optional: Skip file writing for streaming-only scenarios
        skipFileWriting: false, // Set to true to disable file I/O
    }
    
    const startResult = await startRecording(config)
    return startResult
  }

  const handleStop = async () => {
      const result = await stopRecording()
      setAudioResult(result)
  }

  const handlePlay = async () => {
      if (player) {
          player.play()
      }
  }

  const renderRecording = () => (
      <View style={styles.container}>
          <Text>Duration: {durationMs / 1000} seconds</Text>
          <Text>Size: {size} bytes</Text>
          <Button title="Pause Recording" onPress={pauseRecording} />
          <Button
              title="Stop Recording"
              onPress={handleStop}
              color={STOP_BUTTON_COLOR}
          />
      </View>
  )

  const renderPaused = () => (
      <View style={styles.container}>
          <Text>Duration: {durationMs / 1000} seconds</Text>
          <Text>Size: {size} bytes</Text>
          <Button title="Resume Recording" onPress={resumeRecording} />
          <Button
              title="Stop Recording"
              color={STOP_BUTTON_COLOR}
              onPress={handleStop}
          />
      </View>
  )

  const renderStopped = () => (
      <View style={styles.container}>
          <Button title="Start Recording" onPress={handleStart} />
          {audioResult && (
              <View>
                  <Button title="Play Recording" onPress={handlePlay} />
              </View>
          )}
      </View>
  )

  return (
      <>
          {isRecording
              ? renderRecording()
              : isPaused
                ? renderPaused()
                : renderStopped()}
      </>
  )
}

## API Reference

### useAudioRecorder Hook

```tsx
const recorder = useAudioRecorder(options?: UseAudioRecorderProps)
```

#### Options

| Property | Type | Description |
|----------|------|-------------|
| `logger` | `ConsoleLike` | Optional logger for debugging |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `startRecording` | `(config: RecordingConfig) => Promise<StartRecordingResult>` | Starts recording with the specified configuration |
| `stopRecording` | `() => Promise<AudioRecording>` | Stops the current recording and returns the recording data |
| `pauseRecording` | `() => Promise<void>` | Pauses the current recording |
| `resumeRecording` | `() => Promise<void>` | Resumes a paused recording |
| `isRecording` | `boolean` | Indicates whether recording is currently active |
| `isPaused` | `boolean` | Indicates whether recording is in a paused state |
| `durationMs` | `number` | Duration of the current recording in milliseconds |
| `size` | `number` | Size of the recorded audio in bytes |
| `compression` | `CompressionInfo \| undefined` | Information about compression if enabled |
| `analysisData` | `AudioAnalysis \| undefined` | Analysis data for the recording if processing was enabled |