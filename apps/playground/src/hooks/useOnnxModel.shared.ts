// apps/playground/src/hooks/useOnnxModel.shared.ts
import { useCallback, useState } from 'react'

import { baseLogger } from '../config'

const logger = baseLogger.extend('useOnnxModel')

// Minimal interfaces covering what callers actually use — avoids coupling to onnxruntime-common
export interface OnnxModelTensor {
    readonly type: string;
    readonly data: Float32Array | BigInt64Array | Int32Array;
    readonly dims: readonly number[];
    readonly size: number;
}

export interface OnnxModelSession {
    readonly inputNames: readonly string[];
    readonly outputNames: readonly string[];
    run(feeds: Record<string, OnnxModelTensor>): Promise<Record<string, OnnxModelTensor>>;
    release?(): Promise<void>;
    dispose?(): Promise<void>;
}

export interface UseOnnxModelProps {
    modelUri: string;
    onError?: (error: Error) => void;
}

export interface PlatformImplementation {
    createModel: (modelUri: string) => Promise<OnnxModelSession>;
    Tensor: { new(type: string, data: Float32Array | BigInt64Array, dims: number[]): OnnxModelTensor };
}

export function createOnnxModelHook(platform: PlatformImplementation) {
    const modelCache = new Map<string, OnnxModelSession>()

    return function useOnnxModel({ modelUri, onError }: UseOnnxModelProps) {
        const [isLoading, setIsLoading] = useState(false)

        const initModel = useCallback(async (): Promise<OnnxModelSession> => {
            if (modelCache.has(modelUri)) {
                return modelCache.get(modelUri)!
            }

            try {
                setIsLoading(true)
                logger.info('Loading ONNX model', { modelUri })
                const model = await platform.createModel(modelUri)
                modelCache.set(modelUri, model)
                logger.info('ONNX model loaded successfully')
                return model
            } catch (error) {
                const msg = 'Failed to initialize ONNX model'
                logger.error(msg, { error, modelUri })
                onError?.(error instanceof Error ? error : new Error(msg))
                throw error
            } finally {
                setIsLoading(false)
            }
        }, [modelUri, onError])

        return {
            isLoading,
            initModel,
            createTensor: (type: string, data: Float32Array | BigInt64Array, dims: number[]) => 
                new platform.Tensor(type, data, dims),
        }
    }
}

export type UseOnnxModel = ReturnType<ReturnType<typeof createOnnxModelHook>>; 