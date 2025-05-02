import React, { useEffect } from 'react'

import { View } from 'react-native'

import { useToast } from '@siteed/design-system'
import type { TranscriberData } from '@siteed/expo-audio-studio'

import { LoadingIndicator } from './LoadingIndicator'
import { ProgressItems } from './ProgressItems'
import Transcript from './Transcript'
import { WhisperSampleRate } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'

const BUFFERING_LIMIT = 10000

interface LiveTranscriberProps {
    transcripts: TranscriberData[]
    activeTranscript: string
    duration: number
    sampleRate: number
}

const LiveTranscriber: React.FC<LiveTranscriberProps> = ({
    transcripts,
    sampleRate,
    activeTranscript,
    duration,
}) => {
    const { show } = useToast()
    const { isModelLoading, isBusy, progressItems } = useTranscription()

    useEffect(() => {
        if (sampleRate !== WhisperSampleRate) {
            show({
                type: 'warning',
                message: `Sample rate is not ${WhisperSampleRate}Hz`,
            })
        }
    }, [sampleRate, show])

    const renderLoadingState = () => <ProgressItems items={progressItems} />

    const renderContent = () => (
        <View>
            <Transcript
                transcribedData={transcripts}
                isBusy={isBusy}
                showActions={false}
            />
            {duration < BUFFERING_LIMIT ? (
                <LoadingIndicator label="Buffering..." />
            ) : activeTranscript ? (
                <LoadingIndicator label={activeTranscript} />
            ) : (
                <LoadingIndicator label="Transcribing..." />
            )}
        </View>
    )

    return (
        <View>{isModelLoading ? renderLoadingState() : renderContent()}</View>
    )
}

export default LiveTranscriber
