import { getLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

import { mobileTabletCheck } from './utils/utils'
import { WHISPER_MODELS, WEB_WHISPER_MODELS } from './hooks/useWhisperModels'

const baseUrl =
    Constants.expoConfig?.experiments?.baseUrl?.replace(/\/$/, '') ?? ''

const isMobileOrTablet = mobileTabletCheck()
export const WhisperSampleRate = 16000

// Web-specific model configuration
const webConfig = {
    DEFAULT_MODEL: WEB_WHISPER_MODELS[0].id, // 'Xenova/whisper-tiny'
    DEFAULT_QUANTIZED: isMobileOrTablet,
    DEFAULT_MULTILINGUAL: false,
    MODELS: WEB_WHISPER_MODELS,
}

// Native-specific model configuration
const nativeConfig = {
    DEFAULT_MODEL: WHISPER_MODELS[0].id, // 'tiny' model
    DEFAULT_QUANTIZED: true,
    DEFAULT_MULTILINGUAL: false,
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
}

export const baseLogger = getLogger('audio-playground')
