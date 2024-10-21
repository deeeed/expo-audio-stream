import { Chunk, TranscriberData } from '@siteed/expo-audio-stream'

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
