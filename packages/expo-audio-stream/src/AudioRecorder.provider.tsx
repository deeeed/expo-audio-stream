// packages/expo-audio-stream/src/AudioRecorder.provider.tsx
import React, { createContext, useContext } from 'react'

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import {
    AudioRecording,
    RecordingConfig,
    StartRecordingResult,
} from './ExpoAudioStream.types'
import { UseAudioRecorderProps, useAudioRecorder } from './useAudioRecorder'

export interface UseAudioRecorderState {
    startRecording: (_: RecordingConfig) => Promise<StartRecordingResult>
    stopRecording: () => Promise<AudioRecording | null>
    pauseRecording: () => void
    resumeRecording: () => void
    isRecording: boolean
    isPaused: boolean
    durationMs: number // Duration of the recording
    size: number // Size in bytes of the recorded audio
    analysisData?: AudioAnalysis // Analysis data for the recording depending on enableProcessing flag
}

const initContext: UseAudioRecorderState = {
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    size: 0,
    startRecording: async () => {
        throw new Error('AudioRecorderProvider not found')
    },
    stopRecording: async () => {
        throw new Error('AudioRecorderProvider not found')
    },
    pauseRecording: () => {
        throw new Error('AudioRecorderProvider not found')
    },
    resumeRecording: () => {
        throw new Error('AudioRecorderProvider not found')
    },
}

const AudioRecorderContext = createContext<UseAudioRecorderState>(initContext)

interface AudioRecorderProviderProps {
    children: React.ReactNode
    config?: UseAudioRecorderProps
}

export const AudioRecorderProvider: React.FC<AudioRecorderProviderProps> = ({
    children,
    config = {},
}) => {
    const audioRecorder = useAudioRecorder(config)
    return (
        <AudioRecorderContext.Provider value={audioRecorder}>
            {children}
        </AudioRecorderContext.Provider>
    )
}

export const useSharedAudioRecorder = () => {
    const context = useContext(AudioRecorderContext)
    if (!context) {
        throw new Error(
            'useSharedAudioRecorder must be used within an AudioRecorderProvider'
        )
    }
    return context
}
