import { useCallback, useState } from 'react';
import { baseLogger } from '../config';
import { useOnnxModel } from './useOnnxModel';

const logger = baseLogger.extend('useSileroVAD');

export interface UseSileroVADProps {
    onError?: (error: Error) => void;
}

export interface VADResult {
    probability: number;
    isSpeech: boolean;
}

export function useSileroVAD({ onError }: UseSileroVADProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { isLoading: isModelLoading, initModel, createTensor } = useOnnxModel({
        modelUri: require('@assets/silero_vad.onnx'),
        onError
    });

    const processAudioSegment = useCallback(async (
        audioData: Float32Array,
        sampleRate: number
    ): Promise<VADResult | null> => {
        try {
            setIsProcessing(true);
            const model = await initModel();

            if (sampleRate !== 16000) {
                throw new Error(`Invalid sample rate: ${sampleRate}Hz. Must be 16kHz`);
            }

            const windowSize = 512;
            const samples = audioData.slice(0, windowSize);

            if (samples.length < windowSize) {
                const paddedSamples = new Float32Array(windowSize);
                paddedSamples.set(samples);
                samples.fill(0, samples.length);
            }

            const inputs = {
                'input': createTensor('float32', samples, [1, windowSize]),
                'sr': createTensor('int64', new BigInt64Array([16000n]), [1]),
                'state': createTensor('float32', new Float32Array(256).fill(0), [2, 1, 128])
            };

            logger.info('Running VAD inference');
            const results = await model.run(inputs);
            const probability = results['output'].data[0] as number;

            logger.info('VAD inference complete', { probability });

            return {
                probability,
                isSpeech: probability > 0.46
            };
        } catch (error) {
            const msg = 'Failed to process audio segment';
            logger.error(msg, { error });
            onError?.(error instanceof Error ? error : new Error(msg));
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [initModel, createTensor, onError]);

    return {
        isModelLoading,
        isProcessing,
        processAudioSegment,
        initModel
    };
}