import { getLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { mobileTabletCheck } from './utils/utils'
import { WHISPER_MODELS, WEB_WHISPER_MODELS } from './hooks/useWhisperModels'

const baseUrl =
    Constants.expoConfig?.experiments?.baseUrl?.replace(/\/$/, '') ?? ''

const isMobileOrTablet = mobileTabletCheck()
export const WhisperSampleRate = 16000

// Helper function to get model capabilities
const getModelCapabilities = (modelId: string, isWeb: boolean) => {
    const models = isWeb ? WEB_WHISPER_MODELS : WHISPER_MODELS
    const model = models.find(m => m.id === modelId)
    return model?.capabilities || {
        multilingual: false,
        quantizable: false,
    }
}

// Web-specific model configuration
const defaultWebModel = WEB_WHISPER_MODELS[0].id
const webModelCapabilities = getModelCapabilities(defaultWebModel, true)

const webConfig = {
    DEFAULT_MODEL: defaultWebModel,
    DEFAULT_QUANTIZED: isMobileOrTablet && webModelCapabilities.quantizable,
    DEFAULT_MULTILINGUAL: webModelCapabilities.multilingual,
    MODELS: WEB_WHISPER_MODELS,
}

// Native-specific model configuration
const defaultNativeModel = WHISPER_MODELS[0].id
const nativeModelCapabilities = getModelCapabilities(defaultNativeModel, false)

const nativeConfig = {
    DEFAULT_MODEL: defaultNativeModel,
    DEFAULT_QUANTIZED: nativeModelCapabilities.quantizable,
    DEFAULT_MULTILINGUAL: nativeModelCapabilities.multilingual,
    MODELS: WHISPER_MODELS,
}

export const config = {
    baseUrl,
    audioWorkletUrl: `${baseUrl}/audioworklet.js`,
    featuresExtratorUrl: `${baseUrl}/audio-features-extractor.js`,
    whisperWorkerUrl: `${baseUrl}/whisperWorker.js`,
    DEFAULT_MODEL: Platform.OS === 'web' ? webConfig.DEFAULT_MODEL : nativeConfig.DEFAULT_MODEL,
    DEFAULT_SUBTASK: 'transcribe',
    DEFAULT_LANGUAGE: 'english',
    DEFAULT_QUANTIZED: Platform.OS === 'web' ? webConfig.DEFAULT_QUANTIZED : nativeConfig.DEFAULT_QUANTIZED,
    DEFAULT_MULTILINGUAL: Platform.OS === 'web' ? webConfig.DEFAULT_MULTILINGUAL : nativeConfig.DEFAULT_MULTILINGUAL,
    WHISPER_MODELS: Platform.OS === 'web' ? webConfig.MODELS : nativeConfig.MODELS,
    getModelCapabilities: (modelId: string) => getModelCapabilities(modelId, Platform.OS === 'web'),
}

export const baseLogger = getLogger('audio-playground')
