import * as ort from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { useState, useCallback } from 'react';
import { baseLogger } from '../config';

const logger = baseLogger.extend('useSileroVAD');

// Global model instance
let vadModel: ort.InferenceSession | null = null;

interface UseSileroVADProps {
    onError?: (error: Error) => void;
}

interface VADResult {
    probability: number;
    isSpeech: boolean;
}

export function useSileroVAD({ onError }: UseSileroVADProps) {
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const initModel = useCallback(async () => {
        if (vadModel) return;

        try {
            setIsModelLoading(true);
            logger.info('Loading VAD model from assets');
            
            const modelAsset = await Asset.loadAsync(require('@assets/silero_vad.onnx'));
            if (!modelAsset[0]?.localUri) {
                throw new Error('Model asset missing localUri');
            }

            vadModel = await ort.InferenceSession.create(modelAsset[0].localUri);
            logger.info('VAD model loaded successfully');
        } catch (error) {
            const msg = 'Failed to initialize VAD model';
            logger.error(msg, { error });
            onError?.(error instanceof Error ? error : new Error(msg));
        } finally {
            setIsModelLoading(false);
        }
    }, [onError]);

    const processAudioSegment = useCallback(async (
        audioData: Float32Array,
        sampleRate: number
    ): Promise<VADResult | null> => {
        if (!vadModel) {
            await initModel();
        }

        if (!vadModel) {
            throw new Error('VAD model not initialized');
        }

        try {
            setIsProcessing(true);

            // Ensure audio is in correct format (16kHz)
            if (sampleRate !== 16000) {
                throw new Error(`Invalid sample rate: ${sampleRate}Hz. Must be 16kHz`);
            }

            // Process first 512 samples for VAD
            const windowSize = 512;
            const samples = audioData.slice(0, windowSize);

            // Pad with zeros if needed
            if (samples.length < windowSize) {
                const paddedSamples = new Float32Array(windowSize);
                paddedSamples.set(samples);
                samples.fill(0, samples.length);
            }

            const inputs = {
                'input': new ort.Tensor('float32', samples, [1, windowSize]),
                'sr': new ort.Tensor('int64', new BigInt64Array([16000n]), [1]),
                'state': new ort.Tensor('float32', new Float32Array(256).fill(0), [2, 1, 128])
            };

            logger.info('Running VAD inference');
            const results = await vadModel.run(inputs);
            const probability = results['output'].data[0] as number;

            logger.info('VAD inference complete', { probability });

            return {
                probability,
                isSpeech: probability > 0.46 // Default threshold from Silero
            };
        } catch (error) {
            const msg = 'Failed to process audio segment';
            logger.error(msg, { error });
            onError?.(error instanceof Error ? error : new Error(msg));
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, [initModel, onError]);

    return {
        isModelLoading,
        isProcessing,
        processAudioSegment,
        initModel
    };
} 