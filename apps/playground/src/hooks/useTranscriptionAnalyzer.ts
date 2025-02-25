import { TranscriberData } from '@siteed/expo-audio-stream'
import { useCallback, useEffect, useState } from 'react'
import { baseLogger } from '../config'
import { useUnifiedTranscription } from './useUnifiedTranscription'

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
    const {
        isProcessing,
        isModelLoading,
        transcribe,
        initialize
    } = useUnifiedTranscription({
        onError,
        onTranscriptionUpdate,
        language
    });

    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize the transcription model if not already done
    useEffect(() => {
        if (!isInitialized && !isModelLoading) {
            initialize()
                .then(() => setIsInitialized(true))
                .catch(error => {
                    logger.error('Failed to initialize transcription:', error);
                    onError?.(error instanceof Error ? error : new Error('Failed to initialize transcription'));
                });
        }
    }, [initialize, isInitialized, isModelLoading, onError]);

    const processAudioSegment = useCallback(async (
        audioData: Float32Array | Uint8Array | string,
        sampleRate: number
    ): Promise<TranscriberData | null> => {
        if (!audioData) return null;
        
        // Handle string input for native platforms
        if (typeof audioData === 'string') {
            logger.error('String audio data is not supported in this analyzer');
            onError?.(new Error('String audio data is not supported in this analyzer'));
            return null;
        }
        
        // Process the audio data
        return transcribe(audioData, sampleRate);
    }, [transcribe, onError]);

    return {
        isProcessing,
        isModelLoading,
        processAudioSegment
    };
} 