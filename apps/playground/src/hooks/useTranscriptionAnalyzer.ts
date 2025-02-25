import { useTranscription } from '../context/TranscriptionProvider'
import { useCallback, useState, useRef, useEffect } from 'react'
import { TranscriberData } from '@siteed/expo-audio-stream'
import { isWeb } from '../utils/utils'
import { baseLogger } from '../config'
import { min } from 'lodash'

const logger = baseLogger.extend('useTranscriptionAnalyzer')

interface UseTranscriptionAnalyzerProps {
    onError?: (error: Error) => void
    onTranscriptionUpdate?: (data: TranscriberData) => void
}

export function useTranscriptionAnalyzer({
    onError,
    onTranscriptionUpdate
}: UseTranscriptionAnalyzerProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const transcriptionContext = useTranscription()
    const activeJobRef = useRef<string | null>(null)

    const processAudioSegment = useCallback(async (
        audioData: Float32Array | Uint8Array | string,
        sampleRate: number
    ): Promise<TranscriberData | null> => {
        if (!audioData) return null
        
        if (isProcessing || activeJobRef.current || transcriptionContext.isBusy) {
            logger.debug('Skipping transcription - another one is in progress')
            return null
        }

        const jobId = `TRANSCRIBE_${Date.now()}`
        setIsProcessing(true)
        activeJobRef.current = jobId

        try {
            // Initial notification with busy state
            const initialData = {
                id: jobId,
                text: '',
                chunks: [],
                isBusy: true,
                startTime: Date.now(),
                endTime: Date.now()
            }
            onTranscriptionUpdate?.(initialData)

            const processedAudioData = isWeb && audioData instanceof Uint8Array
                ? new Float32Array(audioData.buffer)
                : audioData;

            if (isWeb) {
                const result = await transcriptionContext.transcribe({
                    audioData: processedAudioData as Float32Array,
                    jobId,
                    onChunkUpdate: ([text, { chunks }]) => {
                        if (jobId === activeJobRef.current) {
                            onTranscriptionUpdate?.({
                                id: jobId,
                                text,
                                chunks,
                                isBusy: true,
                                startTime: Date.now(),
                                endTime: Date.now()
                            })
                        }
                    }
                })
                
                if (result && jobId === activeJobRef.current) {
                    const finalResult = {
                        ...result,
                        isBusy: false,
                        id: jobId
                    }
                    onTranscriptionUpdate?.(finalResult)
                    return finalResult
                }
                
                return null
            } else {
                // // Mobile implementation using whisper.rn
                // // This assumes you have the whisper context initialized
                // const { whisperContext } = transcriptionContext
                // if (!whisperContext) {
                //     throw new Error('Whisper context not initialized')
                // }

                // const { promise } = whisperContext.transcribe(processedAudioData as string, {
                //     language: 'en',
                //     tokenTimestamps: true,
                //     tdrzEnable: true
                // })

                // const transcription = await promise
                // const result: TranscriberData = {
                //     id: jobId,
                //     isBusy: false,
                //     text: transcription.result.trim(),
                //     startTime: Date.now(),
                //     endTime: Date.now(),
                //     chunks: transcription.segments.map(segment => ({
                //         text: segment.text,
                //         timestamp: [segment.start, segment.end],
                //         probability: 1
                //     }))
                // }
                // onTranscriptionUpdate?.(result)
                // return result
                // TODO: Implement transcription for mobile
                return null
            }
        } catch (error) {
            logger.error('Transcription error:', error)
            onError?.(error instanceof Error ? error : new Error('Transcription failed'))
            return null
        } finally {
            // Only clear states if this is still the active job
            if (activeJobRef.current === jobId) {
                activeJobRef.current = null
                setIsProcessing(false)
            }
        }
    }, [transcriptionContext, onError, onTranscriptionUpdate, isProcessing])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            activeJobRef.current = null
            setIsProcessing(false)
        }
    }, [])

    return {
        isProcessing: isProcessing || !!activeJobRef.current || transcriptionContext.isBusy,
        isModelLoading: transcriptionContext.isModelLoading,
        processAudioSegment
    }
} 