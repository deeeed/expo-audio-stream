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
        throw new Error('processAudioBuffer is only supported on web')
    }

    let ctx: AudioContext | undefined
    let buffer: AudioBuffer | undefined

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
        buffer = await ctx.decodeAudioData(audioData)

        logger?.debug('Original audio buffer details:', {
            length: buffer.length,
            sampleRate: buffer.sampleRate,
            duration: buffer.duration,
            channels: buffer.numberOfChannels,
        })

        // Convert byte positions to sample positions if position/length are provided
        const bytesPerSample = 2 // Assuming 16-bit audio = 2 bytes per sample
        const startSample =
            position !== undefined ? Math.floor(position / bytesPerSample) : 0
        const endSample =
            position !== undefined && length !== undefined
                ? Math.min(
                      buffer.length,
                      Math.floor((position + length) / bytesPerSample)
                  )
                : buffer.length

        const rangeLength = endSample - startSample

        // Ensure we have a valid range with minimum size
        if (rangeLength <= 0) {
            throw new Error(
                `Invalid sample range: got length ${rangeLength} (start: ${startSample}, end: ${endSample}, buffer length: ${buffer.length})`
            )
        }

        logger?.debug('Sample range calculation:', {
            originalPosition: position,
            originalLength: length,
            bytesPerSample,
            startSample,
            endSample,
            rangeLength,
            totalBufferLength: buffer.length,
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
            for (let i = 0; i < rangeLength; i++) {
                segmentChannelData[i] = channelData[startSample + i]
            }
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
            gainNode.gain.value = maxAmp > 0 ? 1 / maxAmp : 1
        } else {
            source.connect(offlineCtx.destination)
        }

        // Start the source and render
        source.start()
        const processedBuffer = await offlineCtx.startRendering()

        // Get the processed audio data
        const pcmData = processedBuffer.getChannelData(0)

        logger?.debug('Processed buffer details:', {
            startSample,
            endSample,
            rangeLength,
            processedLength: processedBuffer.length,
            pcmDataLength: pcmData.length,
            firstFewSamples: Array.from(pcmData.slice(0, 5)),
            lastFewSamples: Array.from(pcmData.slice(-5)),
            hasNonZeroData: pcmData.some((v) => v !== 0),
            requestedByteRange: {
                start: position,
                length,
            },
            actualSampleRange: {
                start: startSample,
                length: rangeLength,
            },
        })

        return {
            pcmData,
            samples: rangeLength,
            durationMs: (rangeLength / targetSampleRate) * 1000,
            sampleRate: targetSampleRate,
            channels: targetChannels,
            buffer: processedBuffer,
        }
    } catch (error) {
        logger?.error('Failed to process audio buffer:', {
            error,
            position,
            length,
            startTimeMs,
            endTimeMs,
            bufferLength: buffer?.length,
        })
        throw error
    } finally {
        if (!audioContext && ctx) {
            await ctx.close()
        }
    }
}
