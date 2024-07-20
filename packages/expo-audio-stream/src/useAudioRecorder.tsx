// src/useAudioRecorder.ts
import { Platform, Subscription } from 'expo-modules-core'
import { useCallback, useEffect, useReducer, useRef } from 'react'

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import {
    AudioDataEvent,
    AudioEventPayload,
    AudioRecordingResult,
    AudioStreamStatus,
    RecordingConfig,
    StartRecordingResult,
} from './ExpoAudioStream.types'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'
import { addAudioAnalysisListener, addAudioEventListener } from './events'
import { disableAllLoggers, enableAllLoggers, getLogger } from './logger'

const TAG = 'useAudioRecorder'
const logger = getLogger(TAG)
export interface UseAudioRecorderProps {
    debug?: boolean
    audioWorkletUrl?: string
    featuresExtratorUrl?: string
}

export interface UseAudioRecorderState {
    startRecording: (_: RecordingConfig) => Promise<StartRecordingResult>
    stopRecording: () => Promise<AudioRecordingResult | null>
    pauseRecording: () => void
    resumeRecording: () => void
    isRecording: boolean
    isPaused: boolean
    durationMs: number // Duration of the recording
    size: number // Size in bytes of the recorded audio
    analysisData?: AudioAnalysis
}

interface RecorderReducerState {
    isRecording: boolean
    isPaused: boolean
    durationMs: number
    size: number
    analysisData?: AudioAnalysis
}

type RecorderAction =
    | { type: 'START' | 'STOP' | 'PAUSE' | 'RESUME' }
    | { type: 'UPDATE_STATUS'; payload: { durationMs: number; size: number } }
    | { type: 'UPDATE_ANALYSIS'; payload: AudioAnalysis }

const defaultAnalysis: AudioAnalysis = {
    pointsPerSecond: 10,
    bitDepth: 32,
    numberOfChannels: 1,
    durationMs: 0,
    sampleRate: 44100,
    samples: 0,
    dataPoints: [],
    amplitudeRange: {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
    },
}

function audioRecorderReducer(
    state: RecorderReducerState,
    action: RecorderAction
): RecorderReducerState {
    switch (action.type) {
        case 'START':
            return {
                ...state,
                isRecording: true,
                isPaused: false,
                durationMs: 0,
                size: 0,
                analysisData: defaultAnalysis, // Reset analysis data
            }
        case 'STOP':
            return { ...state, isRecording: false, isPaused: false }
        case 'PAUSE':
            return { ...state, isPaused: true, isRecording: false }
        case 'RESUME':
            return { ...state, isPaused: false, isRecording: true }
        case 'UPDATE_STATUS':
            return {
                ...state,
                durationMs: action.payload.durationMs,
                size: action.payload.size,
            }
        case 'UPDATE_ANALYSIS':
            return {
                ...state,
                analysisData: action.payload,
            }
        default:
            return state
    }
}

interface HandleAudioAnalysisProps {
    analysis: AudioAnalysis
    visualizationDuration: number
}

