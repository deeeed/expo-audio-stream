import { useCallback, useState, useRef, useEffect } from 'react'
import { TranscriberData } from '@siteed/expo-audio-studio'
import { useTranscription } from '../context/TranscriptionProvider'
import { baseLogger } from '../config'
import { isWeb } from '../utils/utils'
import { TranscribeRealtimeOptions } from 'whisper.rn'
const logger = baseLogger.extend('useUnifiedTranscription')

export interface TranscriptionOptions {
    onError?: (error: Error) => void
    onTranscriptionUpdate?: (data: TranscriberData) => void
    language?: string
    stopping?: boolean
    checkpointInterval?: number
    dataSize?: number
}

export interface RealtimeTranscriptionOptions extends TranscribeRealtimeOptions {
    language?: string
}

export interface TranscriptionResult {
    isProcessing: boolean
    isModelLoading: boolean
    transcribe: (audioData: Float32Array | Uint8Array | string, sampleRate: number, position?: number) => Promise<TranscriberData | null>
    transcribeLive: (audioBuffer: Float32Array | Uint8Array | string, sampleRate: number, options?: TranscriptionOptions) => Promise<TranscriberData | null>
    startRealtimeTranscription: (options?: RealtimeTranscriptionOptions) => Promise<void>
    stopRealtimeTranscription: () => Promise<void>
    isRealtimeTranscribing: boolean
    initialize: () => Promise<void>
}

