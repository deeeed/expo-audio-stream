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

            logger?.debug('EXTRACT AUDIO - Step 1: Initial params', {
                input: {
                    position,
                    length,
                    startTimeMs,
                    endTimeMs,
                    sampleRate: decodingOptions?.targetSampleRate ?? 16000,
                    bitDepth: decodingOptions?.targetBitDepth ?? 16,
                },
                expected: {
                    samplesFor3Sec:
                        (decodingOptions?.targetSampleRate ?? 16000) * 3,
                    bytesFor3Sec:
                        (decodingOptions?.targetSampleRate ?? 16000) * 3 * 2,
                },
            })

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
                logger,
            })

            logger?.debug('EXTRACT AUDIO - Step 2: After processing', {
                processed: {
                    samples: processedBuffer.samples,
                    durationMs: processedBuffer.durationMs,
                    pcmDataLength: processedBuffer.pcmData.length,
                },
                shouldBe: {
                    samples: length ? length / 2 : undefined,
                    durationMs: endTimeMs
                        ? endTimeMs - (startTimeMs ?? 0)
                        : undefined,
                },
            })

            const channelData = processedBuffer.pcmData
            const bitDepth = (decodingOptions?.targetBitDepth ?? 16) as BitDepth
            const bytesPerSample = bitDepth / 8
            const numSamples = processedBuffer.samples

            logger?.debug('EXTRACT AUDIO - Step 3: PCM conversion setup', {
                channelData: {
                    length: channelData.length,
                    first: channelData[0],
                    last: channelData[channelData.length - 1],
                },
                calculation: {
                    bitDepth,
                    bytesPerSample,
                    numSamples,
                    expectedBytes: numSamples * bytesPerSample,
                },
            })

            // Create PCM data with correct length based on original byte length
            const pcmData = new Uint8Array(numSamples * bytesPerSample)
            let offset = 0

            // Convert Float32 samples to PCM format
            for (let i = 0; i < numSamples; i++) {
                const sample = channelData[i]
                const value = Math.max(-1, Math.min(1, sample))
                const intValue = Math.round(value * 32767)
                pcmData[offset++] = intValue & 255
                pcmData[offset++] = (intValue >> 8) & 255
            }

            const durationMs = Math.round(
                (numSamples / processedBuffer.sampleRate) * 1000
            )

            logger?.debug('EXTRACT AUDIO - Step 4: Final output', {
                pcmData: {
                    length: pcmData.length,
                    first: pcmData[0],
                    last: pcmData[pcmData.length - 1],
                },
                timing: {
                    numSamples,
                    sampleRate: processedBuffer.sampleRate,
                    durationMs,
                    shouldBe3000ms: endTimeMs
                        ? endTimeMs - (startTimeMs ?? 0) === 3000
                        : undefined,
                },
            })

            const result: ExtractedAudioData = {
                pcmData: new Uint8Array(pcmData.buffer),
                sampleRate: processedBuffer.sampleRate,
                channels: processedBuffer.channels,
                bitDepth,
                durationMs,
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
            options.logger?.error('EXTRACT AUDIO - Error:', {
                error,
            })
            throw error
        }
    }
} else {
    ExpoAudioStreamModule = requireNativeModule('ExpoAudioStream')
}

export default ExpoAudioStreamModule
