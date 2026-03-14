// src/index.ts

import {
    extractRawWavAnalysis,
    extractAudioAnalysis,
} from './AudioAnalysis/extractAudioAnalysis'
import { extractAudioData } from './AudioAnalysis/extractAudioData'
import { extractMelSpectrogram } from './AudioAnalysis/extractMelSpectrogram'
import { extractPreview } from './AudioAnalysis/extractPreview'
import {
    AudioRecorderProvider,
    useSharedAudioRecorder,
} from './AudioRecorder.provider'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'
import { trimAudio } from './trimAudio'
import { useAudioRecorder } from './useAudioRecorder'

export * from './utils/convertPCMToFloat32'
export * from './utils/getWavFileInfo'
export * from './utils/writeWavHeader'

// Export platform capabilities
export {
    getPlatformCapabilities,
    isEncodingSupported,
    isBitDepthSupported,
    getFallbackEncoding,
    getFallbackBitDepth,
    validateRecordingConfig,
    type PlatformCapabilities,
} from './constants/platformLimitations'

// Export AudioDeviceManager
export { AudioDeviceManager, audioDeviceManager } from './AudioDeviceManager'

// Export useAudioDevices hook
export { useAudioDevices } from './hooks/useAudioDevices'

export {
    AudioRecorderProvider,
    ExpoAudioStreamModule,
    extractRawWavAnalysis,
    extractAudioAnalysis,
    extractPreview,
    trimAudio,
    extractAudioData,
    extractMelSpectrogram,
    useAudioRecorder,
    useSharedAudioRecorder,
}

// Export all types
export type * from './AudioAnalysis/AudioAnalysis.types'
export type * from './ExpoAudioStream.types'
