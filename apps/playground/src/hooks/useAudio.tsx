// playground/src/hooks/useAudio.tsx
import { useToast } from '@siteed/design-system'
import {
    AudioAnalysis,
    AudioRecording,
    extractAudioAnalysis,
} from '@siteed/expo-audio-stream'
import { Audio, AVPlaybackStatus } from 'expo-av'
import { useCallback, useEffect, useState } from 'react'

import { SelectedAnalysisConfig } from '../component/AudioRecordingAnalysisConfig'
import { baseLogger, config } from '../config'
import { fetchArrayBuffer } from '../utils/utils'

interface PlayOptions {
    position?: number
}

interface UpdatePlaybackOptions {
    position?: number
    speed?: number
}

interface UseAudioOptions {
    loadArrayBuffer?: boolean
    extractAnalysis?: boolean
    analysisOptions?: SelectedAnalysisConfig
}

export interface UseAudioProps {
    audioUri?: string | undefined
    recording?: AudioRecording
    options: UseAudioOptions
}

const logger = baseLogger.extend('useAudio')

export const useAudio = ({ audioUri, recording, options }: UseAudioProps) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [position, setPosition] = useState(0)
    const [soundLoaded, setSoundLoaded] = useState(false)
    const [speed, setSpeed] = useState(1) // Add state for speed
    const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>()
    const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(
        null
    )
    const { show } = useToast()

    useEffect(() => {
        return () => {
            sound?.unloadAsync()
        }
    }, [sound])

    useEffect(() => {
        if (!audioUri) return

        logger.debug(`useEffect Audio URI: ${audioUri}`)
        const processAudioData = async () => {
            try {
                setProcessing(true)
                let actualAudioBuffer: ArrayBuffer | undefined

                if (options.loadArrayBuffer) {
                    if (!audioUri) return
                    logger.debug(`Fetching audio array buffer from ${audioUri}`)
                    const buffer = await fetchArrayBuffer(audioUri)
                    actualAudioBuffer = buffer.slice(0)
                    setArrayBuffer(actualAudioBuffer)
                    logger.debug(
                        `Fetched audio array buffer from ${audioUri} --> length: ${buffer.byteLength} bytes`
                    )
                }

                if (options.extractAnalysis) {
                    const analysis = await extractAudioAnalysis({
                        fileUri: actualAudioBuffer ? undefined : audioUri, // Priority to audioBuffer if provided
                        skipWavHeader: options.analysisOptions?.skipWavHeader,
                        arrayBuffer: actualAudioBuffer,
                        sampleRate: recording?.sampleRate,
                        bitDepth: recording?.bitDepth,
                        durationMs: recording?.durationMs,
                        numberOfChannels: recording?.channels,
                        algorithm: options.analysisOptions?.algorithm,
                        pointsPerSecond:
                            options.analysisOptions?.pointsPerSecond,
                        features: options.analysisOptions?.features,
                        featuresExtratorUrl: config.featuresExtratorUrl,
                    })
                    setAudioAnalysis(analysis)
                    // logger.debug(`Extracted audio analysis from ${audioUri}`, analysis);
                }
            } catch (error) {
                logger.error(`Failed to process audio ${audioUri}:`, error)
                show({ type: 'error', message: 'Failed to load audio data' })
            } finally {
                setProcessing(false)
            }
        }

        processAudioData().catch(logger.error)
    }, [
        audioUri,
        options.loadArrayBuffer,
        options.extractAnalysis,
        options.analysisOptions?.skipWavHeader,
        options.analysisOptions?.pointsPerSecond,
        options.analysisOptions?.algorithm,
        logger,
        show,
    ])

    const updatePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
            if ('error' in status) {
                logger.error(`Playback Error: ${status.error}`)
            }
            return
        }

        setPosition(status.positionMillis)
        setSoundLoaded(true)

        if (status.didJustFinish) {
            setIsPlaying(false)
            setPosition(0) // Reset position when playback finishes
        }
    }, [])

    const play = async (options?: PlayOptions) => {
        if (!audioUri) return
        try {
            if (!sound) {
                console.log(`Playing audio from ${audioUri}`)
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: audioUri },
                    {
                        shouldPlay: true,
                        positionMillis: options?.position || position,
                    }
                )
                newSound.setOnPlaybackStatusUpdate(updatePlaybackStatus)
                setSound(newSound)
                setIsPlaying(true)

                // Apply stored options
                if (speed !== 1) {
                    await newSound.setRateAsync(speed, false)
                }
            } else {
                if (options?.position !== undefined) {
                    await sound.setPositionAsync(options.position)
                }
                await sound.playAsync()
                setIsPlaying(true)
            }
        } catch (error) {
            logger.error('Failed to play the audio:', error)
            show({ type: 'error', message: 'Failed to play the audio' })
        }
    }

    const pause = async () => {
        if (!audioUri || !sound) return
        try {
            await sound.pauseAsync()
            setIsPlaying(false)
        } catch (error) {
            logger.error('Failed to pause the audio:', error)
            show({ type: 'error', message: 'Failed to pause the audio' })
        }
    }

    const updatePlaybackOptions = async (options: UpdatePlaybackOptions) => {
        logger.debug('Updating playback options:', options)
        if (options.position !== undefined) {
            logger.debug(`Set playback position to ${options.position}`)
            setPosition(options.position)
            if (sound && soundLoaded) {
                // Check if sound is loaded before updating position
                await sound.setPositionAsync(options.position)
            }
        }
        if (options.speed !== undefined) {
            logger.debug(`Set playback speed to ${options.speed}`)
            setSpeed(options.speed)
            if (sound) {
                await sound.setRateAsync(options.speed, false)
            }
        }
    }

    return {
        arrayBuffer,
        audioAnalysis,
        isPlaying,
        position,
        processing,
        soundLoaded,
        sound,
        play,
        pause,
        updatePlaybackOptions,
    }
}
