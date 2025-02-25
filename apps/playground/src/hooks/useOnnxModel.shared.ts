// apps/playground/src/hooks/useOnnxModel.shared.ts
import { useCallback, useState } from 'react';
import { baseLogger } from '../config';
import type { InferenceSession, Tensor } from 'onnxruntime-react-native';

const logger = baseLogger.extend('useOnnxModel');

export interface UseOnnxModelProps {
    modelUri: string;
    onError?: (error: Error) => void;
}

export interface PlatformImplementation {
    createModel: (modelUri: string) => Promise<InferenceSession>;
    Tensor: { new(type: string, data: Float32Array | BigInt64Array, dims: number[]): Tensor };
}

export function createOnnxModelHook(platform: PlatformImplementation) {
    const modelCache = new Map<string, InferenceSession>();

    return function useOnnxModel({ modelUri, onError }: UseOnnxModelProps) {
        const [isLoading, setIsLoading] = useState(false);

        const initModel = useCallback(async () => {
            if (modelCache.has(modelUri)) {
                return modelCache.get(modelUri)!;
            }

            try {
                setIsLoading(true);
                logger.info('Loading ONNX model', { modelUri });
                const model = await platform.createModel(modelUri);
                modelCache.set(modelUri, model);
                logger.info('ONNX model loaded successfully');
                return model;
            } catch (error) {
                const msg = 'Failed to initialize ONNX model';
                logger.error(msg, { error, modelUri });
                onError?.(error instanceof Error ? error : new Error(msg));
                throw error;
            } finally {
                setIsLoading(false);
            }
        }, [modelUri, onError]);

        return {
            isLoading,
            initModel,
            createTensor: (type: string, data: Float32Array | BigInt64Array, dims: number[]) => 
                new platform.Tensor(type, data, dims)
        };
    };
}

export type UseOnnxModel = ReturnType<ReturnType<typeof createOnnxModelHook>>; 