// packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts
import { ConsoleLike } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import { processAudioBuffer } from '../utils/audioProcessing'
import { convertPCMToFloat32 } from '../utils/convertPCMToFloat32'
import { getWavFileInfo, WavFileInfo } from '../utils/getWavFileInfo'
import { InlineFeaturesExtractor } from '../workers/InlineFeaturesExtractor.web'
import {
    AudioAnalysis,
    AudioFeatures,
    AudioFeaturesOptions,
    AudioPreview,
    DataPoint,
    DecodingConfig,
    PreviewOptions,
} from './AudioAnalysis.types'

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

export interface ExtractAudioAnalysisProps
    extends ExtractWavAudioAnalysisProps {
    mimeType?: string
    startTimeMs?: number
    endTimeMs?: number
}

export async function extractAudioAnalysis(
    props: ExtractAudioAnalysisProps
): Promise<AudioAnalysis> {
    const {
        fileUri,
        arrayBuffer,
        decodingOptions,
        logger,
        segmentDurationMs = 100, // Default to 100ms
    } = props
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
                sampleRate: decodingOptions?.targetSampleRate ?? 16000,
            })

            // Decode the audio data
            const decodedAudioBuffer =
                await audioContext.decodeAudioData(audioBuffer)

            // Use shared processing function
            const processedBuffer = await processAudioBuffer({
                buffer: decodedAudioBuffer,
                targetSampleRate: decodingOptions?.targetSampleRate ?? 16000,
                targetChannels: decodingOptions?.targetChannels ?? 1,
                normalizeAudio: decodingOptions?.normalizeAudio ?? false,
            })

            // Convert to Float32Array for analysis
            const channelData = processedBuffer.getChannelData(0)

            // Calculate amplitude range
            let min = Infinity
            let max = -Infinity
            for (let i = 0; i < channelData.length; i++) {
                min = Math.min(min, channelData[i])
                max = Math.max(max, channelData[i])
            }

            // Calculate points per second based on the segment duration in milliseconds
            const durationSec = processedBuffer.duration
            const durationMs = durationSec * 1000

            // Generate data points - divide total duration in ms by segment duration in ms
            const numPoints = Math.floor(durationMs / segmentDurationMs)
            const samplesPerPoint = Math.floor(channelData.length / numPoints)
            const dataPoints: DataPoint[] = []

            for (let i = 0; i < numPoints; i++) {
                const startIdx = i * samplesPerPoint
                const endIdx = Math.min(
                    (i + 1) * samplesPerPoint,
                    channelData.length
                )

                let sum = 0
                let maxAmp = 0
                for (let j = startIdx; j < endIdx; j++) {
                    sum += Math.abs(channelData[j])
                    maxAmp = Math.max(maxAmp, Math.abs(channelData[j]))
                }

                const rms = Math.sqrt(sum / samplesPerPoint)

                dataPoints.push({
                    id: i,
                    amplitude: maxAmp,
                    rms,
                    startTime: i * segmentDurationMs,
                    endTime: (i + 1) * segmentDurationMs,
                    dB: 20 * Math.log10(rms + 1e-6),
                    silent: rms < 0.01,
                })
            }

            // After generating points
            logger?.log('Generated points:', {
                segmentDurationMs,
                actualPoints: dataPoints.length,
                samplesPerPoint,
                totalSamples: channelData.length,
            })

            return {
                bitDepth: decodingOptions?.targetBitDepth ?? 32,
                samples: channelData.length,
                numberOfChannels: processedBuffer.numberOfChannels,
                sampleRate: processedBuffer.sampleRate,
                segmentDurationMs,
                durationMs,
                dataPoints,
                amplitudeRange: { min, max },
                rmsRange: {
                    min: 0,
                    max: Math.max(Math.abs(min), Math.abs(max)),
                },
            }
        } catch (error) {
            console.error('Failed to process audio:', error)
            throw error
        }
    } else {
        // For native platforms, pass through all options
        return await ExpoAudioStreamModule.extractAudioAnalysis(props)
    }
}

export const extractWavAudioAnalysis = async ({
    fileUri,
    segmentDurationMs = 100, // Default to 100ms
    arrayBuffer,
    bitDepth,
    durationMs,
    sampleRate,
    numberOfChannels,
    features,
    featuresExtratorUrl,
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
                segmentDurationMs,
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

export async function extractPreview({
    fileUri,
    numberOfPoints,
    startTimeMs,
    logger,
    endTimeMs,
    decodingOptions,
}: PreviewOptions): Promise<AudioPreview> {
    if (isWeb) {
        // Get the actual duration first to calculate points per second correctly
        const audioCTX = new AudioContext({ sampleRate: 16000 })
        const response = await fetch(fileUri)
        const arrayBuffer = await response.arrayBuffer()
        const decoded = await audioCTX.decodeAudioData(arrayBuffer.slice(0))

        // Use actual duration instead of default 1000ms
        const effectiveDurationMs = endTimeMs
            ? endTimeMs - (startTimeMs || 0)
            : decoded.duration * 1000 // Use full duration if no trim

        const pointsPerSecond =
            (numberOfPoints ?? 100) / (effectiveDurationMs / 1000)

        logger?.log('Preview extraction:', {
            effectiveDurationMs,
            numberOfPoints,
            calculatedPointsPerSecond: pointsPerSecond,
        })

        const analysis = await extractAudioAnalysis({
            fileUri,
            decodingOptions,
            startTimeMs,
            endTimeMs,
            logger,
            segmentDurationMs: pointsPerSecond,
        })

        logger?.log('Preview result:', {
            requestedPoints: numberOfPoints,
            actualPoints: analysis.dataPoints.length,
        })

        // Adjust timestamps relative to the trimmed range
        const timeOffset = startTimeMs || 0
        return {
            pointsPerSecond: analysis.segmentDurationMs,
            durationMs: effectiveDurationMs,
            amplitudeRange: analysis.amplitudeRange,
            dataPoints: analysis.dataPoints.map((point) => ({
                id: point.id,
                amplitude: point.amplitude,
                rms: point.rms,
                startTime: point.startTime
                    ? point.startTime - timeOffset
                    : undefined,
                endTime: point.endTime ? point.endTime - timeOffset : undefined,
                dB: point.dB,
                silent: point.silent,
            })),
        }
    }

    logger?.log('extractPreview', {
        fileUri,
        numberOfPoints,
        startTimeMs,
        endTimeMs,
        decodingOptions,
    })

    return await ExpoAudioStreamModule.extractPreview({
        fileUri,
        numberOfPoints,
        startTimeMs,
        endTimeMs,
        decodingOptions,
    })
}
