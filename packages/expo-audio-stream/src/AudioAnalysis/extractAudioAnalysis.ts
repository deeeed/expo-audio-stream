// packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts
import { ConsoleLike } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import {
    AudioAnalysis,
    AudioFeatures,
    AudioFeaturesOptions,
    AudioPreview,
    DecodingConfig,
    PreviewOptions,
} from './AudioAnalysis.types'
import { convertPCMToFloat32 } from '../utils/convertPCMToFloat32'
import { getWavFileInfo, WavFileInfo } from '../utils/getWavFileInfo'
import { InlineFeaturesExtractor } from '../workers/InlineFeaturesExtractor.web'

export interface ExtractAudioAnalysisProps {
    fileUri?: string // should provide either fileUri or arrayBuffer
    wavMetadata?: WavFileInfo
    arrayBuffer?: ArrayBuffer
    bitDepth?: number
    skipWavHeader?: boolean
    durationMs?: number
    sampleRate?: number
    numberOfChannels?: number
    position?: number // Optional number of bytes to skip. Default is 0
    length?: number // Optional number of bytes to read.
    pointsPerSecond?: number // Optional number of points per second. Use to reduce the number of points and compute the number of datapoints to return.
    features?: AudioFeaturesOptions
    featuresExtratorUrl?: string
    logger?: ConsoleLike
    decodingOptions?: DecodingConfig
}

export interface ExtractAudioFromAnyFormatProps
    extends ExtractAudioAnalysisProps {
    mimeType?: string
    decodingOptions?: DecodingConfig
    startTime?: number // Add start time in milliseconds
    endTime?: number // Add end time in milliseconds
}

