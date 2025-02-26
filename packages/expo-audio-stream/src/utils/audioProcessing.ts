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
    channelData: Float32Array
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

        logger?.debug('Input parameters:', {
            position,
            length,
            startTimeMs,
            endTimeMs,
            targetSampleRate,
            targetChannels,
            bufferInfo: {
                length: buffer.length,
                sampleRate: buffer.sampleRate,
                duration: buffer.duration,
                channels: buffer.numberOfChannels,
            },
        })

        const bytesPerSample = 2 // 16-bit audio = 2 bytes per sample

        logger?.debug('RAW INPUT:', {
            position,
            length,
            startTimeMs,
            endTimeMs,
        })

        // Log every step of the calculation
        logger?.debug('STEP 1 - Position calculation:', {
            position,
            bytesPerSample,
            wouldBe: position ? position / bytesPerSample : null,
            orFromTime: startTimeMs
                ? Math.floor((startTimeMs / 1000) * buffer.sampleRate)
                : null,
        })

        const startSample =
            position !== undefined
                ? Math.floor(position / bytesPerSample)
                : startTimeMs !== undefined
                  ? Math.floor((startTimeMs / 1000) * buffer.sampleRate)
                  : 0

        logger?.debug('STEP 2 - Length calculation:', {
            length,
            bytesPerSample,
            wouldBe: length ? length / bytesPerSample : null,
            orFromTime:
                endTimeMs && startTimeMs
                    ? Math.floor(
                          ((endTimeMs - startTimeMs) / 1000) * buffer.sampleRate
                      )
                    : null,
        })

        const samplesNeeded =
            length !== undefined
                ? Math.floor(length / bytesPerSample)
                : endTimeMs !== undefined && startTimeMs !== undefined
                  ? Math.floor(
                        ((endTimeMs - startTimeMs) / 1000) * buffer.sampleRate
                    )
                  : buffer.length - startSample

        logger?.debug('STEP 3 - Final numbers:', {
            startSample,
            samplesNeeded,
            expectedDurationMs: (samplesNeeded / buffer.sampleRate) * 1000,
            shouldBe: {
                samplesFor3Seconds: buffer.sampleRate * 3,
                bytesFor3Seconds: buffer.sampleRate * 3 * bytesPerSample,
            },
        })

        // Ensure we don't exceed buffer bounds
        const endSample = Math.min(buffer.length, startSample + samplesNeeded)
        const actualSamples = endSample - startSample

        logger?.debug('STEP 4 - Final check:', {
            startSample,
            endSample,
            actualSamples,
            durationMs: (actualSamples / buffer.sampleRate) * 1000,
            shouldBe3000ms: true,
        })

        // Calculate the correct number of samples based on duration
        const originalDuration = actualSamples / buffer.sampleRate // Duration in seconds
        const targetSamples = Math.ceil(originalDuration * targetSampleRate) // Correct sample count at target rate

        logger?.debug('STEP 4.5 - Sample rate conversion:', {
            originalSampleRate: buffer.sampleRate,
            targetSampleRate,
            originalDuration,
            originalSamples: actualSamples,
            targetSamples,
            expectedDurationMs: Math.round(originalDuration * 1000),
        })

        // Create offline context with the correct number of samples to maintain duration
        const offlineCtx = new OfflineAudioContext(
            targetChannels,
            targetSamples, // Use targetSamples instead of actualSamples
            targetSampleRate
        )

        // Create source buffer with the exact segment we want
        const segmentBuffer = ctx.createBuffer(
            buffer.numberOfChannels,
            actualSamples,
            buffer.sampleRate
        )

        // Copy the segment data
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel)
            const segmentChannelData = segmentBuffer.getChannelData(channel)
            for (let i = 0; i < actualSamples; i++) {
                segmentChannelData[i] = channelData[startSample + i]
            }
        }

        // Create source and connect
        const source = offlineCtx.createBufferSource()
        source.buffer = segmentBuffer

        // if (normalizeAudio) {
        //     const gainNode = offlineCtx.createGain()
        //     source.connect(gainNode)
        //     gainNode.connect(offlineCtx.destination)

        //     // Calculate normalization factor
        //     let maxAmp = 0
        //     for (
        //         let channel = 0;
        //         channel < segmentBuffer.numberOfChannels;
        //         channel++
        //     ) {
        //         const channelData = segmentBuffer.getChannelData(channel)
        //         for (let i = 0; i < channelData.length; i++) {
        //             maxAmp = Math.max(maxAmp, Math.abs(channelData[i]))
        //         }
        //     }

        //     // Set gain to normalize
        //     gainNode.gain.value = maxAmp > 0 ? 1 / maxAmp : 1
        // } else {
        //     source.connect(offlineCtx.destination)
        // }
        source.connect(offlineCtx.destination)
        // Start the source and render
        source.start()
        const processedBuffer = await offlineCtx.startRendering()

        // Get the processed audio data - need to handle multiple channels
        let channelData: Float32Array

        if (processedBuffer.numberOfChannels === 1) {
            // Single channel case - just get the data
            channelData = processedBuffer.getChannelData(0)
        } else {
            // Multiple channels case - need to interleave the channels
            const length =
                processedBuffer.length * processedBuffer.numberOfChannels
            channelData = new Float32Array(length)

            for (
                let channel = 0;
                channel < processedBuffer.numberOfChannels;
                channel++
            ) {
                const channelData = processedBuffer.getChannelData(channel)
                for (let i = 0; i < processedBuffer.length; i++) {
                    channelData[
                        i * processedBuffer.numberOfChannels + channel
                    ] = channelData[i]
                }
            }
        }

        // Update duration calculation to be based on the requested samples
        const durationMs = Math.round(originalDuration * 1000)

        logger?.debug('Processed buffer details:', {
            startSample,
            endSample: startSample + actualSamples,
            rangeLength: actualSamples,
            processedLength: channelData.length,
            pcmDataLength: channelData.length,
            durationMs,
            sampleRate: targetSampleRate,
            channels: buffer.numberOfChannels,
        })

        return {
            buffer,
            channelData,
            samples: targetSamples,
            durationMs,
            sampleRate: targetSampleRate,
            channels: processedBuffer.numberOfChannels,
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
