---
id: standalone-recording
title: Standalone Recording
sidebar_label: Standalone Recording
---

# Standalone Recording

This library provides hooks for recording audio. Here, we demonstrate how to use `useAudioRecorder` for standalone recording.

## Standalone Usage


```tsx
import {
  AudioRecording,
  useAudioRecorder,
  ExpoAudioStreamModule
} from '@siteed/expo-audio-stream'
import { useAudioPlayer } from 'expo-audio'
import { useState, useEffect } from 'react'
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
  } = useAudioRecorder()
  const [audioResult, setAudioResult] = useState<AudioRecording | null>(null)
  const player = useAudioPlayer(audioResult?.fileUri ?? "")

  const handleStart = async () => {
    const { status } = await ExpoAudioStreamModule.requestPermissionsAsync()
    if (status !== 'granted') {
      return
    }
      const startResult = await startRecording({
          interval: 500,
          enableProcessing: true,
          onAudioStream: async (_) => {
              console.log(`onAudioStream`, _)
          },
      })
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
```