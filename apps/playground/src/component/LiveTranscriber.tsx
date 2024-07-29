import React, { useEffect } from 'react'
import { Text, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'

import Transcript from './Transcript'
import { baseLogger } from '../config'
import { TranscriberData } from '../context/TranscriberContext'
import { useLiveTranscriber } from '../hooks/useLiveTranscriber'

const logger = baseLogger.extend('LiveTranscriber')

interface LiveTranscriberProps {
    fullAudio: Float32Array
    sampleRate: number
    onTranscriptions?: (params: TranscriberData[]) => void
}

const WhisperSampleRate = 16000

const LiveTranscriber: React.FC<LiveTranscriberProps> = ({
    fullAudio,
    sampleRate,
    onTranscriptions,
}) => {
    const { isModelLoading, progressItems, transcripts, activeTranscript } =
        useLiveTranscriber({ audioBuffer: fullAudio, sampleRate })

    useEffect(() => {
        if (fullAudio && fullAudio.length > 0) {
            logger.debug('Decoding audio...', fullAudio)
            if (sampleRate !== WhisperSampleRate) {
                logger.warn(
                    `TODO: Resampling audio from ${sampleRate} to ${WhisperSampleRate}`
                )
            }
        }
    }, [fullAudio, sampleRate])

    useEffect(() => {
        if (!onTranscriptions) {
            return
        }

        if (transcripts.length === 0) {
            return
        }

        onTranscriptions(transcripts)
    }, [transcripts, onTranscriptions])

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
                    <Transcript
                        transcribedData={transcripts}
                        showActions={false}
                    />
                    <Text>{activeTranscript || 'Waiting for audio...'}</Text>
                </View>
            )}
        </View>
    )
}

export default LiveTranscriber