export async function extractAudioFromAnyFormat({
    fileUri,
    arrayBuffer,
    mimeType,
    decodingOptions,
    startTime,
    endTime,
    ...restProps
}: ExtractAudioFromAnyFormatProps): Promise<AudioAnalysis> {
    if (isWeb) {
        try {
            // Get the audio data
            let audioBuffer: ArrayBuffer
            if (arrayBuffer) {
                audioBuffer = arrayBuffer
            } else if (fileUri) {
                const response = await fetch(fileUri)
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch fileUri: ${response.statusText}`
                    )
                }
                audioBuffer = await response.arrayBuffer()
            } else {
                throw new Error(
                    'Either arrayBuffer or fileUri must be provided'
                )
            }

            // Create audio context with target sample rate if specified
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)({
                sampleRate: decodingOptions?.targetSampleRate,
            })

            // Decode the audio data
            const decodedAudioBuffer =
                await audioContext.decodeAudioData(audioBuffer)

            // Calculate the actual duration in milliseconds
            const fullDurationMs = decodedAudioBuffer.duration * 1000
            const effectiveDurationMs = endTime
                ? endTime - (startTime || 0)
                : fullDurationMs - (startTime || 0)

            // Create a new buffer for the selected range
            const rangeLength = decodedAudioBuffer.length
            const rangeBuffer = new AudioBuffer({
                length: rangeLength,
                numberOfChannels: decodedAudioBuffer.numberOfChannels,
                sampleRate: decodedAudioBuffer.sampleRate,
            })

            // Copy the selected range
            for (
                let channel = 0;
                channel < decodedAudioBuffer.numberOfChannels;
                channel++
            ) {
                const channelData = decodedAudioBuffer.getChannelData(channel)
                const rangeData = channelData.slice(0, rangeLength)
                rangeBuffer.copyToChannel(rangeData, channel)
            }

            // Use the range buffer instead of the full buffer
            let processedBuffer = rangeBuffer

            // Get original properties
            const originalSampleRate = processedBuffer.sampleRate
            const length = processedBuffer.length

            // Determine target format
            const targetChannels =
                decodingOptions?.targetChannels ??
                processedBuffer.numberOfChannels
            const targetSampleRate =
                decodingOptions?.targetSampleRate ?? processedBuffer.sampleRate

            // Create offline context for resampling if needed
            if (targetSampleRate !== originalSampleRate) {
                const offlineCtx = new OfflineAudioContext(
                    targetChannels,
                    (length * targetSampleRate) / originalSampleRate,
                    targetSampleRate
                )
                const source = offlineCtx.createBufferSource()
                source.buffer = processedBuffer
                source.connect(offlineCtx.destination)
                source.start()
                processedBuffer = await offlineCtx.startRendering()
            }

            // Convert to the desired format
            const newLength = processedBuffer.length
            let wavBuffer: Float32Array | Int16Array | Int8Array

            // Create appropriate buffer based on target bit depth
            switch (decodingOptions?.targetBitDepth) {
                case 16:
                    wavBuffer = new Int16Array(newLength * targetChannels)
                    break
                case 8:
                    wavBuffer = new Int8Array(newLength * targetChannels)
                    break
                case 32:
                default:
                    wavBuffer = new Float32Array(newLength * targetChannels)
                    break
            }

            // Interleave channels and handle bit depth conversion
            const numChannels = Math.min(
                processedBuffer.numberOfChannels,
                targetChannels
            )
            for (let channel = 0; channel < numChannels; channel++) {
                const channelData = processedBuffer.getChannelData(channel)
                for (let i = 0; i < newLength; i++) {
                    let sample = channelData[i]

                    // Normalize if requested
                    if (decodingOptions?.normalizeAudio) {
                        sample = Math.max(-1, Math.min(1, sample))
                    }

                    // Convert sample based on target bit depth
                    if (decodingOptions?.targetBitDepth === 16) {
                        sample = sample * 32767 // Convert to 16-bit range
                    } else if (decodingOptions?.targetBitDepth === 8) {
                        sample = sample * 127 // Convert to 8-bit range
                    }

                    wavBuffer[i * targetChannels + channel] = sample
                }
            }

            // Pass the duration to extractAudioAnalysis
            return await extractAudioAnalysis({
                arrayBuffer: wavBuffer.buffer as ArrayBuffer,
                bitDepth: decodingOptions?.targetBitDepth ?? 32,
                skipWavHeader: true,
                sampleRate: targetSampleRate,
                numberOfChannels: targetChannels,
                durationMs: effectiveDurationMs,
                ...restProps,
            })
        } catch (error) {
            console.error('Failed to process audio:', error)
            throw error
        }
    } else {
        // For native platforms, pass through all options
        return await extractAudioAnalysis({
            fileUri,
            decodingOptions,
            ...restProps,
        })
    }
}

export const extractAudioAnalysis = async ({
    fileUri,
    pointsPerSecond = 20,
    arrayBuffer,
    bitDepth,
    skipWavHeader = true,
    durationMs,
    sampleRate,
    numberOfChannels,
    features,
    featuresExtratorUrl,
    logger,
    position = 0,
    length,
}: ExtractAudioAnalysisProps): Promise<AudioAnalysis> => {
    if (isWeb) {
        if (!arrayBuffer && !fileUri) {
            throw new Error('Either arrayBuffer or fileUri must be provided')
        }

        if (!arrayBuffer) {
            logger?.log(`fetching fileUri`, fileUri)
            const response = await fetch(fileUri!)

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch fileUri: ${response.statusText}`
                )
            }

            arrayBuffer = await response.arrayBuffer()
            logger?.log(`fetched fileUri`, arrayBuffer.byteLength, arrayBuffer)
        }

        // Create a new copy of the ArrayBuffer to avoid detachment issues
        const bufferCopy = arrayBuffer.slice(0)
        logger?.log(
            `extractAudioAnalysis skipWavHeader=${skipWavHeader} bitDepth=${bitDepth} len=${bufferCopy.byteLength}`,
            bufferCopy.slice(0, 100)
        )

        let actualBitDepth = bitDepth
        if (!actualBitDepth) {
            logger?.log(
                `extractAudioAnalysis bitDepth not provided -- getting wav file info`
            )
            const fileInfo = await getWavFileInfo(bufferCopy)
            actualBitDepth = fileInfo.bitDepth
        }
        logger?.log(`extractAudioAnalysis actualBitDepth=${actualBitDepth}`)

        const {
            pcmValues: channelData,
            min,
            max,
        } = await convertPCMToFloat32({
            buffer: arrayBuffer,
            bitDepth: actualBitDepth,
            skipWavHeader,
        })
        logger?.log(
            `extractAudioAnalysis skipWaveHeader=${skipWavHeader} convertPCMToFloat32 length=${channelData.length} range: [ ${min} :: ${max} ]`
        )

        // Apply position and length constraints to channelData if specified
        const startIndex = position
        const endIndex = length ? startIndex + length : channelData.length
        const constrainedChannelData = channelData.slice(startIndex, endIndex)

        return new Promise((resolve, reject) => {
            let worker: Worker
            if (featuresExtratorUrl) {
                worker = new Worker(
                    new URL(featuresExtratorUrl, window.location.href)
                )
            } else {
                const blob = new Blob([InlineFeaturesExtractor], {
                    type: 'application/javascript',
                })
                const url = URL.createObjectURL(blob)
                worker = new Worker(url)
            }

            worker.onmessage = (event) => {
                resolve(event.data.result)
            }

            worker.onerror = (error) => {
                reject(error)
            }

            worker.postMessage({
                command: 'process',
                channelData: constrainedChannelData,
                sampleRate,
                pointsPerSecond,
                bitDepth,
                fullAudioDurationMs: durationMs,
                numberOfChannels,
            })
        })
    } else {
        if (!fileUri) {
            throw new Error('fileUri is required')
        }
        logger?.log(`extractAudioAnalysis`, {
            fileUri,
            pointsPerSecond,
        })
        const res = await ExpoAudioStreamModule.extractAudioAnalysis({
            fileUri,
            pointsPerSecond,
            skipWavHeader,
            features,
            position,
            length,
        })
        logger?.log(`extractAudioAnalysis`, res)
        return res
    }
}

