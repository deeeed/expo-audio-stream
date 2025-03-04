// packages/expo-audio-stream/src/constants.ts
import { Platform } from 'react-native'

import { BitDepth, SampleRate } from './ExpoAudioStream.types'

export const isWeb = Platform.OS === 'web'
export const DEBUG_NAMESPACE = 'expo-audio-stream'

// Constants for identifying chunks in a WAV file
export const RIFF_HEADER = 0x52494646 // "RIFF"
export const WAVE_HEADER = 0x57415645 // "WAVE"
export const FMT_CHUNK_ID = 0x666d7420 // "fmt "
export const DATA_CHUNK_ID = 0x64617461 // "data"
export const INFO_CHUNK_ID = 0x494e464f // "INFO"

// Default values
export const DEFAULT_SAMPLE_RATE: SampleRate = 16000
export const DEFAULT_BIT_DEPTH: BitDepth = 32
