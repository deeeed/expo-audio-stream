// packages/expo-audio-stream/src/utils/audioProcessing.ts
import { Platform } from 'react-native'

import { ConsoleLike } from '../ExpoAudioStream.types'

export interface ProcessAudioBufferOptions {
    arrayBuffer?: ArrayBuffer
    fileUri?: string
    targetSampleRate: number
    targetChannels: number
    normalizeAudio: boolean
    startTimeMs?: number
    endTimeMs?: number
    position?: number
    length?: number
    audioContext?: AudioContext
    logger?: ConsoleLike
}

export interface ProcessedAudioData {
    pcmData: Float32Array
    samples: number
    durationMs: number
    sampleRate: number
    channels: number
    buffer: AudioBuffer
}

export async function processAudioBuffer({
    arrayBuffer,
    fileUri,
    targetSampleRate,
    targetChannels,
    normalizeAudio,
    startTimeMs,
    endTimeMs,
    position,
    length,
    audioContext,
    logger,
}: ProcessAudioBufferOptions): Promise<ProcessedAudioData> {
    if (Platform.OS !== 'web') {
        throw new Error('processAudioBuffer is not supported on web')
    }

    let ctx: AudioContext | undefined

    try {
        // Get the audio data
        let audioData: ArrayBuffer
        if (arrayBuffer) {
            audioData = arrayBuffer
        } else if (fileUri) {
            const response = await fetch(fileUri)
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch fileUri: ${response.statusText}`
                )
            }
            audioData = await response.arrayBuffer()
        } else {
            throw new Error('Either arrayBuffer or fileUri must be provided')
        }

        // Use provided context or create a new one
        ctx =
            audioContext ||
            new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: targetSampleRate,
            })

        // Decode the audio data
        const buffer = await ctx.decodeAudioData(audioData)

        logger?.debug('Original audio buffer details:', {
            length: buffer.length,
            sampleRate: buffer.sampleRate,
            duration: buffer.duration,
            channels: buffer.numberOfChannels,
        })

        // Calculate start and end samples
        let startSample = 0
        let endSample = buffer.length

        if (position !== undefined && length !== undefined) {
            const bytesPerSample = 2 // 16-bit audio
            startSample = Math.floor(position / bytesPerSample)
            endSample = Math.min(
                buffer.length,
                startSample + Math.floor(length / bytesPerSample)
            )
        } else if (startTimeMs !== undefined && endTimeMs !== undefined) {
            startSample = Math.floor((startTimeMs / 1000) * buffer.sampleRate)
            endSample = Math.min(
                buffer.length,
                Math.floor((endTimeMs / 1000) * buffer.sampleRate)
            )
        }

        const rangeLength = endSample - startSample

        logger?.debug('Audio processing range:', {
            startSample,
            endSample,
            rangeLength,
            bufferLength: buffer.length,
            position,
            length,
            startTimeMs,
            endTimeMs,
        })

        // Create offline context for processing
        const offlineCtx = new OfflineAudioContext(
            targetChannels,
            rangeLength,
            targetSampleRate
        )

        // Create source buffer with the exact segment we want
        const segmentBuffer = ctx.createBuffer(
            buffer.numberOfChannels,
            rangeLength,
            buffer.sampleRate
        )

        // Copy the segment data
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel)
            const segmentChannelData = segmentBuffer.getChannelData(channel)
            segmentChannelData.set(channelData.subarray(startSample, endSample))
        }

        // Create source and connect
        const source = offlineCtx.createBufferSource()
        source.buffer = segmentBuffer

        if (normalizeAudio) {
            const gainNode = offlineCtx.createGain()
            source.connect(gainNode)
            gainNode.connect(offlineCtx.destination)

            // Calculate normalization factor
            let maxAmp = 0
            for (
                let channel = 0;
                channel < segmentBuffer.numberOfChannels;
                channel++
            ) {
                const channelData = segmentBuffer.getChannelData(channel)
                for (let i = 0; i < channelData.length; i++) {
                    maxAmp = Math.max(maxAmp, Math.abs(channelData[i]))
                }
            }

            // Set gain to normalize
            if (maxAmp > 0) {
                gainNode.gain.value = 1 / maxAmp
            }
        } else {
            source.connect(offlineCtx.destination)
        }

        // Start the source
        source.start()

        // Render the segment
        const processedBuffer = await offlineCtx.startRendering()
        const pcmData = new Float32Array(rangeLength)
        const channelData = processedBuffer.getChannelData(0)
        pcmData.set(channelData)

        logger?.debug('Processed buffer details:', {
            startSample,
            endSample,
            rangeLength,
            processedLength: processedBuffer.length,
            channelDataLength: channelData.length,
            pcmDataLength: pcmData.length,
            firstFewSamples: Array.from(pcmData.slice(0, 5)),
            lastFewSamples: Array.from(pcmData.slice(-5)),
            hasNonZeroData: pcmData.some((v) => v !== 0),
        })

        return {
            pcmData,
            samples: rangeLength,
            durationMs: (rangeLength / targetSampleRate) * 1000,
            sampleRate: targetSampleRate,
            channels: targetChannels,
            buffer: processedBuffer,
        }
    } finally {
        if (!audioContext && ctx) {
            await ctx.close()
        }
    }
}
