// packages/expo-audio-stream/src/utils/audioProcessing.ts
import { Platform } from 'react-native'
import crc32 from 'crc-32'

export interface ProcessAudioBufferOptions {
    buffer: AudioBuffer
    targetSampleRate: number
    targetChannels: number
    normalizeAudio: boolean
}

export async function processAudioBuffer({
    buffer,
    targetSampleRate,
    targetChannels,
    normalizeAudio,
}: ProcessAudioBufferOptions): Promise<AudioBuffer> {
    if (Platform.OS !== 'web') {
        throw new Error('processAudioBuffer is not supported on web')
    }

    // If we need to resample or convert channels
    if (
        buffer.sampleRate !== targetSampleRate ||
        buffer.numberOfChannels !== targetChannels
    ) {
        const offlineCtx = new OfflineAudioContext(
            targetChannels,
            (buffer.length * targetSampleRate) / buffer.sampleRate,
            targetSampleRate
        )

        const source = offlineCtx.createBufferSource()
        source.buffer = buffer

        if (normalizeAudio) {
            const gainNode = offlineCtx.createGain()
            source.connect(gainNode)
            gainNode.connect(offlineCtx.destination)

            // Calculate normalization factor
            let maxAmp = 0
            for (
                let channel = 0;
                channel < buffer.numberOfChannels;
                channel++
            ) {
                const channelData = buffer.getChannelData(channel)
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

        source.start()
        return await offlineCtx.startRendering()
    }

    return buffer
}

function calculateBufferCRC32(buffer: AudioBuffer): number {
    // Convert audio data to bytes consistently across platforms
    const floatArray: number[] = []
    
    // Concatenate all channel data
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel)
        floatArray.push(...channelData)
    }
    
    // Convert float array to byte array using DataView for consistent endianness
    const byteArray = new Uint8Array(floatArray.length * 4)
    const dataView = new DataView(byteArray.buffer)
    
    floatArray.forEach((float, index) => {
        // Use little-endian (true) to match native implementations
        dataView.setFloat32(index * 4, float, true)
    })
    
    // Calculate CRC32 using the crc-32 library
    return crc32.buf(byteArray)
}
