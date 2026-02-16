import {
    AudioRecording,
    ExpoAudioStreamModule,
    useAudioRecorder,
} from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'
import { useAudioPlayer } from 'expo-audio'
import { useEffect, useState } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'

const STOP_BUTTON_COLOR = 'red'

const logger = getLogger('MinimalApp')

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
        analysisData,
        compression,
    } = useAudioRecorder({
        logger: console,
    })
    const [audioResult, setAudioResult] = useState<AudioRecording | null>(null)
    const player = useAudioPlayer(audioResult?.fileUri ?? '')

    const [isActive, setIsActive] = useState(true)
    const [streamEvents, setStreamEvents] = useState<number>(0)
    const [analysisEvents, setAnalysisEvents] = useState<number>(0)

    // Track audio stream events
    useEffect(() => {
        console.log(`Stream events count: ${streamEvents}`)
    }, [streamEvents])

    // Track analysis data updates
    useEffect(() => {
        if (analysisData) {
            setAnalysisEvents((prev) => prev + 1)
            console.log(
                `Analysis events count: ${analysisEvents}`,
                analysisData
            )
        }
    }, [analysisData])

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
                output: {
                    compressed: {
                        enabled: true,
                        format: 'aac',
                        bitrate: 128000,
                    },
                },
                onAudioStream: async (event) => {
                    setStreamEvents((prev) => prev + 1)
                    console.log(`onAudioStream event received`, event)
                    console.log(`  compression:`, event.compression)
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

    // Test pause/resume based on isActive
    useEffect(() => {
        if (!isRecording) return

        const handleStateChange = async () => {
            console.log(
                `State change - isActive: ${isActive}, isPaused: ${isPaused}`
            )

            if (isActive && isPaused) {
                console.log('Resuming recording...')
                await resumeRecording()
            } else if (!isActive && !isPaused) {
                console.log('Pausing recording...')
                await pauseRecording()
            }
        }

        handleStateChange()
    }, [isActive, isPaused, isRecording, pauseRecording, resumeRecording])

    const renderRecording = () => (
        <View style={styles.container}>
            <Text>Duration: {durationMs / 1000} seconds</Text>
            <Text>Size: {size} bytes</Text>
            <Text>Stream Events: {streamEvents}</Text>
            <Text>Analysis Events: {analysisEvents}</Text>
            <Text>Compression: {compression ? `${compression.format} - ${compression.size} bytes` : 'null'}</Text>
            <Button
                title={isActive ? 'Pause Recording' : 'Resume Recording'}
                onPress={() => setIsActive(!isActive)}
            />
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
            <Text>Stream Events: {streamEvents}</Text>
            <Text>Analysis Events: {analysisEvents}</Text>
            <Text>Compression: {compression ? `${compression.format} - ${compression.size} bytes` : 'null'}</Text>
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
            <Text>Recording Status:</Text>
            <Text>Is Recording: {String(isRecording)}</Text>
            <Text>Is Paused: {String(isPaused)}</Text>
            <Text>Duration: {durationMs / 1000} seconds</Text>
            <Text>Size: {size} bytes</Text>
            <Text>Stream Events: {streamEvents}</Text>
            <Text>Analysis Events: {analysisEvents}</Text>
            <Text>Compression: {compression ? `${compression.format} - ${compression.size} bytes` : 'null'}</Text>
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
            {isRecording
                ? renderRecording()
                : isPaused
                  ? renderPaused()
                  : renderStopped()}
        </>
    )
}
