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
import { writeWavHeader } from './utils/writeWavHeader'

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
                includeNormalizedData,
                includeBase64Data,
                includeWavHeader = false,
                logger,
            } = options

            logger?.debug('EXTRACT AUDIO - Step 1: Initial request', {
                fileUri,
                extractionParams: {
                    position,
                    length,
                    startTimeMs,
                    endTimeMs,
                },
                decodingOptions: {
                    targetSampleRate:
                        decodingOptions?.targetSampleRate ?? 16000,
                    targetChannels: decodingOptions?.targetChannels ?? 1,
                    targetBitDepth: decodingOptions?.targetBitDepth ?? 16,
                    normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                },
                outputOptions: {
                    includeNormalizedData,
                    includeBase64Data,
                    includeWavHeader,
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

            logger?.debug('EXTRACT AUDIO - Step 2: Audio processing complete', {
                processedData: {
                    samples: processedBuffer.samples,
                    sampleRate: processedBuffer.sampleRate,
                    channels: processedBuffer.channels,
                    durationMs: processedBuffer.durationMs,
                },
            })

            const channelData = processedBuffer.channelData
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
                // Convert to 16-bit signed integer
                let intValue = Math.round(value * 32767)

                // Handle negative values correctly
                if (intValue < 0) {
                    intValue = 65536 + intValue
                }

                // Write as little-endian
                pcmData[offset++] = intValue & 255 // Low byte
                pcmData[offset++] = (intValue >> 8) & 255 // High byte
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

            // Add WAV header if requested
            if (includeWavHeader) {
                logger?.debug('EXTRACT AUDIO - Step 4: Adding WAV header', {
                    originalLength: pcmData.length,
                    newLength: result.pcmData.length,
                    firstBytes: Array.from(result.pcmData.slice(0, 44)), // WAV header is 44 bytes
                })
                const wavBuffer = writeWavHeader({
                    buffer: pcmData.buffer.slice(0, pcmData.length),
                    sampleRate: processedBuffer.sampleRate,
                    numChannels: processedBuffer.channels,
                    bitDepth,
                })
                result.pcmData = new Uint8Array(wavBuffer)
                result.hasWavHeader = true
            }

            if (includeNormalizedData) {
                // // Simple approach: Create normalized data directly from the PCM data
                // // Just convert to -1 to 1 range without any amplification
                // const normalizedData = new Float32Array(numSamples)

                // // Convert the PCM data to float values
                // for (let i = 0; i < numSamples; i++) {
                //     // Get the 16-bit PCM value (little endian)
                //     const lowByte = pcmData[i * 2]
                //     const highByte = pcmData[i * 2 + 1]
                //     const pcmValue = (highByte << 8) | lowByte

                //     // Convert to signed 16-bit value
                //     const signedValue =
                //         pcmValue > 32767 ? pcmValue - 65536 : pcmValue

                //     // Normalize to float between -1 and 1
                //     normalizedData[i] = signedValue / 32768.0
                // }
                // Store the normalized data in the result
                result.normalizedData = channelData
            }

            if (includeBase64Data) {
                // Convert the PCM data to a base64 string
                const binary = Array.from(new Uint8Array(pcmData.buffer))
                    .map((b) => String.fromCharCode(b))
                    .join('')
                result.base64Data = btoa(binary)
            }

            if (options.computeChecksum) {
                result.checksum = crc32.buf(pcmData)
            }

            logger?.debug('EXTRACT AUDIO - Step 3: PCM conversion complete', {
                pcmStats: {
                    length: pcmData.length,
                    bytesPerSample,
                    totalSamples: numSamples,
                    firstBytes: Array.from(pcmData.slice(0, 16)),
                    lastBytes: Array.from(pcmData.slice(-16)),
                },
            })

            return result
        } catch (error) {
            options.logger?.error('EXTRACT AUDIO - Error:', error)
            throw error
        }
    }
} else {
    ExpoAudioStreamModule = requireNativeModule('ExpoAudioStream')
}

export default ExpoAudioStreamModule
