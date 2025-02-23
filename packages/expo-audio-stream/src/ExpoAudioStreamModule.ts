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

            // Get the audio data
            if (!fileUri) {
                throw new Error('fileUri is required')
            }

            const response = await fetch(fileUri)
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch fileUri: ${response.statusText}`
                )
            }
            const audioBuffer = await response.arrayBuffer()

            // Create audio context with target sample rate if specified
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)({
                sampleRate: decodingOptions?.targetSampleRate ?? 16000,
            })

            // Decode the audio data
            const decodedAudioBuffer =
                await audioContext.decodeAudioData(audioBuffer)

            logger?.debug('Audio Buffer Details:', {
                originalLength: decodedAudioBuffer.length,
                sampleRate: decodedAudioBuffer.sampleRate,
                duration: decodedAudioBuffer.duration,
                channels: decodedAudioBuffer.numberOfChannels,
            })

            // Process the audio buffer using shared helper function
            const processedBuffer = await processAudioBuffer({
                buffer: decodedAudioBuffer,
                targetSampleRate: decodingOptions?.targetSampleRate ?? 16000,
                targetChannels: decodingOptions?.targetChannels ?? 1,
                normalizeAudio: decodingOptions?.normalizeAudio ?? false,
            })

            const channelData = processedBuffer.getChannelData(0)
            const bitDepth = (decodingOptions?.targetBitDepth ?? 16) as BitDepth
            const bytesPerSample = bitDepth / 8

            // Calculate sample positions from either byte positions or time
            let startSample: number
            let endSample: number

            if (position != null && length != null) {
                // Use byte positions if provided
                startSample = Math.floor(position / bytesPerSample)
                endSample = Math.floor((position + length) / bytesPerSample)
            } else if (startTimeMs != null && endTimeMs != null) {
                // Fall back to time-based calculation
                startSample = Math.floor(
                    (startTimeMs / 1000) * processedBuffer.sampleRate
                )
                endSample = Math.floor(
                    (endTimeMs / 1000) * processedBuffer.sampleRate
                )
            } else {
                // If neither is provided, use the entire buffer
                startSample = 0
                endSample = channelData.length
            }

            logger?.debug('Segment Calculation:', {
                position,
                length,
                startTimeMs,
                endTimeMs,
                bytesPerSample,
                startSample,
                endSample,
                channelDataLength: channelData.length,
                requestedSegmentLength: endSample - startSample,
            })

            // Ensure we don't exceed buffer bounds
            startSample = Math.max(0, Math.min(startSample, channelData.length))
            endSample = Math.max(
                startSample,
                Math.min(endSample, channelData.length)
            )

            // Create PCM data array for just the segment
            const pcmData = new Uint8Array(
                (endSample - startSample) * bytesPerSample
            )
            let offset = 0

            // Only process the samples within our segment
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

            const result = {
                data: pcmData,
                sampleRate: processedBuffer.sampleRate,
                channels: processedBuffer.numberOfChannels,
                bitDepth,
                durationMs:
                    ((endSample - startSample) / processedBuffer.sampleRate) *
                    1000,
                format: `pcm_${bitDepth}bit` as const,
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
