// TranscriptionProvider.reducer.ts
import {
    TranscriptionAction,
    TranscriptionState,
} from './TranscriptionProvider.types'

export const initialState: TranscriptionState = {
    transcript: undefined,
    isBusy: false,
    isModelLoading: false,
    ready: false,
    progressItems: [],
    model: '',
    subtask: '',
    quantized: false,
    multilingual: false,
    language: 'auto',
}

export function transcriptionReducer(
    state: TranscriptionState,
    action: TranscriptionAction
): TranscriptionState {
    switch (action.type) {
        case 'UPDATE_STATE': {
            return { ...state, ...action.payload }
        }
        case 'UPDATE_PROGRESS_ITEM': {
            const updatedProgressItems = [...state.progressItems]
            const existingItemIndex = updatedProgressItems.findIndex(
                (item) => item.file === action.progressItem.file
            )

            if (existingItemIndex !== -1) {
                updatedProgressItems[existingItemIndex] = {
                    ...updatedProgressItems[existingItemIndex],
                    ...action.progressItem,
                }
            } else {
                updatedProgressItems.push(action.progressItem)
            }

            return {
                ...state,
                progressItems: updatedProgressItems,
            }
        }
        case 'TRANSCRIPTION_START': {
            return {
                ...state,
                transcript: undefined,
                isBusy: true,
            }
        }
        default:
            return state
    }
}
