// packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts
/**
 * This module provides functions for extracting and analyzing audio data.
 * - `extractAudioAnalysis`: For detailed analysis with customizable ranges and decoding options.
 * - `extractWavAudioAnalysis`: For analyzing WAV files without decoding, preserving original PCM values.
 * - `extractPreview`: For generating quick previews of audio waveforms, optimized for UI rendering.
 */
import { ConsoleLike } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import {
    AudioAnalysis,
    AudioFeaturesOptions,
    DataPoint,
    DecodingConfig,
} from './AudioAnalysis.types'
import { processAudioBuffer } from '../utils/audioProcessing'
import { convertPCMToFloat32 } from '../utils/convertPCMToFloat32'
import crc32 from '../utils/crc32'
import { getWavFileInfo, WavFileInfo } from '../utils/getWavFileInfo'
import { InlineFeaturesExtractor } from '../workers/InlineFeaturesExtractor.web'

function calculateCRC32ForDataPoint(data: Float32Array): number {
    // Convert float array to byte array for CRC32
    const byteArray = new Uint8Array(data.length * 4)
    const dataView = new DataView(byteArray.buffer)

    for (let i = 0; i < data.length; i++) {
        dataView.setFloat32(i * 4, data[i], true)
    }

    return crc32.buf(byteArray)
}

export interface ExtractWavAudioAnalysisProps {
    fileUri?: string // should provide either fileUri or arrayBuffer
    wavMetadata?: WavFileInfo
    arrayBuffer?: ArrayBuffer
    bitDepth?: number
    durationMs?: number
    sampleRate?: number
    numberOfChannels?: number
    position?: number // Optional number of bytes to skip. Default is 0
    length?: number // Optional number of bytes to read.
    segmentDurationMs?: number // Optional number of points per second. Use to reduce the number of points and compute the number of datapoints to return.
    features?: AudioFeaturesOptions
    featuresExtratorUrl?: string
    logger?: ConsoleLike
    decodingOptions?: DecodingConfig
}

// Define base options interface with common properties
interface BaseExtractOptions {
    fileUri?: string
    arrayBuffer?: ArrayBuffer
    /**
     * Duration of each analysis segment in milliseconds. Defaults to 100ms if not specified.
     */
    segmentDurationMs?: number
    features?: AudioFeaturesOptions
    decodingOptions?: DecodingConfig
    logger?: ConsoleLike
}

// Time-based range options
interface TimeRangeOptions extends BaseExtractOptions {
    startTimeMs?: number
    endTimeMs?: number
    position?: never
    length?: never
}

// Byte-based range options
interface ByteRangeOptions extends BaseExtractOptions {
    position?: number
    length?: number
    startTimeMs?: never
    endTimeMs?: never
}

/**
 * Options for extracting audio analysis.
 * - For time-based analysis, provide `startTimeMs` and `endTimeMs`.
 * - For byte-based analysis, provide `position` and `length`.
 * - Do not mix time and byte ranges.
 */
export type ExtractAudioAnalysisProps = TimeRangeOptions | ByteRangeOptions

/**
 * Extracts detailed audio analysis from the specified audio file or buffer.
 * Supports either time-based or byte-based ranges for flexibility in analysis.
 *
 * @param props - The options for extraction, including file URI, ranges, and decoding settings.
 * @returns A promise that resolves to the audio analysis data.
 * @throws {Error} If both time and byte ranges are provided or if required parameters are missing.
 */
