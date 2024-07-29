// TranscriptionProvider.reducer.ts
import {
    TranscriptionState,
    TranscriptionAction,
} from './TranscriptionProvider.types'

export const initialState: TranscriptionState = {
    transcript: undefined,
    isBusy: false,
    isModelLoading: false,
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
        case 'UPDATE_STATE':
            return { ...state, ...action.payload }
        case 'UPDATE_PROGRESS_ITEM':
            return {
                ...state,
                progressItems: state.progressItems.map((item) =>
                    item.file === action.progressItem.file
                        ? action.progressItem
                        : item
                ),
            }
        default:
            return state
    }
}
