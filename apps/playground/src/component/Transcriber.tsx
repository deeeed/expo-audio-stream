import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'

import { baseLogger } from '../config'
import { useTranscriber } from '../hooks/useTranscriber'

const logger = baseLogger.extend('Transcriber')

interface TranscriberProps {
    fullAudio: Float32Array
    sampleRate: number
    onTranscriptionUpdate?: (params: { transcription: string }) => void
}

const WhisperSampleRate = 16000

const Transcriber: React.FC<TranscriberProps> = ({
    fullAudio,
    sampleRate,
    onTranscriptionUpdate,
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
                console.warn(
                    `TODO: Resampling audio from ${sampleRate} to ${WhisperSampleRate}`
                )
            }
            setCurrentAudio(fullAudio)
        }
    }, [fullAudio, sampleRate, onInputChange])

    useEffect(() => {
        if (!isBusy && currentAudio) {
            logger.debug('Transcribing...', currentAudio)
            start(currentAudio)
        }
    }, [isBusy, start, currentAudio])

    useEffect(() => {
        if (output && output.text) {
            onTranscriptionUpdate?.({ transcription: output.text })
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
                <View>
                    <Text>Transcription:</Text>
                    <Text>{output?.text || 'Waiting for audio...'}</Text>
                    <Text>Chunks processed: {output?.chunks.length || 0}</Text>
                </View>
            )}
        </View>
    )
}

export default Transcriber
