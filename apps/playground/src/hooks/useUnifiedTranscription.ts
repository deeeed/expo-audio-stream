import { useCallback, useState, useRef, useEffect } from 'react'
import { TranscriberData } from '@siteed/expo-audio-stream'
import { useTranscription } from '../context/TranscriptionProvider'
import { baseLogger, WhisperSampleRate } from '../config'
import { isWeb } from '../utils/utils'

const logger = baseLogger.extend('useUnifiedTranscription')

interface TranscriptionOptions {
    onError?: (error: Error) => void
    onTranscriptionUpdate?: (data: TranscriberData) => void
    language?: string
}

interface TranscriptionResult {
    isProcessing: boolean
    isModelLoading: boolean
    transcribe: (audioData: Float32Array | Uint8Array, sampleRate: number, position?: number) => Promise<TranscriberData | null>
    transcribeLive: (audioBuffer: Float32Array, sampleRate: number, options?: {
        stopping?: boolean
        checkpointInterval?: number
    }) => Promise<TranscriberData | null>
    stopTranscription: () => void
    initialize: () => Promise<void>
}

export function useUnifiedTranscription({
    onError,
    onTranscriptionUpdate,
    language
}: TranscriptionOptions = {}): TranscriptionResult {
    const [isProcessing, setIsProcessing] = useState(false)
    const transcriptionContext = useTranscription()
    const activeJobRef = useRef<string | null>(null)
    const stopTranscriptionRef = useRef<(() => void) | null>(null)
    
    // For live transcription
    const lastCheckpointBufferIndex = useRef(0)
    const lastUpdateBufferIndex = useRef(0)
    
    const initialize = useCallback(async () => {
        try {
            await transcriptionContext.initialize();
            if (language && language !== 'auto') {
                await transcriptionContext.updateConfig({
                    language
                });
            }
        } catch (error) {
            logger.error('Failed to initialize transcription:', error);
            onError?.(error instanceof Error ? error : new Error('Failed to initialize transcription'));
        }
    }, [transcriptionContext, language, onError]);

    const stopTranscription = useCallback(() => {
        if (stopTranscriptionRef.current) {
            stopTranscriptionRef.current();
            stopTranscriptionRef.current = null;
        }
        
        activeJobRef.current = null;
        setIsProcessing(false);
    }, []);

    // One-time transcription of audio data
    const transcribe = useCallback(async (
        audioData: Float32Array | Uint8Array,
        sampleRate: number,
        position: number = 0
    ): Promise<TranscriberData | null> => {
        if (!audioData || audioData.length === 0) return null;
        
        if (isProcessing || activeJobRef.current || transcriptionContext.isBusy) {
            logger.debug('Skipping transcription - another one is in progress');
            return null;
        }

        const jobId = `TRANSCRIBE_${Date.now()}`;
        setIsProcessing(true);
        activeJobRef.current = jobId;

        try {
            // Initial notification with busy state
            const initialData: TranscriberData = {
                id: jobId,
                text: '',
                chunks: [],
                isBusy: true,
                startTime: Date.now(),
                endTime: Date.now()
            };
            onTranscriptionUpdate?.(initialData);

            // Process audio data based on platform
            const processedAudioData = isWeb && audioData instanceof Uint8Array
                ? new Float32Array(audioData.buffer)
                : audioData;

            const result = await transcriptionContext.transcribe({
                audioData: processedAudioData as Float32Array,
                jobId,
                position,
                onChunkUpdate: ([text, { chunks }]) => {
                    if (jobId === activeJobRef.current) {
                        const updateData: TranscriberData = {
                            id: jobId,
                            text,
                            chunks,
                            isBusy: true,
                            startTime: Date.now(),
                            endTime: Date.now()
                        };
                        onTranscriptionUpdate?.(updateData);
                    }
                }
            });
            
            if (result && jobId === activeJobRef.current) {
                const finalResult = {
                    ...result,
                    isBusy: false,
                    id: jobId
                };
                onTranscriptionUpdate?.(finalResult);
                return finalResult;
            }
            
            return null;
        } catch (error) {
            logger.error('Transcription error:', error);
            onError?.(error instanceof Error ? error : new Error('Transcription failed'));
            return null;
        } finally {
            // Only clear states if this is still the active job
            if (activeJobRef.current === jobId) {
                activeJobRef.current = null;
                setIsProcessing(false);
            }
        }
    }, [transcriptionContext, onError, onTranscriptionUpdate, isProcessing]);

    // Live transcription with continuous audio buffer
    const transcribeLive = useCallback(async (
        audioBuffer: Float32Array,
        sampleRate: number,
        options: {
            stopping?: boolean,
            checkpointInterval?: number
        } = {}
    ): Promise<TranscriberData | null> => {
        const { stopping = false, checkpointInterval = 15 } = options;
        
        if (!audioBuffer || audioBuffer.length === 0) return null;
        
        if (isProcessing && !stopping) {
            logger.debug('Live transcription already in progress');
            return null;
        }

        const jobId = `LIVE_${Date.now()}`;
        setIsProcessing(true);
        activeJobRef.current = jobId;

        try {
            // Calculate how much audio to process
            const threshold = checkpointInterval * WhisperSampleRate;
            const accumulated = audioBuffer.length - lastCheckpointBufferIndex.current;
            
            // Only process if we have enough new audio or we're stopping
            if (stopping || accumulated >= threshold) {
                const audioData = audioBuffer.slice(lastCheckpointBufferIndex.current);
                const adjustedPosition = (audioBuffer.length - audioData.length) / WhisperSampleRate;
                
                const result = await transcriptionContext.transcribe({
                    audioData,
                    jobId,
                    position: adjustedPosition,
                    onChunkUpdate: ([text, { chunks }]) => {
                        if (jobId === activeJobRef.current) {
                            const updateData: TranscriberData = {
                                id: jobId,
                                text,
                                chunks,
                                isBusy: true,
                                startTime: adjustedPosition * 1000,
                                endTime: (audioBuffer.length / sampleRate) * 1000
                            };
                            onTranscriptionUpdate?.(updateData);
                        }
                    }
                });
                
                if (result) {
                    // Update the checkpoint index for next time
                    if (result.chunks.length > 0) {
                        const lastChunk = result.chunks[result.chunks.length - 1];
                        if (lastChunk.timestamp[1] === null) {
                            // Incomplete chunk, don't include it in the checkpoint
                            lastCheckpointBufferIndex.current = 
                                lastChunk.timestamp[0] * WhisperSampleRate;
                        } else {
                            lastCheckpointBufferIndex.current = audioBuffer.length;
                        }
                    } else {
                        lastCheckpointBufferIndex.current = audioBuffer.length;
                    }
                    
                    return result;
                }
            }
            
            return null;
        } catch (error) {
            logger.error('Live transcription error:', error);
            onError?.(error instanceof Error ? error : new Error('Live transcription failed'));
            return null;
        } finally {
            if (stopping && activeJobRef.current === jobId) {
                activeJobRef.current = null;
                setIsProcessing(false);
            }
        }
    }, [transcriptionContext, onError, onTranscriptionUpdate, isProcessing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTranscription();
        };
    }, [stopTranscription]);

    return {
        isProcessing: isProcessing || !!activeJobRef.current || transcriptionContext.isBusy,
        isModelLoading: transcriptionContext.isModelLoading,
        transcribe,
        transcribeLive,
        stopTranscription,
        initialize
    };
} 