import { TranscriberData } from '@siteed/expo-audio-stream'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { baseLogger, WhisperSampleRate } from '../config'
import {
    TranscriptionContextProps,
    useTranscription,
} from '../context/TranscriptionProvider'
import { formatDuration } from '../utils/utils'

const logger = baseLogger.extend('useLiveTranscriber')
interface LiveTranscriber extends TranscriptionContextProps {
    transcripts: TranscriberData[]
    activeTranscript: string
}

interface LiveTranscriberProps {
    audioBuffer: Float32Array
    sampleRate: number
    stopping: boolean
    enabled: boolean
    quickUpdateInterval?: number
    checkpointInterval?: number
}

const QUICK_UPDATE_INTERVAL = 1
const CHECKPOINT_INTERVAL = 15

export function useLiveTranscriber({
    audioBuffer,
    stopping,
    enabled,
    quickUpdateInterval = QUICK_UPDATE_INTERVAL,
    checkpointInterval = CHECKPOINT_INTERVAL,
}: LiveTranscriberProps): LiveTranscriber {
    const transcriber = useTranscription()
    const [transcripts, setTranscripts] = useState<TranscriberData[]>([])
    const [activeTranscript, setActiveTranscript] = useState('')

    const quickUpdateProcessing = useRef(false)
    // index in the audio buffer where the last update transcription was made
    const lastUpdateBufferIndex = useRef(0)

    const checkpointProcessing = useRef(false)
    const lastCheckpointBufferIndex = useRef(0)

    const activeJobId = useRef<string | null>(null)

    useEffect(() => {
        if (
            transcriber.transcript?.id === activeJobId.current &&
            transcriber.transcript.isBusy
        ) {
            setActiveTranscript(transcriber.transcript.text)
        }
    }, [transcriber.transcript])

    const handleTranscribe = useCallback(async ({
        interval,
        lastIndexRef,
        fetchDuration,
        processingRef,
        jobId,
    }: {
        interval: number
        jobId: string
        fetchDuration?: number // how much buffer to fetch in the past for better precision
        lastIndexRef: React.MutableRefObject<number>
        processingRef: React.MutableRefObject<boolean>
    }) => {
        const threshold = interval * WhisperSampleRate
        const accumulated = audioBuffer.length - lastIndexRef.current
        const remaining = threshold - accumulated

        let transcript: TranscriberData | undefined
        // logger.log(
        //     `[${jobId}] Remaining=${remaining} Accumulated=${accumulated}`
        // )
        if (stopping || remaining <= 0) {
            activeJobId.current = jobId
            processingRef.current = true
            try {
                let prevIndex = lastIndexRef.current
                if (fetchDuration) {
                    prevIndex = Math.max(
                        0,
                        audioBuffer.length - fetchDuration * WhisperSampleRate
                    )
                }
                const audioData = audioBuffer.slice(prevIndex)
                const adjustedPosition =
                    (audioBuffer.length - audioData.length) / WhisperSampleRate

                // logger.info(
                //     `[${jobId}] adjustedPosition: ${adjustedPosition} audioBuffer.length: ${audioBuffer.length} audioData.length: ${audioData.length}`
                // )
                const from = formatDuration(adjustedPosition * 1000)
                const to = formatDuration(
                    (audioBuffer.length / WhisperSampleRate) * 1000
                )
                const segmentDuration = audioData.length / WhisperSampleRate

                logger.info(
                    `[${jobId}] Starting transcription with ${audioData.length} samples from ${from} to ${to} (segmentDuration=${segmentDuration})`
                )

                const startTime = performance.now()
                transcript = await transcriber.transcribe({
                    audioData,
                    jobId,
                    position: adjustedPosition,
                })
                const time = performance.now() - startTime
                const transcriptionSpeed = time / segmentDuration
                logger.info(
                    `[${jobId}] [speed=${transcriptionSpeed}][chunks=${transcript?.chunks.length}][${transcript?.startTime}-${transcript?.endTime}] Transcribed ${audioData.length / WhisperSampleRate}s in ${time / 1000}s with ${audioData.length} samples`,
                    transcript?.text
                )
            } catch (e) {
                logger.error(`Failed to transcribe`, e)
                throw e
            } finally {
                processingRef.current = false
            }
        }
        return transcript
    }, [audioBuffer, transcriber, stopping])

    // Handle the quick update
    useEffect(() => {
        if (
            enabled &&
            !checkpointProcessing.current &&
            !quickUpdateProcessing.current &&
            audioBuffer.length > 0
        ) {
            handleTranscribe({
                interval: quickUpdateInterval,
                jobId: `QUICK_${Date.now()}`,
                fetchDuration: 10,
                lastIndexRef: lastUpdateBufferIndex,
                processingRef: quickUpdateProcessing,
            })
                .then((transcriptionResult) => {
                    quickUpdateProcessing.current = false
                    if (transcriptionResult) {
                        lastUpdateBufferIndex.current = audioBuffer.length
                        setActiveTranscript(transcriptionResult.text)
                    }
                    return transcriptionResult
                })
                .catch((e) => {
                    logger.error(`Failed to trancribe`, e)
                })
        }
    }, [audioBuffer, handleTranscribe, quickUpdateInterval, enabled])

    // Handle the checkpoint update
    useEffect(() => {
        if (
            enabled &&
            !checkpointProcessing.current &&
            audioBuffer.length > 0
        ) {
            checkpointProcessing.current = true
            handleTranscribe({
                interval: checkpointInterval,
                jobId: `CHECK_${Date.now()}`,
                lastIndexRef: lastCheckpointBufferIndex,
                processingRef: checkpointProcessing,
            })
                .then((transcriptionResult) => {
                    checkpointProcessing.current = false
                    if (transcriptionResult) {
                        setActiveTranscript('')
                        // Change the last index depending on last chunks if it doesnt contain an end time we can replay it.
                        const lastChunk =
                            transcriptionResult.chunks[
                                transcriptionResult.chunks.length - 1
                            ]
                        if (lastChunk.timestamp[1] === null) {
                            lastCheckpointBufferIndex.current =
                                lastChunk.timestamp[0] * WhisperSampleRate
                            // remove the last chunk since it is not complete
                            const removed = transcriptionResult.chunks.pop()
                            logger.debug(
                                `Removed last chunk time changed ${audioBuffer.length} -> ${lastCheckpointBufferIndex.current}`,
                                removed
                            )
                        } else {
                            lastCheckpointBufferIndex.current =
                                audioBuffer.length
                        }
                        setTranscripts((prev) => [
                            ...prev,
                            {
                                ...transcriptionResult,
                            },
                        ])
                    }
                    return transcriptionResult
                })
                .catch((e) => {
                    logger.error(`Failed to trancribe`, e)
                })
        }
    }, [audioBuffer, handleTranscribe, checkpointInterval, enabled])

    const liveTranscriber = useMemo(
        () => ({
            ...transcriber,
            transcripts,
            activeTranscript,
        }),
        [transcriber, transcripts, activeTranscript]
    )

    return liveTranscriber
}
