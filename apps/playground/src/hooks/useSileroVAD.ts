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

            // Processing parameters (matching Python implementation)
            const params = {
                threshold: 0.46,
                windowSize: 512, // Samples per inference (32ms at 16kHz)
            };

            // Reshape audio data to match model's expected input shape
            const windowSize = 512; // 32ms at 16kHz
            const numWindows = Math.floor(audioData.length / windowSize);
            const reshapedAudio = audioData.slice(0, numWindows * windowSize);

            // Process audio in windows and flatten to 2D
            const processedAudio = new Float32Array(numWindows * windowSize);
            for (let i = 0; i < numWindows; i++) {
                const window = reshapedAudio.slice(i * windowSize, (i + 1) * windowSize);
                processedAudio.set(window, i * windowSize);
            }

            // Prepare model inputs with correct tensor shapes
            const inputs = {
                // Shape the input as [batch_size, sequence_length]
                'input': createTensor('float32', processedAudio, [1, processedAudio.length]),
                'sr': createTensor('int64', new BigInt64Array([16000n]), [1]),
                'state': createTensor('float32', new Float32Array(2 * 1 * 128).fill(0), [2, 1, 128])
            };

            logger.debug('Created input tensors', {
                inputTensorShape: inputs.input.dims,
                srTensorShape: inputs.sr.dims,
                stateTensorShape: inputs.state.dims,
                numWindows,
                windowSize,
                audioLength: processedAudio.length
            });

            const results = await model.run(inputs);
            const probabilities = Array.from(results['output'].data as Float32Array);
            
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

            // Find continuous speech segments
            let inSpeech = false;
            let currentSegment: Partial<SpeechTimestamp> | null = null;
            const timestamps: SpeechTimestamp[] = [];

            probabilities.forEach((probability, index) => {
                const isSpeech = probability > params.threshold;
                const timeInSeconds = index / sampleRate;

                if (isSpeech && !inSpeech) {
                    inSpeech = true;
                    currentSegment = {
                        start: index,
                        startTime: Math.max(0, timeInSeconds - speechPadding),
                        probability
                    };
                } else if (!isSpeech && inSpeech && currentSegment) {
                    inSpeech = false;
                    const duration = timeInSeconds - (currentSegment.startTime || 0);
                    
                    if (duration >= minSpeechDuration) {
                        timestamps.push({
                            ...currentSegment as SpeechTimestamp,
                            end: index,
                            endTime: timeInSeconds + speechPadding
                        });
                    }
                    currentSegment = null;
                }
            });

            logger.debug('Speech segments found', {
                segmentsCount: timestamps.length,
                segments: timestamps
            });

            setSpeechTimestamps(timestamps);
            setCurrentSegment(timestamps[timestamps.length - 1] || null);

            return {
                probability: probabilities[probabilities.length - 1],
                isSpeech: probabilities[probabilities.length - 1] > 0.46,
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
    }, [initModel, createTensor, onError, speechPadding, minSpeechDuration]);

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