import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'

import Transcript from './Transcript'
import { baseLogger } from '../config'
import { TranscriberData } from '../context/TranscriberContext'
import { useTranscriber } from '../hooks/useTranscriber'

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
    const {
        isBusy,
        isModelLoading,
        progressItems,
        start,
        output,
        onInputChange,
    } = useTranscriber()
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
    }, [fullAudio, sampleRate, onInputChange])

    useEffect(() => {
        if (!isBusy && currentAudio) {
            logger.debug('Start new transcription...', currentAudio)
            start(currentAudio)
        }
    }, [isBusy, start, currentAudio])

    useEffect(() => {
        if (output && output.text) {
            logger.log(
                `Transcription ${output.isBusy ? 'in progress' : 'completed'}: ${output.text}`,
                output
            )
            if (output.isBusy) {
                onTranscriptionUpdate?.(output)
            } else {
                onTranscriptionComplete?.(output)
            }
        }
    }, [output, onTranscriptionUpdate])

    return (
        <View>
            {isModelLoading ? (
                <View>
                    {progressItems.map((item, index) => (
                        <Text key={index}>{JSON.stringify(item)}</Text>
                    ))}
                    <ActivityIndicator size="small" />
                </View>
            ) : (
                <Transcript
                    transcribedData={output}
                    isPlaying={isPlaying}
                    currentTimeMs={currentTimeMs}
                />
            )}
        </View>
    )
}

export default Transcriber
