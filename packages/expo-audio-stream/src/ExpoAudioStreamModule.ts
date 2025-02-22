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
            // Get the audio data
            if (!options.fileUri) {
                throw new Error('fileUri is required')
            }

            const response = await fetch(options.fileUri)
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch fileUri: ${response.statusText}`
                )
            }
            const audioBuffer = await response.arrayBuffer()

            // Create audio context with target sample rate if specified
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)({
                sampleRate: options.decodingOptions?.targetSampleRate ?? 16000,
            })

            // Decode the audio data
            const decodedAudioBuffer =
                await audioContext.decodeAudioData(audioBuffer)

            // Process the audio buffer using shared helper function
            const processedBuffer = await processAudioBuffer({
                buffer: decodedAudioBuffer,
                targetSampleRate:
                    options.decodingOptions?.targetSampleRate ?? 16000,
                targetChannels: options.decodingOptions?.targetChannels ?? 1,
                normalizeAudio:
                    options.decodingOptions?.normalizeAudio ?? false,
            })

            // Convert to PCM data
            const channelData = processedBuffer.getChannelData(0)
            const bitDepth = (options.decodingOptions?.targetBitDepth ?? 16) as BitDepth
            const bytesPerSample = bitDepth / 8

            // Calculate effective range
            let startSample = 0
            let endSample = channelData.length

            if (options.startTimeMs != null && options.endTimeMs != null) {
                startSample = Math.floor(
                    (options.startTimeMs / 1000) * processedBuffer.sampleRate
                )
                endSample = Math.floor(
                    (options.endTimeMs / 1000) * processedBuffer.sampleRate
                )
            } else if (options.position != null && options.length != null) {
                startSample = Math.floor(options.position / bytesPerSample)
                endSample =
                    startSample + Math.floor(options.length / bytesPerSample)
            }

            // Validate range
            if (
                startSample < 0 ||
                endSample > channelData.length ||
                startSample >= endSample
            ) {
                throw new Error('Invalid range specified')
            }

            // Create PCM data array
            const pcmData = new Uint8Array(
                (endSample - startSample) * bytesPerSample
            )
            let offset = 0

            for (let i = startSample; i < endSample; i++) {
                const sample = channelData[i]

                if (bitDepth === 16) {
                    const value = Math.max(-1, Math.min(1, sample)) // Clamp between -1 and 1
                    const intValue = Math.round(value * 32767) // Convert to 16-bit
                    pcmData[offset++] = intValue & 255 // Low byte
                    pcmData[offset++] = (intValue >> 8) & 255 // High byte
                } else if (bitDepth === 32) {
                    const value = Math.max(-1, Math.min(1, sample))
                    const intValue = Math.round(value * 2147483647)
                    pcmData[offset++] = intValue & 255
                    pcmData[offset++] = (intValue >> 8) & 255
                    pcmData[offset++] = (intValue >> 16) & 255
                    pcmData[offset++] = (intValue >> 24) & 255
                } else {
                    throw new Error(`Unsupported bit depth: ${bitDepth}`)
                }
            }

            return {
                data: pcmData,
                sampleRate: processedBuffer.sampleRate,
                channels: processedBuffer.numberOfChannels,
                bitDepth,
                durationMs:
                    ((endSample - startSample) / processedBuffer.sampleRate) *
                    1000,
                format: `pcm_${bitDepth}bit` as const,
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
