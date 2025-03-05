// apps/playground/src/hooks/useOnnxModel.web.ts
import { createOnnxModelHook } from './useOnnxModel.shared';

const webImplementation = {
    async createModel(modelUri: string) {
        if (!window.ort) {
            throw new Error('ONNX Runtime not initialized');
        }
        return await window.ort.InferenceSession.create(modelUri);
    },
    Tensor: window.ort?.Tensor
};

export const useOnnxModel = createOnnxModelHook(webImplementation); 