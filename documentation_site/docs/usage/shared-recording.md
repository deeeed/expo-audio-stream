---
id: shared-recording
title: Shared Recording
sidebar_label: Shared Recording
---

# Shared Recording

To facilitate state sharing across multiple components or screens, `useSharedAudioRecorder` can be used. It should be wrapped in an `AudioRecorderProvider` context provider to ensure state is managed at a higher level and shared appropriately.

## Shared Recording Usage

The `AudioRecorderProvider` component creates a context that allows multiple components to access and control the same recording session. This is useful for applications where recording controls need to be distributed across different components or screens.

```tsx
import {
    AudioRecorderProvider,
    useSharedAudioRecorder,
    RecordingConfig
} from '@siteed/expo-audio-studio'
import { View, Text, Button } from 'react-native'

export default function ParentComponent() {
    // You can pass configuration options to the provider
    return (
        <AudioRecorderProvider config={{
            // Optional configuration for the useAudioRecorder hook
            logger: console
        }}>
            <RecordingControls />
            <RecordingStatus />
        </AudioRecorderProvider>
    )
}

function RecordingControls() {
    const { 
        startRecording, 
        stopRecording,
        pauseRecording,
        resumeRecording,
        isRecording,
        isPaused
    } = useSharedAudioRecorder()

    const handleStartRecording = async () => {
        const config: RecordingConfig = {
            interval: 500,
            enableProcessing: true,
            // See standalone-recording.md for full configuration options
        }
        
        await startRecording(config)
    }

    return (
        <View>
            {!isRecording && !isPaused && (
                <Button 
                    title="Start Recording" 
                    onPress={handleStartRecording} 
                />
            )}
            
            {isRecording && (
                <>
                    <Button 
                        title="Pause Recording" 
                        onPress={pauseRecording} 
                    />
                    <Button 
                        title="Stop Recording" 
                        onPress={stopRecording} 
                    />
                </>
            )}
            
            {isPaused && (
                <>
                    <Button 
                        title="Resume Recording" 
                        onPress={resumeRecording} 
                    />
                    <Button 
                        title="Stop Recording" 
                        onPress={stopRecording} 
                    />
                </>
            )}
        </View>
    )
}

function RecordingStatus() {
    const { isRecording, isPaused, durationMs, size } = useSharedAudioRecorder()
    
    if (!isRecording && !isPaused) {
        return <Text>Ready to record</Text>
    }
    
    return (
        <View>
            <Text>Status: {isRecording ? 'Recording' : 'Paused'}</Text>
            <Text>Duration: {durationMs / 1000} seconds</Text>
            <Text>Size: {size} bytes</Text>
        </View>
    )
}

## API Reference

### AudioRecorderProvider

```tsx
<AudioRecorderProvider config={options}>
  {children}
</AudioRecorderProvider>
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `children` | `React.ReactNode` | Child components that will have access to the shared recorder |
| `config` | `UseAudioRecorderProps` | Optional configuration for the useAudioRecorder hook |

### useSharedAudioRecorder Hook

```tsx
const recorder = useSharedAudioRecorder()
```

This hook returns the same interface as `useAudioRecorder`, but the state is shared across all components that use this hook within the same `AudioRecorderProvider`.

See the [Standalone Recording](./standalone-recording.md#api-reference) documentation for the complete API reference.
