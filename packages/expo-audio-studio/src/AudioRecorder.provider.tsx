// packages/expo-audio-stream/src/AudioRecorder.provider.tsx
import React, { createContext, useContext } from 'react'

import { UseAudioRecorderState } from './ExpoAudioStream.types'
import { UseAudioRecorderProps, useAudioRecorder } from './useAudioRecorder'

const initContext: UseAudioRecorderState = {
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    size: 0,
    compression: undefined,
    startRecording: async () => {
        throw new Error('AudioRecorderProvider not found')
    },
    stopRecording: async () => {
        throw new Error('AudioRecorderProvider not found')
    },
    pauseRecording: async () => {
        throw new Error('AudioRecorderProvider not found')
    },
    resumeRecording: async () => {
        throw new Error('AudioRecorderProvider not found')
    },
    prepareRecording: async () => {
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
