// apps/playground/src/hooks/useOnnxModel.native.ts
import { OnnxInference, typedArrayToBase64, base64ToTypedArray } from '@siteed/sherpa-onnx.rn'
import type { OnnxTensorData } from '@siteed/sherpa-onnx.rn'

import { createOnnxModelHook } from './useOnnxModel.shared'
import type { PlatformImplementation } from './useOnnxModel.shared'

// Lightweight Tensor wrapper compatible with onnxruntime-common's Tensor interface
class NativeTensor {
    readonly type: string
    readonly data: Float32Array | BigInt64Array | Int32Array
    readonly dims: readonly number[]
    readonly size: number

    constructor(type: string, data: Float32Array | BigInt64Array | Int32Array, dims: number[]) {
        this.type = type
        this.data = data
        this.dims = dims
        this.size = data.length
    }

    toOnnxTensorData(): OnnxTensorData {
        const typeMap: Record<string, OnnxTensorData['type']> = {
            float32: 'float32',
            int64: 'int64',
            int32: 'int32',
        }
        return {
            type: (typeMap[this.type] ?? 'uint8') as OnnxTensorData['type'],
            dims: [...this.dims],
            data: typedArrayToBase64(this.data),
        }
    }
}

const nativeImplementation: PlatformImplementation = {
    async createModel(modelUri: string) {
        let modelPath: string
        if (typeof modelUri === 'number') {
            const { Asset } = await import('expo-asset')
            const [asset] = await Asset.loadAsync(modelUri)
            const localUri = asset.localUri!
            modelPath = localUri.startsWith('file://') ? localUri.substring(7) : localUri
        } else {
            modelPath = modelUri.startsWith('file://') ? modelUri.substring(7) : modelUri
        }

        const session = await OnnxInference.createSession({ modelPath })

        // Return an InferenceSession-compatible wrapper using OnnxSession
        const wrapper = {
            get inputNames() { return session.inputNames },
            get outputNames() { return session.outputNames },
            async run(feeds: Record<string, NativeTensor>) {
                // Convert NativeTensor feeds to OnnxTensorData
                const inputs: Record<string, OnnxTensorData> = {}
                for (const [name, tensor] of Object.entries(feeds)) {
                    inputs[name] = tensor.toOnnxTensorData()
                }

                const result = await OnnxInference.run(session.sessionId, inputs)
                if (!result.success || !result.outputs) {
                    throw new Error(result.error || 'ONNX inference failed')
                }

                // Convert outputs back to NativeTensor
                const outputs: Record<string, NativeTensor> = {}
                for (const [name, tensorData] of Object.entries(result.outputs)) {
                    const typed = base64ToTypedArray(tensorData.data, tensorData.type)
                    let data: Float32Array | BigInt64Array
                    if (tensorData.type === 'float32') {
                        data = typed as Float32Array
                    } else if (tensorData.type === 'int64') {
                        data = typed as BigInt64Array
                    } else if (tensorData.type === 'int32') {
                        data = new Float32Array(typed as Int32Array)
                    } else {
                        data = new Float32Array(typed as Uint8Array)
                    }
                    outputs[name] = new NativeTensor(tensorData.type, data, tensorData.dims)
                }
                return outputs
            },
            async release() {
                await OnnxInference.releaseSession(session.sessionId)
            },
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return wrapper as any
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tensor: NativeTensor as any,
}

export const useOnnxModel = createOnnxModelHook(nativeImplementation)