export async function extractPreview({
    fileUri,
    numberOfPoints,
    startTime,
    endTime,
    decodingOptions,
}: PreviewOptions): Promise<AudioPreview> {
    if (isWeb) {
        // For web, we can reuse the existing extractAudioFromAnyFormat with modified parameters
        const analysis = await extractAudioFromAnyFormat({
            fileUri,
            decodingOptions,
            startTime, // Pass startTime
            endTime, // Pass endTime
            pointsPerSecond:
                (numberOfPoints ?? 100) /
                ((endTime ? endTime - (startTime || 0) : 1000) / 1000), // Adjust points per second calculation
        })

        // Convert AudioAnalysis to AudioPreview format and adjust duration
        return {
            pointsPerSecond: analysis.pointsPerSecond,
            durationMs: endTime
                ? endTime - (startTime || 0)
                : analysis.durationMs, // Use range duration if specified
            amplitudeRange: analysis.amplitudeRange,
            dataPoints: analysis.dataPoints.map((point) => ({
                id: point.id,
                amplitude: point.amplitude,
                rms: point.rms,
                startTime: point.startTime,
                endTime: point.endTime,
                dB: point.dB,
                silent: point.silent,
            })),
        }
    }

    return await ExpoAudioStreamModule.extractPreview({
        fileUri,
        numberOfPoints,
        startTime,
        endTime,
        decodingOptions,
    })
}

export interface ExtractFullFileFeaturesProps {
    fileUri: string
    decodingOptions?: DecodingConfig
}

// Add new function
export async function extractFullFileFeatures({
    fileUri,
    decodingOptions = {
        targetSampleRate: 16000,
        targetChannels: 1,
        targetBitDepth: 16,
        normalizeAudio: false,
    },
}: ExtractFullFileFeaturesProps): Promise<AudioFeatures> {
    if (isWeb) {
        try {
            // For web, we'll use the existing extractAudioFromAnyFormat
            // but process the entire file at once
            const audioAnalysis = await extractAudioFromAnyFormat({
                fileUri,
                decodingOptions,
                // Set specific options for full file processing
                pointsPerSecond: 1, // We only need one point for the entire file
                features: {
                    energy: true,
                    mfcc: true,
                    rms: true,
                    zcr: true,
                    spectralCentroid: true,
                    spectralFlatness: true,
                    spectralRolloff: true,
                    spectralBandwidth: true,
                    chromagram: true,
                    tempo: true,
                    hnr: true,
                    melSpectrogram: true,
                    spectralContrast: true,
                    tonnetz: true,
                },
            })

            // Convert AudioAnalysis to AudioFeatures format
            return {
                energy: audioAnalysis.dataPoints[0]?.features?.energy ?? 0,
                mfcc: audioAnalysis.dataPoints[0]?.features?.mfcc ?? [],
                rms: audioAnalysis.dataPoints[0]?.features?.rms ?? 0,
                minAmplitude: audioAnalysis.amplitudeRange.min,
                maxAmplitude: audioAnalysis.amplitudeRange.max,
                zcr: audioAnalysis.dataPoints[0]?.features?.zcr ?? 0,
                spectralCentroid:
                    audioAnalysis.dataPoints[0]?.features?.spectralCentroid ??
                    0,
                spectralFlatness:
                    audioAnalysis.dataPoints[0]?.features?.spectralFlatness ??
                    0,
                spectralRolloff:
                    audioAnalysis.dataPoints[0]?.features?.spectralRolloff ?? 0,
                spectralBandwidth:
                    audioAnalysis.dataPoints[0]?.features?.spectralBandwidth ??
                    0,
                chromagram:
                    audioAnalysis.dataPoints[0]?.features?.chromagram ?? [],
                tempo: audioAnalysis.dataPoints[0]?.features?.tempo ?? 0,
                hnr: audioAnalysis.dataPoints[0]?.features?.hnr ?? 0,
                melSpectrogram:
                    audioAnalysis.dataPoints[0]?.features?.melSpectrogram ?? [],
                spectralContrast:
                    audioAnalysis.dataPoints[0]?.features?.spectralContrast ??
                    [],
                tonnetz: audioAnalysis.dataPoints[0]?.features?.tonnetz ?? [],
                pitch: audioAnalysis.dataPoints[0]?.features?.pitch ?? 0,
                dataChecksum:
                    audioAnalysis.dataPoints[0]?.features?.dataChecksum ?? 0,
            }
        } catch (error) {
            console.error('Failed to extract full file features:', error)
            throw error
        }
    } else {
        return await ExpoAudioStreamModule.extractFullFileFeatures({
            fileUri,
            decodingOptions,
        })
    }
}
