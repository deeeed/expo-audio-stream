// packages/expo-audio-stream/src/utils/audioProcessing.ts
import { Platform } from 'react-native'

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
