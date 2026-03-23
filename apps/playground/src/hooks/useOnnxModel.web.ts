// apps/playground/src/hooks/useOnnxModel.web.ts
import { createOnnxModelHook } from './useOnnxModel.shared'
import type { OnnxModelSession, PlatformImplementation } from './useOnnxModel.shared'

// onnxruntime-web's Tensor/InferenceSession are supersets of our minimal interfaces,
// but structurally incompatible due to extra methods (toImageData, reshape).
const webImplementation: PlatformImplementation = {
    async createModel(modelUri: string) {
        if (!window.ort) {
            throw new Error('ONNX Runtime not initialized')
        }
        return await window.ort.InferenceSession.create(modelUri) as unknown as OnnxModelSession
    },
    Tensor: window.ort?.Tensor as PlatformImplementation['Tensor'],
}

export const useOnnxModel = createOnnxModelHook(webImplementation)