import {
    ExpoAudioStreamModule,
    AudioRecording,
    ExpoAudioStreamModule,
    useAudioRecorder,
} from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import { useAudioPlayer } from 'expo-audio'
import { useEffect, useState } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'

const STOP_BUTTON_COLOR = 'red'

const logger = getLogger('MinimalApp')

// @ts-expect-error
const isTurboModuleEnabled = global.__turboModuleProxy != null

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
        logger: console,
    })
    const [audioResult, setAudioResult] = useState<AudioRecording | null>(null)
    const player = useAudioPlayer(audioResult?.fileUri ?? '')

    const handleStart = async () => {
        try {
            const { status } =
                await ExpoAudioStreamModule.requestPermissionsAsync()
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
        } catch (error) {
            logger.error('Error starting recording', error)
        }
    }

    const handleStop = async () => {
        try {
            const result = await stopRecording()
            console.log(`handleStop`, result)
            setAudioResult(result)
        } catch (error) {
            logger.error('Error stopping recording', error)
        }
    }

    useEffect(() => {
        logger.info('App started')
        return () => {
            logger.info('App stopped')
        }
    }, [])

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
        if (player) {
            player.play()
        }
    }

    return (
        <>
            <Text>
                {isTurboModuleEnabled
                    ? 'Using New Architecture'
                    : 'Using Old Architecture'}
            </Text>
            {isRecording
                ? renderRecording()
                : isPaused
                  ? renderPaused()
                  : renderStopped()}
        </>
    )
}
