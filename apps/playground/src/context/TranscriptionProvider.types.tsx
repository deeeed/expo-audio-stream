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
    transcript?: TranscriberData
    isBusy: boolean
    isModelLoading: boolean
    progressItems: ProgressItem[]
    model: string
    subtask: string
    quantized: boolean
    multilingual: boolean
    language?: string
}

export type TranscriptionAction =
    | { type: 'UPDATE_STATE'; payload: Partial<TranscriptionState> }
    | { type: 'UPDATE_PROGRESS_ITEM'; progressItem: ProgressItem };

export interface TranscriberUpdateData {
    type: 'update'
    data: [string, { chunks: Chunk[] }]
    text: string
}

export interface TranscriberCompleteData {
    type: 'complete'
    data: {
        text: string
        chunks: Chunk[]
    }
}