export function useUnifiedTranscription({
    onError,
    onTranscriptionUpdate,
    language
}: TranscriptionOptions = {}): TranscriptionResult {
    const [isProcessing, setIsProcessing] = useState(false)
    const [isRealtimeTranscribing, setIsRealtimeTranscribing] = useState(false)
    const transcriptionContext = useTranscription()
    const activeJobRef = useRef<string | null>(null)
    const stopTranscriptionRef = useRef<(() => void) | null>(null)
    const realtimeStopFnRef = useRef<(() => Promise<void>) | null>(null)
    
    // For live transcription (prefix with _ to indicate it might not be used directly)
    const _lastCheckpointBufferIndex = useRef(0)
    
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

    // Stop any active transcription
    const stopTranscription = useCallback(() => {
        if (stopTranscriptionRef.current) {
            stopTranscriptionRef.current();
            stopTranscriptionRef.current = null;
        }
        
        activeJobRef.current = null;
        setIsProcessing(false);
    }, []);

    // Stop realtime transcription
    const stopRealtimeTranscription = useCallback(async () => {
        logger.debug('Stopping realtime transcription');
        
        if (realtimeStopFnRef.current) {
            try {
                await realtimeStopFnRef.current();
            } catch (error) {
                logger.error('Error stopping realtime transcription:', error);
            }
            realtimeStopFnRef.current = null;
        }
        
        setIsRealtimeTranscribing(false);
        return Promise.resolve();
    }, []);

    // Start realtime transcription through the context API
    const startRealtimeTranscription = useCallback(async (options?: RealtimeTranscriptionOptions) => {
        logger.debug('Starting realtime transcription (platform: ' + (isWeb ? 'web' : 'native') + ')');
        
        if (isRealtimeTranscribing) {
            logger.debug('Realtime transcription already in progress');
            return;
        }
        
        // First ensure context is initialized
        if (!transcriptionContext.ready) {
            logger.debug('Initializing transcription context before starting realtime transcription');
            await initialize();
            
            // Add a short delay to ensure the context is ready
            if (!transcriptionContext.ready) {
                await new Promise(resolve => setTimeout(resolve, 300));
                if (!transcriptionContext.ready) {
                    logger.warn('Transcription context not ready after initialization and waiting');
                }
            }
        }
        
        const jobId = `REALTIME_${Date.now()}`;
        activeJobRef.current = jobId;
        
        try {
            setIsRealtimeTranscribing(true);
            
            const initialData: TranscriberData = {
                id: jobId,
                text: '',
                chunks: [],
                isBusy: true,
                startTime: Date.now(),
                endTime: Date.now()
            };
            onTranscriptionUpdate?.(initialData);
            
            // Configure language option
            const realtimeOptions = {
                language: language === 'auto' ? undefined : language,
                ...options
            };
            
            // This will be added to TranscriptionProvider
            const { stop } = await transcriptionContext.transcribeRealtime({
                jobId,
                options: realtimeOptions,
                onTranscriptionUpdate: (data: TranscriberData) => {
                    if (jobId === activeJobRef.current) {
                        onTranscriptionUpdate?.(data);
                        
                        // If the transcription is complete
                        if (!data.isBusy) {
                            setIsRealtimeTranscribing(false);
                            realtimeStopFnRef.current = null;
                            activeJobRef.current = null;
                        }
                    }
                }
            });
            
            // Save the stop function
            realtimeStopFnRef.current = stop;
            
        } catch (error) {
            logger.error('Failed to start realtime transcription:', error);
            onError?.(error instanceof Error ? error : new Error('Failed to start realtime transcription'));
            setIsRealtimeTranscribing(false);
            activeJobRef.current = null;
        }
    }, [transcriptionContext, language, onTranscriptionUpdate, onError, initialize, isRealtimeTranscribing]);

    // One-time transcription of audio data
    const transcribe = useCallback(async (
        audioData: Float32Array | Uint8Array | string,
        _sampleRate: number,
        position: number = 0
    ): Promise<TranscriberData | null> => {
        if (!audioData || (typeof audioData !== 'string' && audioData.length === 0)) return null;
        
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

            const processedAudioData = isWeb && typeof audioData === 'string'
                ? new Float32Array(Buffer.from(audioData, 'base64'))
                : typeof audioData !== 'string' ? audioData : new Float32Array(Buffer.from(audioData, 'base64'));

            const { promise, stop } = await transcriptionContext.transcribe({
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

            stopTranscriptionRef.current = stop;
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

    // For web or fallback, we keep the batch processing method
    const transcribeLive = useCallback(async (
        audioBuffer: Float32Array | Uint8Array | string,
        sampleRate: number,
        options: {
            stopping?: boolean,
            checkpointInterval?: number
        } = {}
    ): Promise<TranscriberData | null> => {
        // Only proceed if we're not in realtime mode (for native) or we're on web
        if (!isWeb && isRealtimeTranscribing) {
            return null;
        }
        
        const { stopping = false, checkpointInterval = 15 } = options;
        
        if (!audioBuffer || (typeof audioBuffer !== 'string' && audioBuffer.length === 0)) return null;
        
        if (isProcessing && !stopping) {
            logger.debug('Live transcription already in progress');
            return null;
        }

        const jobId = `LIVE_${Date.now()}`;
        setIsProcessing(true);
        activeJobRef.current = jobId;

        try {
            const threshold = checkpointInterval * sampleRate;
            const accumulated = typeof audioBuffer === 'string' ? 
                (audioBuffer.length * 3) / 4 : // Estimate base64 decoded size
                audioBuffer.length;
            
            if (stopping || accumulated >= threshold) {
                const audioData = audioBuffer;
                const adjustedPosition = (accumulated - (typeof audioBuffer === 'string' ? 
                    (audioBuffer.length * 3) / 4 : 
                    audioBuffer.length)) / sampleRate;
                
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
                                endTime: (accumulated / sampleRate) * 1000
                            };
                            onTranscriptionUpdate?.(updateData);
                        }
                    }
                });

                stopTranscriptionRef.current = stop;
                const transcription = await promise;
                
                if (transcription && jobId === activeJobRef.current) {
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
    }, [transcriptionContext, onError, onTranscriptionUpdate, isProcessing, language, isRealtimeTranscribing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTranscription();
            stopRealtimeTranscription();
        };
    }, [stopTranscription, stopRealtimeTranscription]);

    return {
        isProcessing: isProcessing || !!activeJobRef.current || transcriptionContext.isBusy,
        isModelLoading: transcriptionContext.isModelLoading,
        transcribe,
        transcribeLive,
        startRealtimeTranscription,
        stopRealtimeTranscription,
        isRealtimeTranscribing,
        initialize
    };
} 