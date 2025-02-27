import { TranscriberData } from '@siteed/expo-audio-stream'
import { useCallback, useEffect, useState } from 'react'
import { baseLogger } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'
import { AudioInputData } from '../context/TranscriptionProvider.types'

const logger = baseLogger.extend('useTranscriptionAnalyzer')

interface UseTranscriptionAnalyzerProps {
    onError?: (error: Error) => void
    onTranscriptionUpdate?: (data: TranscriberData) => void
    language?: string
}

export function useTranscriptionAnalyzer({
    onError,
    onTranscriptionUpdate,
    language = 'auto'
}: UseTranscriptionAnalyzerProps) {
    const [isInitialized, setIsInitialized] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [_activeJobId, setActiveJobId] = useState<string | null>(null)
    
    // Get the transcription context directly
    const transcriptionContext = useTranscription()
    
    // Initialize the transcription model if not already done
    useEffect(() => {
        if (!isInitialized && !transcriptionContext.isModelLoading) {
            // Update language config if needed
            if (language !== 'auto' && language !== transcriptionContext.language) {
                transcriptionContext.updateConfig({ language })
                    .then(() => transcriptionContext.initialize())
                    .then(() => setIsInitialized(true))
                    .catch((error: Error) => {
                        logger.error('Failed to initialize transcription:', error)
                        onError?.(error instanceof Error ? error : new Error('Failed to initialize transcription'))
                    })
            } else {
                // Simply call initialize and set state to initialized
                transcriptionContext.initialize()
                    .then(() => {
                        setIsInitialized(true);
                        return true;
                    })
                    .catch((error: unknown) => {
                        logger.error('Failed to initialize transcription:', error);
                        onError?.(error instanceof Error ? error : new Error('Failed to initialize transcription'));
                        return false;
                    });
            }
        }
    }, [transcriptionContext, isInitialized, language, onError])
    
    // Process audio segment directly using the provider
    const processAudioSegment = useCallback(async (
        audioData: AudioInputData,
    ): Promise<TranscriberData | null> => {
        if (!audioData) return null
        
        // Handle string input for native platforms
        if (typeof audioData === 'string') {
            logger.error('String audio data is not supported in this analyzer')
            onError?.(new Error('String audio data is not supported in this analyzer'))
            return null
        }
        
        // Skip if already processing
        if (isProcessing || transcriptionContext.isBusy) {
            logger.debug('Skipping transcription - another one in progress')
            return null
        }
        
        setIsProcessing(true)
        
        try {
            // new Float32Array(audioData.buffer)
                
            const { promise, jobId } = await transcriptionContext.transcribe({
                audioData,
                onNewSegments: (result) => {
                    // Convert segments to the format expected by components
                    const chunks = result.segments.map((segment) => ({
                        text: segment.text.trim(),
                        timestamp: [
                            segment.t0 / 100,
                            segment.t1 ? segment.t1 / 100 : null,
                        ] as [number, number | null],
                    }))
                    
                    const text = chunks.map((c) => c.text).join(' ')
                    const updateData: TranscriberData = {
                        id: jobId,
                        text,
                        chunks,
                        isBusy: true,
                        startTime: Date.now(),
                        endTime: Date.now()
                    }
                    
                    onTranscriptionUpdate?.(updateData)
                }
            })
            
            setActiveJobId(jobId)
            
            // Wait for the transcription to complete
            const result = await promise
            onTranscriptionUpdate?.(result)
            return result
        } catch (error) {
            logger.error('Transcription error:', error)
            onError?.(error instanceof Error ? error : new Error('Transcription failed'))
            return null
        } finally {
            setIsProcessing(false)
            setActiveJobId(null)
        }
    }, [transcriptionContext, isProcessing, onError, onTranscriptionUpdate])
    
    return {
        isProcessing: isProcessing || transcriptionContext.isBusy,
        isModelLoading: transcriptionContext.isModelLoading,
        processAudioSegment
    }
} 