export async function extractAudioAnalysis(
    props: ExtractAudioAnalysisProps
): Promise<AudioAnalysis> {
    const {
        fileUri,
        arrayBuffer,
        decodingOptions,
        logger,
        segmentDurationMs = 100,
        features,
    } = props

    if (isWeb) {
        try {
            // Create AudioContext here
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)({
                sampleRate: decodingOptions?.targetSampleRate ?? 16000,
            })

            try {
                const processedBuffer = await processAudioBuffer({
                    arrayBuffer,
                    fileUri,
                    targetSampleRate:
                        decodingOptions?.targetSampleRate ?? 16000,
                    targetChannels: decodingOptions?.targetChannels ?? 1,
                    normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                    startTimeMs:
                        'startTimeMs' in props ? props.startTimeMs : undefined,
                    endTimeMs:
                        'endTimeMs' in props ? props.endTimeMs : undefined,
                    position: 'position' in props ? props.position : undefined,
                    length: 'length' in props ? props.length : undefined,
                    audioContext, // Pass the context we created
                    logger,
                })

                const channelData = processedBuffer.buffer.getChannelData(0)

                // Create and initialize the worker
                const blob = new Blob([InlineFeaturesExtractor], {
                    type: 'application/javascript',
                })
                const workerUrl = URL.createObjectURL(blob)
                const worker = new Worker(workerUrl)

                return new Promise((resolve, reject) => {
                    worker.onmessage = (event) => {
                        if (event.data.error) {
                            reject(new Error(event.data.error))
                            return
                        }

                        const result: AudioAnalysis = event.data.result
                        // Calculate CRC32 after worker completes if requested
                        if (features?.crc32) {
                            const samplesPerSegment = Math.floor(
                                (processedBuffer.sampleRate *
                                    segmentDurationMs) /
                                    1000
                            )

                            result.dataPoints = result.dataPoints.map(
                                (point: DataPoint, index: number) => {
                                    const startSample =
                                        index * samplesPerSegment
                                    const segmentData = channelData.slice(
                                        startSample,
                                        startSample + samplesPerSegment
                                    )

                                    return {
                                        ...point,
                                        features: {
                                            ...point.features,
                                            crc32: calculateCRC32ForDataPoint(
                                                segmentData
                                            ),
                                        },
                                    }
                                }
                            )
                        }

                        URL.revokeObjectURL(workerUrl)
                        worker.terminate()
                        resolve(result)
                    }

                    worker.onerror = (error) => {
                        URL.revokeObjectURL(workerUrl)
                        worker.terminate()
                        reject(error)
                    }

                    worker.postMessage({
                        channelData,
                        sampleRate: processedBuffer.sampleRate,
                        segmentDurationMs,
                        bitDepth: decodingOptions?.targetBitDepth ?? 32,
                        numberOfChannels: processedBuffer.channels,
                        fullAudioDurationMs: processedBuffer.durationMs,
                        // enableLogging: !!logger,
                        features,
                    })
                })
            } finally {
                await audioContext.close()
            }
        } catch (error) {
            logger?.error('Failed to process audio:', error)
            throw error
        }
    } else {
        return await ExpoAudioStreamModule.extractAudioAnalysis(props)
    }
}

/**
 * Analyzes WAV files without decoding, preserving original PCM values.
 * Use this function when you need to ensure the analysis matches other software by avoiding any transformations.
 *
 * @param props - The options for WAV analysis, including file URI and range.
 * @returns A promise that resolves to the audio analysis data.
 */
export const extractRawWavAnalysis = async ({
    fileUri,
    segmentDurationMs = 100, // Default to 100ms
    arrayBuffer,
    bitDepth,
    durationMs,
    sampleRate,
    numberOfChannels,
    features,
    logger,
    position = 0,
    length,
}: ExtractWavAudioAnalysisProps): Promise<AudioAnalysis> => {
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
            `extractAudioAnalysis bitDepth=${bitDepth} len=${bufferCopy.byteLength}`,
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
        })
        logger?.log(
            `extractAudioAnalysis convertPCMToFloat32 length=${channelData.length} range: [ ${min} :: ${max} ]`
        )

        // Apply position and length constraints to channelData if specified
        const startIndex = position
        const endIndex = length ? startIndex + length : channelData.length
        const constrainedChannelData = channelData.slice(startIndex, endIndex)

        return new Promise((resolve, reject) => {
            const blob = new Blob([InlineFeaturesExtractor], {
                type: 'application/javascript',
            })
            const url = URL.createObjectURL(blob)
            const worker = new Worker(url)

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
                segmentDurationMs,
                logger,
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
            segmentDurationMs,
        })
        const res = await ExpoAudioStreamModule.extractAudioAnalysis({
            fileUri,
            segmentDurationMs,
            features,
            position,
            length,
        })
        logger?.log(`extractAudioAnalysis`, res)
        return res
    }
}
