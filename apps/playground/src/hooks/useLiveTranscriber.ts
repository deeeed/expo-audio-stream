import { TranscriberData } from '@siteed/expo-audio-stream'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Transcriber, useTranscriber } from './useTranscriber'
import { baseLogger } from '../config'

const logger = baseLogger.extend('useLiveTranscriber')
interface LiveTranscriber extends Transcriber {
    transcripts: TranscriberData[]
    activeTranscript: string
}

interface LiveTranscriberProps {
    audioBuffer: Float32Array
    sampleRate: number
}

export function useLiveTranscriber({
    audioBuffer,
    sampleRate,
}: LiveTranscriberProps): LiveTranscriber {
    const transcriber = useTranscriber()
    const [transcripts, setTranscripts] = useState<TranscriberData[]>([])
    const [activeTranscript, setActiveTranscript] = useState('')
    const [currentAudio, setCurrentAudio] = useState<Float32Array>(
        new Float32Array(0)
    )
    const lastTranscribedPos = useRef(0) // To keep track of the last transcribed position
    const cumulativeDuration = useRef(0)

    useEffect(() => {
        if (audioBuffer && audioBuffer.byteLength > 0) {
            if (sampleRate !== 16000) {
                logger.warn(
                    `TODO: Resampling audio from ${sampleRate} to 16000`
                )
            } else {
                const newData = audioBuffer.slice(lastTranscribedPos.current)
                if (newData.length > 0) {
                    setCurrentAudio(
                        (prev) => new Float32Array([...prev, ...newData])
                    )
                    lastTranscribedPos.current = audioBuffer.length
                }
            }
        }
    }, [audioBuffer, sampleRate])

    useEffect(() => {
        if (transcriber.output && transcriber.output?.text) {
            const output = transcriber.output

            if (transcriber.output.isBusy) {
                setActiveTranscript(transcriber.output.text)
            } else {
                const adjustedChunks = output.chunks.map((chunk) => {
                    const [start, end] = chunk.timestamp
                    const adjustedStart = start + cumulativeDuration.current

                    const adjustedEnd =
                        (end ?? start) + cumulativeDuration.current // Handle potential null value in end

                    return {
                        ...chunk,
                        timestamp: [adjustedStart, adjustedEnd],
                    }
                })
                cumulativeDuration.current += adjustedChunks.reduce(
                    (acc, chunk) =>
                        acc +
                        ((chunk.timestamp[1] ?? chunk.timestamp[0]) -
                            chunk.timestamp[0]),
                    0
                )

                setTranscripts((prev) => [
                    ...prev,
                    {
                        ...output,
                        chunks: adjustedChunks,
                    } as TranscriberData,
                ])
                setActiveTranscript('') // Clear active transcript when a segment is complete
            }
        }
    }, [transcriber.output])

    useEffect(() => {
        if (!transcriber.isBusy && currentAudio) {
            transcriber.start(currentAudio)
            setCurrentAudio(new Float32Array(0)) // Clear currentAudio after starting transcription
        }
    }, [transcriber.isBusy, transcriber.output, transcriber.start])

    const liveTranscriber = useMemo(
        () => ({
            ...transcriber,
            transcripts,
            activeTranscript,
        }),
        [transcriber, transcripts, activeTranscript]
    )

    return liveTranscriber
}
