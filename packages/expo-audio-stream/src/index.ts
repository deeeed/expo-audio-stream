// src/index.ts

import { extractAudioAnalysis } from './AudioAnalysis/extractAudioAnalysis'
import {
    AudioRecorderProvider,
    useSharedAudioRecorder,
} from './AudioRecorder.provider'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'
import { useAudioRecorder } from './useAudioRecorder'

export * from './utils/convertPCMToFloat32'
export * from './utils/getWavFileInfo'
export * from './utils/writeWavHeader'

export {
    AudioRecorderProvider,
    ExpoAudioStreamModule,
    extractAudioAnalysis,
    useAudioRecorder,
    useSharedAudioRecorder,
}

export type * from './AudioAnalysis/AudioAnalysis.types'
export type * from './ExpoAudioStream.types'
