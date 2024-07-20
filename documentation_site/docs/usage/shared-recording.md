---
id: shared-recording
title: Shared Recording
sidebar_label: Shared Recording
---

# Shared Recording

To facilitate state sharing across multiple components or screens, useSharedAudioRecorder can be used. It should be wrapped in a AudioRecorderProvider context provider to ensure state is managed at a higher level and shared appropriately.


## Shared Recording Usage

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
