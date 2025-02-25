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
    const _lastUpdateBufferIndex = useRef(0)
    
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
        _sampleRate: number,
        position: number = 0
    ): Promise<TranscriberData | null> => {
        if (!audioData || audioData.length === 0) return null;
        
        if (isProcessing || activeJobRef.current || transcriptionContext.isBusy) {
            logger.debug('Skipping transcription - another one in progress');
            return null;
        }

        const jobId = `TRANSCRIBE_${Date.now()}`;
        setIsProcessing(true);
        activeJobRef.current = jobId;

        try {
            const initialData: TranscriberData = {
                id: jobId,
                text: '',
                chunks: [],
                isBusy: true,
                startTime: Date.now(),
                endTime: Date.now()
            };
            onTranscriptionUpdate?.(initialData);

            const processedAudioData = isWeb && audioData instanceof Uint8Array
                ? new Float32Array(audioData.buffer)
                : audioData;

            const { promise } = await transcriptionContext.transcribe({
                audioData: processedAudioData as Float32Array,
                jobId,
                position,
                options: {
                    language: language === 'auto' ? undefined : language,
                },
                onNewSegments: (result) => {
                    if (jobId === activeJobRef.current) {
                        const chunks = result.segments.map((segment) => ({
                            text: segment.text.trim(),
                            timestamp: [
                                segment.t0 / 100,
                                segment.t1 ? segment.t1 / 100 : null,
                            ] as [number, number | null],
                        }));

                        const text = chunks.map((c) => c.text).join(' ');
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

            const transcription = await promise;
            
            if (transcription && jobId === activeJobRef.current) {
                onTranscriptionUpdate?.(transcription);
                return transcription;
            }
            
            return null;
        } catch (error) {
            logger.error('Transcription error:', error);
            onError?.(error instanceof Error ? error : new Error('Transcription failed'));
            return null;
        } finally {
            if (activeJobRef.current === jobId) {
                activeJobRef.current = null;
                setIsProcessing(false);
            }
        }
    }, [transcriptionContext, onError, onTranscriptionUpdate, isProcessing, language]);

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
            const threshold = checkpointInterval * WhisperSampleRate;
            const accumulated = audioBuffer.length - lastCheckpointBufferIndex.current;
            
            if (stopping || accumulated >= threshold) {
                const audioData = audioBuffer.slice(lastCheckpointBufferIndex.current);
                const adjustedPosition = (audioBuffer.length - audioData.length) / WhisperSampleRate;
                
                const { promise, stop } = await transcriptionContext.transcribe({
                    audioData,
                    jobId,
                    position: adjustedPosition,
                    options: {
                        language: language === 'auto' ? undefined : language,
                    },
                    onNewSegments: (result) => {
                        if (jobId === activeJobRef.current) {
                            const chunks = result.segments.map((segment) => ({
                                text: segment.text.trim(),
                                timestamp: [
                                    segment.t0 / 100,
                                    segment.t1 ? segment.t1 / 100 : null,
                                ] as [number, number | null],
                            }));

                            const text = chunks.map((c) => c.text).join(' ');
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

                stopTranscriptionRef.current = stop;
                const transcription = await promise;
                
                if (transcription && jobId === activeJobRef.current) {
                    if (transcription.chunks.length > 0) {
                        const lastChunk = transcription.chunks[transcription.chunks.length - 1];
                        lastCheckpointBufferIndex.current = lastChunk.timestamp[1] !== null
                            ? audioBuffer.length
                            : lastChunk.timestamp[0] * WhisperSampleRate;
                    } else {
                        lastCheckpointBufferIndex.current = audioBuffer.length;
                    }
                    
                    return transcription;
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
    }, [transcriptionContext, onError, onTranscriptionUpdate, isProcessing, language]);

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