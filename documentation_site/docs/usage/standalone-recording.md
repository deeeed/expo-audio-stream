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

import { getLogger, setLoggerConfig } from '@siteed/react-native-logger';

// Set logger configuration
setLoggerConfig({ maxLogs: 500, namespaces: 'App:*' }); // Set the maximum number of logs to 500 and enable logging for App namespace

const logger = getLogger('App');

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
  } = useAudioRecorder({
      debug: true,
  })
  const [audioResult, setAudioResult] = useState<AudioRecording | null>(null)
  const player = useAudioPlayer(audioResult?.fileUri ?? "")

  const handleStart = async () => {
    const { status } = await ExpoAudioStreamModule.requestPermissionsAsync()
    console.log(`status`, status)
    if (status !== 'granted') {
      console.log(`Permission not granted`)
      return
    }
    console.log(`handleStart`, startRecording)
      const startResult = await startRecording({
          interval: 500,
          enableProcessing: true,
          onAudioStream: async (_) => {
              console.log(`onAudioStream`, _)
          },
      })
      console.log(`startResult`, startResult)
      return startResult
  }

  const handleStop = async () => {
      logger.info(`handleStop`)
      const result = await stopRecording()
      console.log(`handleStop`, result)
      setAudioResult(result)
  }

  const handlePlay = async () => {
      logger.info(`handlePlay`)
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