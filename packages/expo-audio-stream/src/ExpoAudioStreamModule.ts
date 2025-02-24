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

            // Create AudioContext with the correct sample rate
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: decodingOptions?.targetSampleRate ?? 16000,
            })

            try {
                // Process the audio using shared helper function
                const processedBuffer = await processAudioBuffer({
                    fileUri,
                    targetSampleRate: decodingOptions?.targetSampleRate ?? 16000,
                    targetChannels: decodingOptions?.targetChannels ?? 1,
                    normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                    position,
                    length,
                    startTimeMs,
                    endTimeMs,
                    audioContext,
                    logger,
                })

                logger?.debug('Audio Buffer Details:', {
                    originalLength: processedBuffer.samples,
                    sampleRate: processedBuffer.sampleRate,
                    duration: processedBuffer.durationMs,
                    channels: processedBuffer.channels,
                })

                const channelData = processedBuffer.pcmData
                const bitDepth = (decodingOptions?.targetBitDepth ?? 16) as BitDepth
                const bytesPerSample = bitDepth / 8

                // Calculate sample positions from byte positions
                const startSample = Math.floor((position ?? 0) / bytesPerSample)
                const endSample = Math.floor(
                    ((position ?? 0) + (length ?? 0)) / bytesPerSample
                )
                const numSamples = endSample - startSample

                logger?.debug('PCM conversion details:', {
                    startSample,
                    endSample,
                    numSamples,
                    bytesPerSample,
                    channelDataLength: channelData.length,
                    position,
                    length,
                })

                // Create PCM data array for the segment
                const pcmData = new Uint8Array(numSamples * bytesPerSample)
                let offset = 0

                // Process samples for just our segment
                for (let i = startSample; i < endSample; i++) {
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
                    durationMs: (numSamples / processedBuffer.sampleRate) * 1000,
                    format: `pcm_${bitDepth}bit` as const,
                    samples: numSamples,
                }

                // Add normalized data if requested
                if (options.includeNormalizedData) {
                    result.normalizedData = channelData.slice(
                        0,
                        processedBuffer.samples
                    )
                }

                if (options.computeChecksum) {
                    result.checksum = crc32.buf(pcmData)
                }

                // Log result for debugging
                logger?.info('Extraction result:', {
                    sampleRate: result.sampleRate,
                    channels: result.channels,
                    samples: result.samples,
                    durationMs: result.durationMs,
                    pcmDataLength: result.pcmData.length,
                    checksum: result.checksum,
                })

                return result
            } finally {
                // Ensure AudioContext is closed
                await audioContext.close()
            }
        } catch (error) {
            console.error('Failed to extract audio data:', error)
            throw error
        }
    }
} else {
    ExpoAudioStreamModule = requireNativeModule('ExpoAudioStream')
}

export default ExpoAudioStreamModule
