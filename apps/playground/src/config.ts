import { getLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'

import { mobileTabletCheck } from './utils/utils'

const baseUrl =
    Constants.expoConfig?.experiments?.baseUrl?.replace(/\/$/, '') ?? ''

const isMobileOrTablet = mobileTabletCheck()
export const WhisperSampleRate = 16000

export const config = {
    baseUrl,
    audioWorkletUrl: `${baseUrl}/audioworklet.js`,
    featuresExtratorUrl: `${baseUrl}/audio-features-extractor.js`,
    whisperWorkerUrl: `${baseUrl}/whisperWorker.js`,
    DEFAULT_MODEL: 'Xenova/whisper-tiny',
    // DEFAULT_MODEL: 'Xenova/whisper-medium',
    DEFAULT_SUBTASK: 'transcribe',
    DEFAULT_LANGUAGE: 'english',
    DEFAULT_QUANTIZED: isMobileOrTablet,
    DEFAULT_MULTILINGUAL: false,
}

export const baseLogger = getLogger('audio-playground')
