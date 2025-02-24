import crc32 from 'crc-32'
import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

import {
    ExtractAudioDataOptions,
    ExtractedAudioData,
    BitDepth,
} from './ExpoAudioStream.types'
import {
    ExpoAudioStreamWeb,
    ExpoAudioStreamWebProps,
} from './ExpoAudioStream.web'
import { processAudioBuffer } from './utils/audioProcessing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExpoAudioStreamModule: any

if (Platform.OS === 'web') {
    let instance: ExpoAudioStreamWeb | null = null

    ExpoAudioStreamModule = (webProps: ExpoAudioStreamWebProps) => {
        if (!instance) {
            instance = new ExpoAudioStreamWeb(webProps)
        }
        return instance
    }
    ExpoAudioStreamModule.requestPermissionsAsync = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            stream.getTracks().forEach((track) => track.stop())
            return {
                status: 'granted',
                expires: 'never',
                canAskAgain: true,
                granted: true,
            }
        } catch {
            return {
                status: 'denied',
                expires: 'never',
                canAskAgain: true,
                granted: false,
            }
        }
    }
    ExpoAudioStreamModule.getPermissionsAsync = async () => {
        let maybeStatus: string | null = null

        if (navigator?.permissions?.query) {
            try {
                const { state } = await navigator.permissions.query({
                    name: 'microphone' as PermissionName,
                })
                maybeStatus = state
            } catch {
                maybeStatus = null
            }
        }

        switch (maybeStatus) {
            case 'granted':
                return {
                    status: 'granted',
                    expires: 'never',
                    canAskAgain: true,
                    granted: true,
                }
            case 'denied':
                return {
                    status: 'denied',
                    expires: 'never',
                    canAskAgain: true,
                    granted: false,
                }
            default:
                return await ExpoAudioStreamModule.requestPermissionsAsync()
        }
    }
    ExpoAudioStreamModule.extractAudioData = async (
        options: ExtractAudioDataOptions
    ): Promise<ExtractedAudioData> => {
        try {
            const {
                fileUri,
                position,
                length,
                startTimeMs,
                endTimeMs,
                decodingOptions,
                logger,
            } = options

            logger?.info('Web Audio Extraction - Starting:', {
                fileUri,
                position,
                length,
                startTimeMs,
                endTimeMs,
                decodingOptions,
            })

            // Process the audio using shared helper function
            const processedBuffer = await processAudioBuffer({
                fileUri,
                targetSampleRate: decodingOptions?.targetSampleRate ?? 16000,
                targetChannels: decodingOptions?.targetChannels ?? 1,
                normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                position: position ? position / 2 : undefined,
                length: length ? length / 2 : undefined,
                startTimeMs,
                endTimeMs,
                logger,
            })

            const channelData = processedBuffer.pcmData
            const bitDepth = (decodingOptions?.targetBitDepth ?? 16) as BitDepth
            const bytesPerSample = bitDepth / 8
            const numSamples = processedBuffer.samples

            logger?.debug('PCM conversion details:', {
                numSamples,
                bytesPerSample,
                channelDataLength: channelData.length,
                requestedPosition: position,
                requestedLength: length,
                actualSamples: processedBuffer.samples
            })

            // Only get the requested segment
            const pcmData = new Uint8Array(length ?? processedBuffer.pcmData.length * 2)
            let offset = 0

            // Convert Float32 samples to PCM format
            for (let i = 0; i < numSamples; i++) {
                const sample = channelData[i]
                if (bitDepth === 16) {
                    const value = Math.max(-1, Math.min(1, sample))
                    const intValue = Math.round(value * 32767)
                    pcmData[offset++] = intValue & 255
                    pcmData[offset++] = (intValue >> 8) & 255
                } else if (bitDepth === 32) {
                    const value = Math.max(-1, Math.min(1, sample))
                    const intValue = Math.round(value * 2147483647)
                    pcmData[offset++] = intValue & 255
                    pcmData[offset++] = (intValue >> 8) & 255
                    pcmData[offset++] = (intValue >> 16) & 255
                    pcmData[offset++] = (intValue >> 24) & 255
                }
            }

            const result: ExtractedAudioData = {
                pcmData: new Uint8Array(pcmData.buffer),
                sampleRate: processedBuffer.sampleRate,
                channels: processedBuffer.channels,
                bitDepth,
                durationMs: processedBuffer.durationMs,
                format: `pcm_${bitDepth}bit` as const,
                samples: numSamples,
            }

            if (options.includeNormalizedData) {
                result.normalizedData = channelData
            }

            if (options.computeChecksum) {
                result.checksum = crc32.buf(pcmData)
            }

            return result
        } catch (error) {
            console.error('Failed to extract audio data:', error)
            throw error
        }
    }
} else {
    ExpoAudioStreamModule = requireNativeModule('ExpoAudioStream')
}

export default ExpoAudioStreamModule
