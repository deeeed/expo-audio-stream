import { useCallback, useState } from 'react';
import { baseLogger } from '../config';
import { useOnnxModel } from './useOnnxModel';

const logger = baseLogger.extend('useSileroVAD');

export interface UseSileroVADProps {
    onError?: (error: Error) => void;
    minSpeechDuration?: number; // in seconds
    minSilenceDuration?: number; // in seconds
    speechPadding?: number; // in seconds
}

export interface VADResult {
    probability: number;
    isSpeech: boolean;
    timestamp: number;
}

export interface SpeechTimestamp {
    start: number;      // start sample index
    end: number;        // end sample index
    startTime: number;  // start time in seconds
    endTime: number;    // end time in seconds
    probability: number;
}

export function useSileroVAD({ 
    onError,
    minSpeechDuration = 0.25,
    minSilenceDuration = 0.1,
    speechPadding = 0.2
}: UseSileroVADProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [speechTimestamps, setSpeechTimestamps] = useState<SpeechTimestamp[]>([]);
    const [currentSegment, setCurrentSegment] = useState<SpeechTimestamp | null>(null);
    
    const { isLoading: isModelLoading, initModel, createTensor } = useOnnxModel({
        modelUri: require('@assets/silero_vad.onnx'),
        onError
    });

    const processAudioSegment = useCallback(async (
        audioData: Float32Array,
        sampleRate: number,
        timestamp: number = Date.now()
    ): Promise<VADResult | null> => {
        try {
            setIsProcessing(true);
            const model = await initModel();

            if (sampleRate !== 16000) {
                throw new Error(`Invalid sample rate: ${sampleRate}Hz. Must be 16kHz`);
            }

            // Calculate durations correctly
            const durationSeconds = audioData.length / sampleRate;
            const durationMs = durationSeconds * 1000;
            
            logger.debug('Processing audio segment', {
                totalSamples: audioData.length,
                sampleRate,
                durationMs: `${durationMs.toFixed(2)}ms`,
                durationSec: `${durationSeconds.toFixed(2)}s`,
                samplesPerSecond: audioData.length / durationSeconds,
                timestamp: new Date(timestamp).toISOString()
            });

            const inputs = {
                'input': createTensor('float32', audioData, [1, audioData.length]),
                'sr': createTensor('int64', new BigInt64Array([16000n]), [1]),
                'state': createTensor('float32', new Float32Array(256).fill(0), [2, 1, 128])
            };

            const results = await model.run(inputs);
            const probability = results['output'].data[0] as number;
            const isSpeech = probability > 0.46;

            logger.debug('VAD result', {
                probability: probability.toFixed(3),
                isSpeech,
                threshold: 0.46
            });

            return {
                probability,
                isSpeech,
                timestamp
            };
        } catch (error) {
            const msg = 'Failed to process audio segment';
            logger.error(msg, { 
                error,
                audioLength: audioData?.length,
                sampleRate,
                timestamp: new Date(timestamp).toISOString()
            });
            onError?.(error instanceof Error ? error : new Error(msg));
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [initModel, createTensor, onError]);

    const reset = useCallback(() => {
        setSpeechTimestamps([]);
        setCurrentSegment(null);
    }, []);

    return {
        isModelLoading,
        isProcessing,
        processAudioSegment,
        speechTimestamps,
        currentSegment,
        reset,
        initModel
    };
}