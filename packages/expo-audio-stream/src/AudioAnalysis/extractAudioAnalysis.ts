// packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts
import { ConsoleLike } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import {
    AmplitudeAlgorithm,
    AudioAnalysis,
    AudioFeaturesOptions,
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
    algorithm?: AmplitudeAlgorithm
    position?: number // Optional number of bytes to skip. Default is 0
    length?: number // Optional number of bytes to read.
    pointsPerSecond?: number // Optional number of points per second. Use to reduce the number of points and compute the number of datapoints to return.
    features?: AudioFeaturesOptions
    featuresExtratorUrl?: string
    logger?: ConsoleLike
    decodingOptions?: DecodingConfig
}

// Add DecodingConfig interface to match native implementation
export interface DecodingConfig {
    targetSampleRate?: number
    targetChannels?: number
    targetBitDepth?: number
    normalizeAudio?: boolean
}

export interface ExtractAudioFromAnyFormatProps
    extends ExtractAudioAnalysisProps {
    mimeType?: string
    decodingOptions?: DecodingConfig
}

export async function extractAudioFromAnyFormat({
    fileUri,
    arrayBuffer,
    mimeType,
    decodingOptions,
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

            // Get original properties
            const originalChannels = decodedAudioBuffer.numberOfChannels
            const originalSampleRate = decodedAudioBuffer.sampleRate
            const length = decodedAudioBuffer.length

            // Determine target format
            const targetChannels =
                decodingOptions?.targetChannels ?? originalChannels
            const targetSampleRate =
                decodingOptions?.targetSampleRate ?? originalSampleRate

            // Create offline context for resampling if needed
            let processedBuffer = decodedAudioBuffer
            if (targetSampleRate !== originalSampleRate) {
                const offlineCtx = new OfflineAudioContext(
                    targetChannels,
                    (length * targetSampleRate) / originalSampleRate,
                    targetSampleRate
                )
                const source = offlineCtx.createBufferSource()
                source.buffer = decodedAudioBuffer
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

            // Now call the original extractAudioAnalysis with the processed data
            return await extractAudioAnalysis({
                arrayBuffer: wavBuffer.buffer as ArrayBuffer,
                bitDepth: decodingOptions?.targetBitDepth ?? 32,
                skipWavHeader: true,
                sampleRate: targetSampleRate,
                numberOfChannels: targetChannels,
                ...restProps,
            })
        } catch (error) {
            console.error('Failed to process audio:', error)
            throw error
        }
    } else {
        // For native platforms, pass through the decodingOptions
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
    algorithm = 'rms',
    features,
    featuresExtratorUrl,
    logger,
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
                channelData,
                sampleRate,
                pointsPerSecond,
                algorithm,
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
            algorithm,
        })
        const res = await ExpoAudioStreamModule.extractAudioAnalysis({
            fileUri,
            pointsPerSecond,
            skipWavHeader,
            algorithm,
            features,
        })
        logger?.log(`extractAudioAnalysis`, res)
        return res
    }
}
