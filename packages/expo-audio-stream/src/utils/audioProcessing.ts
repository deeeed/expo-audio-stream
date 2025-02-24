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
    logger,
}: ProcessAudioBufferOptions): Promise<ProcessedAudioData> {
    if (Platform.OS !== 'web') {
        throw new Error('processAudioBuffer is not supported on web')
    }

    logger?.info('Processing audio buffer:', {
        hasArrayBuffer: !!arrayBuffer,
        fileUri,
        targetSampleRate,
        targetChannels,
        normalizeAudio,
        startTimeMs,
        endTimeMs,
        position,
        length,
    })

    // Get the audio data
    let audioData: ArrayBuffer
    if (arrayBuffer) {
        audioData = arrayBuffer
    } else if (fileUri) {
        const response = await fetch(fileUri)
        if (!response.ok) {
            throw new Error(`Failed to fetch fileUri: ${response.statusText}`)
        }
        audioData = await response.arrayBuffer()
    } else {
        throw new Error('Either arrayBuffer or fileUri must be provided')
    }

    // Create audio context with target sample rate
    const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: targetSampleRate,
    })

    // Decode the audio data
    const buffer = await audioContext.decodeAudioData(audioData)

    logger?.debug('Original audio buffer details:', {
        length: buffer.length,
        sampleRate: buffer.sampleRate,
        duration: buffer.duration,
        channels: buffer.numberOfChannels,
    })

    // Calculate start and end samples
    let startSample = 0
    let endSample = buffer.length

    if (startTimeMs !== undefined) {
        startSample = Math.floor((startTimeMs / 1000) * buffer.sampleRate)
        if (endTimeMs !== undefined) {
            endSample = Math.floor((endTimeMs / 1000) * buffer.sampleRate)
        }
    } else if (position !== undefined) {
        startSample = Math.floor(position / 2) // Convert bytes to samples (16-bit)
        if (length !== undefined) {
            endSample = startSample + Math.floor(length / 2)
        }
    }

    logger?.debug('Sample range:', {
        startSample,
        endSample,
        rangeLength: endSample - startSample,
    })

    // Create offline context with the correct length for the selected range
    const rangeLength = endSample - startSample
    const offlineCtx = new OfflineAudioContext(
        targetChannels,
        (rangeLength * targetSampleRate) / buffer.sampleRate,
        targetSampleRate
    )

    const source = offlineCtx.createBufferSource()
    source.buffer = buffer
    source.start(
        0,
        startSample / buffer.sampleRate,
        rangeLength / buffer.sampleRate
    )

    if (normalizeAudio) {
        const gainNode = offlineCtx.createGain()
        source.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        // Calculate normalization factor for the selected range
        let maxAmp = 0
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel)
            for (let i = startSample; i < endSample; i++) {
                maxAmp = Math.max(maxAmp, Math.abs(channelData[i]))
            }
        }

        // Set gain to normalize
        if (maxAmp > 0) {
            gainNode.gain.value = 1 / maxAmp
            logger?.debug('Applied normalization:', {
                maxAmp,
                gain: 1 / maxAmp,
            })
        }
    } else {
        source.connect(offlineCtx.destination)
    }

    const processedBuffer = await offlineCtx.startRendering()

    logger?.debug('Processed audio buffer details:', {
        length: processedBuffer.length,
        sampleRate: processedBuffer.sampleRate,
        duration: processedBuffer.duration,
        channels: processedBuffer.numberOfChannels,
    })

    // Convert to PCM data with proper byte handling
    const channelData = processedBuffer.getChannelData(0)
    const pcmData = new Float32Array(processedBuffer.length)
    
    // Copy the channel data for the selected range
    for (let i = 0; i < processedBuffer.length; i++) {
        pcmData[i] = channelData[i]
    }

    return {
        pcmData,
        samples: processedBuffer.length,
        durationMs: processedBuffer.duration * 1000,
        sampleRate: processedBuffer.sampleRate,
        channels: processedBuffer.numberOfChannels,
        buffer: processedBuffer,
    }
}
