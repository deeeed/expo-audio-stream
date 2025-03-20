import { Chunk, TranscriberData } from '@siteed/expo-audio-studio'
import { ReactNode } from 'react'
import { 
  TranscribeFileOptions, 
  TranscribeNewSegmentsResult, 
  TranscribeResult as _WhisperTranscribeResult,
  TranscribeRealtimeOptions,
} from 'whisper.rn'

export interface ProgressItem {
    file: string
    loaded: number
    progress: number
    total: number
    name: string
    status: string
}

export interface TranscriptionState {
    transcript?: TranscriberData // last received transcript
    isBusy: boolean
    isModelLoading: boolean
    progressItems: ProgressItem[]
    model: string
    subtask: string
    quantized: boolean
    multilingual: boolean
    language?: string
    ready: boolean
    tdrz?: boolean // Add TDRZ option for native
}

export type TranscriptionAction =
    | { type: 'UPDATE_STATE'; payload: Partial<TranscriptionState> }
    | { type: 'UPDATE_PROGRESS_ITEM'; progressItem: ProgressItem }
    | { type: 'REMOVE_PROGRESS_ITEM'; payload: string }
    | { type: 'TRANSCRIPTION_ABORT'; jobId: string }
    | { type: 'TRANSCRIPTION_START' }

export interface TranscriberUpdateData {
    type: 'update'
    jobId: string
    data: [string, { chunks: Chunk[] }]
    startTime: number
    endTime: number
}

export interface TranscriberCompleteData {
    type: 'complete'
    jobId: string
    data: {
        text: string
        chunks: Chunk[]
        startTime: number
        endTime: number
    }
}

/**
 * Either base64 encoded string or ArrayBuffer or Float32Array or Uint8Array (PCM data)
 */
export type AudioInputData = string | ArrayBuffer | Float32Array | Uint8Array

// Base interface with common properties
interface BaseTranscribeParams {
    position?: number
    jobId?: string
    options?: Partial<TranscribeFileOptions>
    onProgress?: (progress: number) => void
    onNewSegments?: (result: TranscribeNewSegmentsResult) => void
}

// Interface for using audioData
interface AudioDataParams extends BaseTranscribeParams {
    audioData: AudioInputData
    audioUri?: never // Cannot be used with audioData
}

// Interface for using audioUri
interface AudioUriParams extends BaseTranscribeParams {
    audioData?: never // Cannot be used with audioUri
    audioUri: string
}

// Union type that requires either audioData or audioUri, but not both
export type TranscribeParams = AudioDataParams | AudioUriParams

// Modified TranscribeResult to match what we're returning
export interface TranscribeResult {
    promise: Promise<TranscriberData>
    stop: () => Promise<void>
    jobId: string
}

// Interface for realtime transcription parameters
export interface RealtimeTranscribeParams {
    jobId: string
    options?: Partial<TranscribeRealtimeOptions>
    onTranscriptionUpdate: (data: TranscriberData) => void
}

// Interface for realtime transcription result
export interface RealtimeTranscribeResult {
    stop: () => Promise<void>
}

// Update the TranscriptionContextProps
export interface TranscriptionContextProps extends TranscriptionState {
    initialize: () => Promise<void>
    transcribe: (_: TranscribeParams) => Promise<TranscribeResult>
    transcribeRealtime: (_: RealtimeTranscribeParams) => Promise<RealtimeTranscribeResult>
    updateConfig: (
        config: Partial<TranscriptionState>,
        shouldInitialize?: boolean
    ) => Promise<void>
    resetWhisperContext: () => void
}

export interface TranscriptionProviderProps {
    children: ReactNode
    initialModel?: string
    initialQuantized?: boolean
    initialMultilingual?: boolean
    initialLanguage?: string
}

