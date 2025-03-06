// src/index.ts

import {
    extractRawWavAnalysis,
    extractAudioAnalysis,
} from './AudioAnalysis/extractAudioAnalysis'
import { 
    extractAudioData,
    sendPCMToEssentia
} from './AudioAnalysis/extractAudioData'
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

export {
    AudioRecorderProvider,
    ExpoAudioStreamModule,
    extractRawWavAnalysis,
    extractAudioAnalysis,
    extractPreview,
    trimAudio,
    extractAudioData,
    sendPCMToEssentia,
    extractMelSpectrogram,
    useAudioRecorder,
    useSharedAudioRecorder,
}

export type * from './AudioAnalysis/AudioAnalysis.types'
export type * from './ExpoAudioStream.types'
