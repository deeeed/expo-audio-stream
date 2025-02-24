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

    // Calculate start and end samples based on position/length or time
    let startSample = 0
    let endSample = buffer.length
    let rangeLength = buffer.length

    if (position !== undefined && length !== undefined) {
        const bytesPerSample = 2 // Assuming 16-bit audio
        startSample = Math.floor(position / bytesPerSample)
        endSample = Math.min(
            buffer.length,
            Math.floor((position + length) / bytesPerSample)
        )
        rangeLength = endSample - startSample
    } else if (startTimeMs !== undefined && endTimeMs !== undefined) {
        startSample = Math.floor((startTimeMs / 1000) * buffer.sampleRate)
        endSample = Math.min(
            buffer.length,
            Math.floor((endTimeMs / 1000) * buffer.sampleRate)
        )
        rangeLength = endSample - startSample
    }

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

    // Create offline context with the correct length
    const offlineCtx = new OfflineAudioContext(
        targetChannels,
        rangeLength,
        targetSampleRate
    )

    const source = offlineCtx.createBufferSource()
    source.buffer = buffer

    // Ensure proper timing when starting the source
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

    // Convert to PCM data with proper byte handling
    const channelData = processedBuffer.getChannelData(0)
    const pcmData = new Float32Array(rangeLength) // Use rangeLength

    // Copy the channel data for the selected range
    for (let i = 0; i < rangeLength; i++) {
        pcmData[i] = channelData[i]
    }

    logger?.debug('Processed buffer details:', {
        startSample,
        endSample,
        rangeLength,
        processedLength: processedBuffer.length,
        channelDataLength: channelData.length,
        pcmDataLength: pcmData.length,
    })

    return {
        pcmData,
        samples: rangeLength, // Use actual range length
        durationMs: (rangeLength / targetSampleRate) * 1000,
        sampleRate: targetSampleRate,
        channels: targetChannels,
        buffer: processedBuffer,
    }
}
