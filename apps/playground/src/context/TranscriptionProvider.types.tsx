import { Chunk, TranscriberData } from '@siteed/expo-audio-stream'
import { ReactNode } from 'react'
import { TranscribeFileOptions, TranscribeNewSegmentsResult } from 'whisper.rn'

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
}

export type TranscriptionAction =
    | { type: 'UPDATE_STATE'; payload: Partial<TranscriptionState> }
    | { type: 'UPDATE_PROGRESS_ITEM'; progressItem: ProgressItem }
    | { type: 'REMOVE_PROGRESS_ITEM'; payload: string }
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
 * Either base64 encoded string or Float32Array
 */
export type AudioInputData = string | Float32Array

export interface TranscribeParams {
    audioData: AudioInputData | undefined
    position?: number
    jobId?: string
    options: Partial<TranscribeFileOptions>
    onProgress?: (progress: number) => void
    onNewSegments?: (result: TranscribeNewSegmentsResult) => void
}

export interface TranscribeResult {
    promise: Promise<TranscriberData>
    stop: () => Promise<void>
    jobId: string
}

export interface TranscriptionContextProps extends TranscriptionState {
    initialize: () => void
    transcribe: (_: TranscribeParams) => Promise<TranscribeResult>
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