export function useAudioRecorder({
    debug = false,
    audioWorkletUrl,
    featuresExtratorUrl,
}: UseAudioRecorderProps = {}): UseAudioRecorderState {
    const [state, dispatch] = useReducer(audioRecorderReducer, {
        isRecording: false,
        isPaused: false,
        durationMs: 0,
        size: 0,
        analysisData: undefined,
    })

    const analysisListenerRef = useRef<Subscription | null>(null)
    const analysisRef = useRef<AudioAnalysis>({ ...defaultAnalysis })

    // Instantiate the module for web with URLs
    const ExpoAudioStream =
        Platform.OS === 'web'
            ? ExpoAudioStreamModule({ audioWorkletUrl, featuresExtratorUrl })
            : ExpoAudioStreamModule

    const onAudioStreamRef = useRef<
        ((_: AudioDataEvent) => Promise<void>) | null
    >(null)

    const handleAudioAnalysis = useCallback(
        async ({
            analysis,
            visualizationDuration,
        }: HandleAudioAnalysisProps) => {
            const savedAnalysisData = analysisRef.current || {
                ...defaultAnalysis,
            }

            const maxDuration = visualizationDuration

            logger.debug(
                `[handleAudioAnalysis] Received audio analysis: maxDuration=${maxDuration} analysis.dataPoints=${analysis.dataPoints.length} analysisData.dataPoints=${savedAnalysisData.dataPoints.length}`,
                analysis
            )

            // Combine data points
            const combinedDataPoints = [
                ...savedAnalysisData.dataPoints,
                ...analysis.dataPoints,
            ]

            // Calculate the new duration
            const pointsPerSecond =
                analysis.pointsPerSecond || savedAnalysisData.pointsPerSecond
            const maxDataPoints =
                (pointsPerSecond * visualizationDuration) / 1000

            logger.debug(
                `[handleAudioAnalysis] Combined data points before trimming: pointsPerSecond=${pointsPerSecond} visualizationDuration=${visualizationDuration} combinedDataPointsLength=${combinedDataPoints.length} vs maxDataPoints=${maxDataPoints}`
            )

            // Trim data points to keep within the maximum number of data points
            if (combinedDataPoints.length > maxDataPoints) {
                combinedDataPoints.splice(
                    0,
                    combinedDataPoints.length - maxDataPoints
                )
            }

            savedAnalysisData.dataPoints = combinedDataPoints
            savedAnalysisData.bitDepth =
                analysis.bitDepth || savedAnalysisData.bitDepth
            savedAnalysisData.durationMs =
                combinedDataPoints.length * (1000 / pointsPerSecond)

            // Update amplitude range
            const newMin = Math.min(
                savedAnalysisData.amplitudeRange.min,
                analysis.amplitudeRange.min
            )
            const newMax = Math.max(
                savedAnalysisData.amplitudeRange.max,
                analysis.amplitudeRange.max
            )

            savedAnalysisData.amplitudeRange = {
                min: newMin,
                max: newMax,
            }

            logger.debug(
                `[handleAudioAnalysis] Updated analysis data: durationMs=${savedAnalysisData.durationMs}`,
                savedAnalysisData
            )

            // Update the ref
            analysisRef.current = savedAnalysisData

            // Dispatch the updated analysis data to state to trigger re-render
            // need to use spread operator otherwise it doesnt trigger update.
            dispatch({
                type: 'UPDATE_ANALYSIS',
                payload: { ...savedAnalysisData },
            })
        },
        [dispatch]
    )

    const handleAudioEvent = useCallback(
        async (eventData: AudioEventPayload) => {
            const {
                fileUri,
                deltaSize,
                totalSize,
                lastEmittedSize,
                position,
                streamUuid,
                encoded,
                mimeType,
                buffer,
            } = eventData
            logger.debug(`[handleAudioEvent] Received audio event:`, {
                fileUri,
                deltaSize,
                totalSize,
                position,
                mimeType,
                lastEmittedSize,
                streamUuid,
                encodedLength: encoded?.length,
            })
            if (deltaSize === 0) {
                // Ignore packet with no data
                return
            }
            try {
                // Coming from native ( ios / android ) otherwise buffer is set
                if (Platform.OS !== 'web') {
                    // Read the audio file as a base64 string for comparison
                    if (!encoded) {
                        console.error(`${TAG} Encoded audio data is missing`)
                        throw new Error('Encoded audio data is missing')
                    }
                    onAudioStreamRef.current?.({
                        data: encoded,
                        position,
                        fileUri,
                        eventDataSize: deltaSize,
                        totalSize,
                    })
                } else if (buffer) {
                    // Coming from web
                    const webEvent: AudioDataEvent = {
                        data: buffer,
                        position,
                        fileUri,
                        eventDataSize: deltaSize,
                        totalSize,
                    }
                    onAudioStreamRef.current?.(webEvent)
                    logger.debug(
                        `[handleAudioEvent] Audio data sent to onAudioStream`,
                        webEvent
                    )
                }
            } catch (error) {
                console.error(`${TAG} Error processing audio event:`, error)
            }
        },
        []
    )

    const checkStatus = useCallback(async () => {
        try {
            if (!state.isRecording) {
                logger.debug(`Not recording, exiting status check.`)
                return
            }

            const status: AudioStreamStatus = ExpoAudioStream.status()
            if (debug) {
                logger.debug(`Status:`, status)
            }

            dispatch({
                type: 'UPDATE_STATUS',
                payload: { durationMs: status.durationMs, size: status.size },
            })
        } catch (error) {
            console.error(`${TAG} Error getting status:`, error)
        }
    }, [state.isRecording])

    const startRecording = useCallback(
        async (recordingOptions: RecordingConfig) => {
            logger.debug(`start recoding`, recordingOptions)

            analysisRef.current = { ...defaultAnalysis } // Reset analysis data

            const { onAudioStream, ...options } = recordingOptions
            const { enableProcessing } = options

            const maxRecentDataDuration = 10000 // TODO compute maxRecentDataDuration based on screen dimensions
            if (typeof onAudioStream === 'function') {
                onAudioStreamRef.current = onAudioStream
            } else {
                console.warn(
                    `${TAG} onAudioStream is not a function`,
                    onAudioStream
                )
                onAudioStreamRef.current = null
            }
            const startResult: StartRecordingResult =
                await ExpoAudioStream.startRecording(options)
            dispatch({ type: 'START' })

            if (enableProcessing) {
                logger.debug(`Enabling audio analysis listener`)
                const listener = addAudioAnalysisListener(
                    async (analysisData) => {
                        try {
                            await handleAudioAnalysis({
                                analysis: analysisData.analysis,
                                visualizationDuration: maxRecentDataDuration,
                            })
                        } catch (error) {
                            console.warn(
                                `${TAG} Error processing audio analysis:`,
                                error
                            )
                        }
                    }
                )

                analysisListenerRef.current = listener
            }

            return startResult
        },
        [handleAudioAnalysis, dispatch]
    )

    const stopRecording = useCallback(async () => {
        logger.debug(`stoping recording`)

        const stopResult: AudioRecordingResult =
            await ExpoAudioStream.stopRecording()
        stopResult.analysisData = analysisRef.current

        if (analysisListenerRef.current) {
            analysisListenerRef.current.remove()
            analysisListenerRef.current = null
        }
        onAudioStreamRef.current = null
        logger.debug(`recording stopped`, stopResult)
        dispatch({ type: 'STOP' })
        return stopResult
    }, [dispatch])

    const pauseRecording = useCallback(async () => {
        logger.debug(`pause recording`)
        const pauseResult = await ExpoAudioStream.pauseRecording()
        dispatch({ type: 'PAUSE' })
        return pauseResult
    }, [dispatch])

    const resumeRecording = useCallback(async () => {
        logger.debug(`resume recording`)
        const resumeResult = await ExpoAudioStream.resumeRecording()
        dispatch({ type: 'RESUME' })
        return resumeResult
    }, [dispatch])

    useEffect(() => {
        let interval: ReturnType<typeof setTimeout>
        if (state.isRecording) {
            interval = setInterval(checkStatus, 1000)
        }
        return () => {
            if (interval) {
                clearInterval(interval)
            }
        }
    }, [checkStatus, state.isRecording])

    useEffect(() => {
        logger.debug(`Registering audio event listener`)
        const subscribeAudio = addAudioEventListener(handleAudioEvent)

        logger.debug(
            `Subscribed to audio event listener and analysis listener`,
            {
                subscribeAudio,
            }
        )

        return () => {
            logger.debug(`Removing audio event listener`)
            subscribeAudio.remove()
        }
    }, [handleAudioEvent, handleAudioAnalysis])

    useEffect(() => {
        if (debug) {
            enableAllLoggers()
        } else {
            disableAllLoggers()
        }
    }, [debug])

    return {
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        isPaused: state.isPaused,
        isRecording: state.isRecording,
        durationMs: state.durationMs,
        size: state.size,
        analysisData: state.analysisData,
    }
}
