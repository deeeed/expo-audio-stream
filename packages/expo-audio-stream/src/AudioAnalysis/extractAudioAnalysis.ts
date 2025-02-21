// packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts
import { ConsoleLike } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import {
    AudioAnalysis,
    AudioFeatures,
    AudioFeaturesOptions,
    AudioPreview,
    DataPoint,
    DecodingConfig,
    PreviewOptions,
} from './AudioAnalysis.types'
import { processAudioBuffer } from '../utils/audioProcessing'
import { convertPCMToFloat32 } from '../utils/convertPCMToFloat32'
import { getWavFileInfo, WavFileInfo } from '../utils/getWavFileInfo'
import { InlineFeaturesExtractor } from '../workers/InlineFeaturesExtractor.web'

export interface ExtractAudioAnalysisProps {
    fileUri?: string // should provide either fileUri or arrayBuffer
    wavMetadata?: WavFileInfo
    arrayBuffer?: ArrayBuffer
    bitDepth?: number
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
    startTimeMs?: number
    endTimeMs?: number
}

export async function extractAudioFromAnyFormat({
    fileUri,
    arrayBuffer,
    mimeType,
    decodingOptions,
    startTimeMs,
    logger,
    endTimeMs,
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

            // Calculate points per second based on the number of points requested
            const durationSec = processedBuffer.duration
            const requestedPointsPerSecond = restProps.pointsPerSecond ?? 20
            logger?.log('Audio analysis:', {
                durationSec,
                requestedPointsPerSecond,
                expectedPoints: Math.floor(
                    durationSec * requestedPointsPerSecond
                ),
            })

            // Generate data points
            const numPoints = Math.floor(durationSec * requestedPointsPerSecond)
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
                    startTime: (i / requestedPointsPerSecond) * 1000,
                    endTime: ((i + 1) / requestedPointsPerSecond) * 1000,
                    dB: 20 * Math.log10(rms + 1e-6),
                    silent: rms < 0.01,
                })
            }

            // After generating points
            logger?.log('Generated points:', {
                requestedPointsPerSecond,
                actualPoints: dataPoints.length,
                samplesPerPoint,
                totalSamples: channelData.length,
            })

            return {
                bitDepth: decodingOptions?.targetBitDepth ?? 32,
                samples: channelData.length,
                numberOfChannels: processedBuffer.numberOfChannels,
                sampleRate: processedBuffer.sampleRate,
                pointsPerSecond: requestedPointsPerSecond,
                durationMs: processedBuffer.duration * 1000,
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

        const analysis = await extractAudioFromAnyFormat({
            fileUri,
            decodingOptions,
            startTimeMs,
            endTimeMs,
            logger,
            pointsPerSecond,
        })

        logger?.log('Preview result:', {
            requestedPoints: numberOfPoints,
            actualPoints: analysis.dataPoints.length,
        })

        // Adjust timestamps relative to the trimmed range
        const timeOffset = startTimeMs || 0
        return {
            pointsPerSecond: analysis.pointsPerSecond,
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
