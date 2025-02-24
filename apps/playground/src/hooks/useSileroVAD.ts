import { useCallback, useState } from 'react';
import { baseLogger } from '../config';
import { useOnnxModel } from './useOnnxModel';

const logger = baseLogger.extend('useSileroVAD');

export interface UseSileroVADProps {
    onError?: (error: Error) => void;
    minSpeechDuration?: number; // in seconds
    maxSpeechDuration?: number; // in seconds
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
    maxSpeechDuration = Infinity,
    minSilenceDuration = 0.1,
    speechPadding = 0.03 // Adjusted to match Silero's 30ms default
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

            // Validate and adjust sample rate
            if (![8000, 16000].includes(sampleRate)) {
                throw new Error(`Invalid sample rate: ${sampleRate}Hz. Must be 8kHz or 16kHz`);
            }

            const params = {
                threshold: 0.5, // Silero default
                negThreshold: 0.35, // threshold - 0.15, per Silero
                windowSize: sampleRate === 16000 ? 512 : 256,
                contextSize: sampleRate === 16000 ? 64 : 32,
                minSpeechSamples: Math.floor(sampleRate * minSpeechDuration),
                maxSpeechSamples: Math.floor(sampleRate * maxSpeechDuration),
                minSilenceSamples: Math.floor(sampleRate * minSilenceDuration),
                speechPadSamples: Math.floor(sampleRate * speechPadding)
            };

            // Split audio into windows
            const numWindows = Math.floor(audioData.length / params.windowSize);
            const reshapedAudio = audioData.slice(0, numWindows * params.windowSize);

            // Initialize state and context
            let state = new Float32Array(2 * 1 * 128).fill(0);
            let context = new Float32Array(params.contextSize).fill(0);
            const probabilities: number[] = [];

            // Process each window sequentially with context
            for (let i = 0; i < numWindows; i++) {
                const windowStart = i * params.windowSize;
                const window = reshapedAudio.slice(windowStart, windowStart + params.windowSize);

                // Concatenate context and current window
                const inputAudio = new Float32Array(params.contextSize + params.windowSize);
                inputAudio.set(context);
                inputAudio.set(window, params.contextSize);

                const inputs = {
                    'input': createTensor('float32', inputAudio, [1, inputAudio.length]),
                    'sr': createTensor('int64', new BigInt64Array([BigInt(sampleRate)]), [1]),
                    'state': createTensor('float32', state, [2, 1, 128])
                };

                const results = await model.run(inputs);
                probabilities.push((results['output'].data as Float32Array)[0]);

                // Update state and context
                if (results['state']) {
                    state = new Float32Array(results['state'].data as Float32Array);
                }
                context = window.slice(-params.contextSize);
            }

            // Consider speech present if any probability exceeds threshold
            const maxProbability = Math.max(...probabilities);
            const isSpeech = maxProbability > params.threshold;

            // Enhanced probability logging
            logger.debug('VAD probabilities analysis', {
                totalProbabilities: probabilities.length,
                firstProb: probabilities[0],
                lastProb: probabilities[probabilities.length - 1],
                maxProb: Math.max(...probabilities),
                minProb: Math.min(...probabilities),
                avgProb: probabilities.reduce((a, b) => a + b, 0) / probabilities.length,
                threshold: params.threshold,
                probsAboveThreshold: probabilities.filter(p => p > params.threshold).length
            });

            logger.debug('Speech segments found', {
                segmentsCount: probabilities.length,
                segments: probabilities
            });

            setSpeechTimestamps(probabilities.map((probability, index) => ({
                start: index * params.windowSize,
                end: (index + 1) * params.windowSize,
                startTime: index * params.windowSize / sampleRate,
                endTime: (index + 1) * params.windowSize / sampleRate,
                probability
            })));
            setCurrentSegment(probabilities.length > 0 ? {
                start: 0,
                end: audioData.length,
                startTime: 0,
                endTime: audioData.length / sampleRate,
                probability: maxProbability
            } : null);

            return {
                probability: maxProbability,
                isSpeech,
                timestamp
            };
        } catch (error) {
            logger.error('VAD processing error', {
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : error,
                audioLength: audioData?.length,
                sampleRate,
                processingStage: isProcessing ? 'during-processing' : 'pre-processing'
            });
            onError?.(error instanceof Error ? error : new Error('Failed to process audio segment'));
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [initModel, createTensor, onError, minSpeechDuration, maxSpeechDuration, minSilenceDuration, speechPadding]);

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