import { TranscriberData } from '@siteed/expo-audio-stream'
import React, { useEffect, useState } from 'react'
import { View } from 'react-native'

import { ProgressItems } from './ProgressItems'
import Transcript from './Transcript'
import { baseLogger } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'

const logger = baseLogger.extend('Transcriber')

interface TranscriberProps {
    fullAudio: Float32Array
    sampleRate: number
    currentTimeMs?: number
    isPlaying?: boolean
    onTranscriptionUpdate?: (params: TranscriberData) => void
    onTranscriptionComplete?: (params: TranscriberData) => void
}

const WhisperSampleRate = 16000

const Transcriber: React.FC<TranscriberProps> = ({
    fullAudio,
    sampleRate,
    currentTimeMs,
    isPlaying,
    onTranscriptionUpdate,
    onTranscriptionComplete,
}) => {
    const { isBusy, isModelLoading, progressItems, transcribe, transcript } =
        useTranscription()
    const [currentAudio, setCurrentAudio] = useState<Float32Array | null>(null)

    useEffect(() => {
        if (fullAudio && fullAudio.byteLength > 0) {
            logger.debug('Decoding audio...', fullAudio)
            if (sampleRate !== WhisperSampleRate) {
                logger.warn(
                    `TODO: Resampling audio from ${sampleRate} to ${WhisperSampleRate}`
                )
            }
            setCurrentAudio(fullAudio)
        }
    }, [fullAudio, sampleRate])

    useEffect(() => {
        if (!isBusy && currentAudio) {
            logger.debug('Start new transcription...', currentAudio)
            transcribe({
                audioData: currentAudio,
                position: 0,
                jobId: Date.now().toString(),
            })
        }
    }, [isBusy, transcribe, currentAudio])

    useEffect(() => {
        if (transcript && transcript.text) {
            logger.log(
                `Transcription ${transcript.isBusy ? 'in progress' : 'completed'}: ${transcript.text}`,
                transcript
            )
            if (transcript.isBusy) {
                onTranscriptionUpdate?.(transcript)
            } else {
                onTranscriptionComplete?.(transcript)
            }
        }
    }, [transcript, onTranscriptionUpdate])

    return (
        <View>
            {isModelLoading ? (
                <ProgressItems items={progressItems} />
            ) : (
                <Transcript
                    transcribedData={transcript}
                    isPlaying={isPlaying}
                    currentTimeMs={currentTimeMs}
                />
            )}
        </View>
    )
}

export default Transcriber
