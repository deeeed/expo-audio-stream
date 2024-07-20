# @siteed/expo-audio-stream

`@siteed/expo-audio-stream` is a comprehensive library designed to facilitate real-time audio processing and streaming across iOS, Android, and web platforms.

## Features

-   Real-time audio streaming across iOS, Android, and web.
-   Configurable intervals for audio buffer receipt.
-   Automated microphone permissions setup in managed Expo projects.
-   IOS is automatically setup to handle background audio recording.
-   Listeners for audio data events with detailed event payloads.
-   Utility functions for recording control and file management.

## Playground Example Application

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

The `playground/` folder contains a fully functional React Native application demonstrating how to integrate and use `useAudioRecorder` from `@siteed/expo-audio-stream`. This includes starting and stopping recordings, handling permissions, and processing live audio data.

#### Standalone Usage

```tsx
import { useAudioRecorder, AudioStreamResult } from '@siteed/expo-audio-stream'

export default function App() {
    const { startRecording, stopRecording, duration, size, isRecording } =
        useAudioRecorder({
            debug: true,
            onAudioStream: (audioData: Blob) => {
                console.log(`audio event`, audioData)
            },
        })

    const handleStart = async () => {
        const { granted } = await Audio.requestPermissionsAsync()
        if (granted) {
            const fileUri = await startRecording({ interval: 500 })
        }
    }

    const handleStop = async () => {
        const result: AudioStreamResult = await stopRecording()
    }

    const renderRecording = () => (
        <View>
            <Text>Duration: {duration} ms</Text>
            <Text>Size: {size} bytes</Text>
            <Button title="Stop Recording" onPress={handleStop} />
        </View>
    )

    const renderStopped = () => (
        <View>
            <Button title="Start Recording" onPress={handleStart} />
        </View>
    )

    return (
        <View>
            <Button
                title="Request Permission"
                onPress={() => Audio.requestPermissionsAsync()}
            />
            {isRecording ? renderRecording() : renderStopped()}
        </View>
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

## Recording configuration

-   on Android and IOS, audio is recorded in wav format, 16khz sample rate, 16 bit depth, 1 channel.
-   on web, it usually records in opus but it depends on the browser configuration.

If you want to process the audio livestream directly, I recommend having another encoding step to align the audio format across platforms.
