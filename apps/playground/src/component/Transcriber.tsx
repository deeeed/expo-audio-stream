import { Chunk, TranscriberData } from '@siteed/expo-audio-stream'
import React, { useEffect, useState } from 'react'
import { View } from 'react-native'

import { baseLogger } from '../config'
import { ProgressItems } from './ProgressItems'
import Transcript from './Transcript'
import { useTranscription } from '../context/TranscriptionProvider'
import { isWeb } from '../utils/utils'

const logger = baseLogger.extend('Transcriber')

interface TranscriberProps {
    fullAudio: Float32Array | string
    sampleRate: number
    currentTimeMs?: number
    isPlaying?: boolean
    showActions?: boolean
    onSelectChunk?: (_: { chunk: Chunk }) => void
    onTranscriptionUpdate?: (params: TranscriberData) => void
    onTranscriptionComplete?: (params: TranscriberData) => void
}

const WhisperSampleRate = 16000

const Transcriber: React.FC<TranscriberProps> = ({
    fullAudio,
    sampleRate,
    currentTimeMs,
    isPlaying,
    showActions = false,
    onTranscriptionUpdate,
    onTranscriptionComplete,
    onSelectChunk,
}) => {
    const {
        isBusy,
        isModelLoading,
        ready,
        progressItems,
        transcribe,
        initialize,
        transcript,
    } = useTranscription()

    const [currentAudio, setCurrentAudio] = useState<
        Float32Array | string | null
    >(fullAudio)

    useEffect(() => {
        if(!isWeb) {
            // TODO: activate on native
            return;
        }

        if (sampleRate !== WhisperSampleRate) {
            logger.warn(
                `TODO: Resampling audio from ${sampleRate} to ${WhisperSampleRate}`
            )
        }
        logger.debug('Decoding audio...', fullAudio)
        setCurrentAudio(fullAudio)
    }, [fullAudio, sampleRate])

    useEffect(() => {
        console.debug(
            `Transcriber useEffect, isBusy: ${isBusy}, currentAudio: ${typeof currentAudio}, ready: ${ready}`
        )
        if (!isBusy && currentAudio && ready) {
            logger.debug('Start new transcription...', currentAudio)
            transcribe({
                audioData: currentAudio,
                jobId: Date.now().toString(),
                options: {
                    language: 'en',
                    tokenTimestamps: true,
                    tdrzEnable: true,
                },
            })
                .then((result) => {
                    console.debug('Transcriber result', JSON.stringify(result))
                    return result
                })
                .catch((error) => {
                    console.error('Transcriber error', error)
                    return error
                })
            // Clear the currentAudio after starting transcription
            setCurrentAudio(null)
        }
        if (!ready && !isModelLoading && isWeb) {
            logger.debug('Model not ready, starting model loading...')
            initialize()
        }
    }, [isBusy, transcribe, currentAudio, ready, isModelLoading, initialize])

    useEffect(() => {
        console.debug('Transcriber transcript useEffect', transcript)
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
    }, [transcript, onTranscriptionUpdate, onTranscriptionComplete])

    return (
        <View>
            {isModelLoading ? (
                <ProgressItems items={progressItems} />
            ) : (
                <Transcript
                    transcribedData={transcript}
                    isPlaying={isPlaying}
                    showActions={showActions}
                    onSelectChunk={onSelectChunk}
                    currentTimeMs={currentTimeMs}
                />
            )}
        </View>
    )
}

export default Transcriber
