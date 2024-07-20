# @siteed/expo-audio-stream

`@siteed/expo-audio-stream` is a comprehensive library designed to facilitate real-time audio processing and streaming across iOS, Android, and web platforms.

## Features

- Real-time audio streaming across iOS, Android, and web.
- Configurable intervals for audio buffer receipt.
- Automated microphone permissions setup in managed Expo projects.
- Background audio recording on iOS.
- Audio features extraction during recording.
- Consistent WAV PCM recording format across all platforms.

## Installation

To install `@siteed/expo-audio-stream`, add it to your project using npm or Yarn:

```bash
npm install @siteed/expo-audio-stream
# or
yarn add @siteed/expo-audio-stream
```

### Configuring with app.json

To ensure expo-audio-stream works correctly with Expo, you must add it as a plugin in your app.json configuration file.

```json
{
    "expo": {
        "plugins": ["@siteed/expo-audio-stream"]
    }
}
```

Make sure to run `npx expo prebuild` after adding the plugin to your app.json file.

## Usage

This library provides two hooks: `useAudioRecorder` for standalone use and `useSharedAudioRecorder` for accessing shared recording state within a React context.

### Standalone Recording

Th `apps/` folder contains a fully functional React Native application demonstrating how to integrate and use `useAudioRecorder` from `@siteed/expo-audio-stream`. This includes starting and stopping recordings, handling permissions, and processing live audio data.

#### Standalone Usage

The following is a minimal application that demonstrates how to use `useAudioRecorder`.

```tsx
import {
    AudioRecordingResult,
    useAudioRecorder,
} from '@siteed/expo-audio-stream'
import { Audio } from 'expo-av' // Import for playing audio on native
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
    } = useAudioRecorder({
        debug: true,
    })
    const [audioResult, setAudioResult] = useState<AudioRecordingResult | null>(
        null
    )
    const [, setSound] = useState<Audio.Sound | null>(null) // State for audio playback on native

    const handleStart = async () => {
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
        console.log(`handleStop`, result)
        setAudioResult(result)
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

    const handlePlay = async () => {
        if (audioResult) {
            const { sound } = await Audio.Sound.createAsync({
                uri: audioResult.fileUri,
            })
            setSound(sound)
            await sound.playAsync()
        }
    }

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

The library also exposes an `addAudioEventListener` function that provides an `AudioEventPayload` object that you can subscribe to:

```tsx
import { addAudioEventListener } from '@siteed/expo-audio-stream'

useEffect(() => {
    const subscribe = addAudioEventListener(
        async ({
            fileUri,
            deltaSize,
            totalSize,
            from,
            streamUuid,
            encoded,
            mimeType,
            buffer,
        }) => {
            log(`Received audio event:`, {
                fileUri,
                deltaSize,
                totalSize,
                mimeType,
                from,
                streamUuid,
                encodedLength: encoded?.length,
                bufferLength: buffer?.length,
            })
        }
    )
    return () => subscribe.remove()
}, [])
```

### Shared Recording

To facilitate state sharing across multiple components or screens, useSharedAudioRecorder can be used. It should be wrapped in a AudioRecorderProvider context provider to ensure state is managed at a higher level and shared appropriately.

#### Shared Recording Usage

```tsx
import {
    AudioRecorderProvider,
    useSharedAudioRecorder,
} from '@siteed/expo-audio-stream'

export default function ParentComponent() {
    return (
        <AudioRecorderProvider>
            <ChildComponent />
        </AudioRecorderProvider>
    )
}

function ChildComponent() {
    const { startRecording, isRecording } = useSharedAudioRecorder()

    return (
        <View>
            <Text>{isRecording ? 'Recording...' : 'Ready to record'}</Text>
            <Button title="Toggle Recording" onPress={startRecording} />
        </View>
    )
}
```

### Add Event Listener

You can also add an event listener to receive detailed audio event payloads, which is crucial for both standalone and shared usage scenarios.

```tsx
import { useEffect } from 'react'
import { addAudioEventListener } from '@siteed/expo-audio-stream'

function App() {
    useEffect(() => {
        const subscription = addAudioEventListener((event) => {
            console.log('Audio event received:', event)
        })

        return () => subscription.remove()
    }, [])

    // UI code here
}
```

## Minimal Example Application

The project comes with a fully functional example application that demonstrates how to use the library in a real-world scenario.

![Example App](./docs/demo.gif)

To try it:

```bash
git clone https://github.com/deeeed/expo-audio-stream.git
cd expo-audio-stream
yarn
yarn playground ios
yarn playground android
yarn playground web
```

## Recording configuration

-   on Android and IOS, audio is recorded in wav format, 16khz sample rate, 16 bit depth, 1 channel.
-   on web, it usually records in opus but it depends on the browser configuration.

If you want to process the audio livestream directly, I recommend having another encoding step to align the audio format across platforms.
