import * as ort from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { createOnnxModelHook } from './useOnnxModel.shared';

const nativeImplementation = {
    async createModel(modelUri: string) {
        const modelAsset = await Asset.loadAsync(modelUri);
        if (!modelAsset[0]?.localUri) {
            throw new Error('Model asset missing localUri');
        }
        return await ort.InferenceSession.create(modelAsset[0].localUri);
    },
    Tensor: ort.Tensor
};

export const useOnnxModel = createOnnxModelHook(nativeImplementation); 