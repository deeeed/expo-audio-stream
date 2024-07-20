// packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import { getLogger } from '../logger'
import { convertPCMToFloat32 } from '../utils/convertPCMToFloat32'
import { getWavFileInfo, WavFileInfo } from '../utils/getWavFileInfo'
import { InlineFeaturesExtractor } from '../workers/InlineFeaturesExtractor.web'
import { AudioAnalysis, AudioFeaturesOptions } from './AudioAnalysis.types'

const logger = getLogger('extractAudioAnalysis')

export interface ExtractAudioAnalysisProps {
    fileUri?: string // should provide either fileUri or arrayBuffer
    wavMetadata?: WavFileInfo
    arrayBuffer?: ArrayBuffer
    bitDepth?: number
    skipWavHeader?: boolean
    durationMs?: number
    sampleRate?: number
    numberOfChannels?: number
    algorithm?: 'peak' | 'rms'
    position?: number // Optional number of bytes to skip. Default is 0
    length?: number // Optional number of bytes to read.
    pointsPerSecond?: number // Optional number of points per second. Use to reduce the number of points and compute the number of datapoints to return.
    features?: AudioFeaturesOptions
    featuresExtratorUrl?: string
}

export const extractAudioAnalysis = async ({
    fileUri,
    pointsPerSecond = 20,
    arrayBuffer,
    bitDepth,
    skipWavHeader,
    durationMs,
    sampleRate,
    numberOfChannels,
    algorithm = 'rms',
    features,
    featuresExtratorUrl,
}: ExtractAudioAnalysisProps): Promise<AudioAnalysis> => {
    if (isWeb) {
        if (!arrayBuffer && !fileUri) {
            throw new Error('Either arrayBuffer or fileUri must be provided')
        }

        if (!arrayBuffer) {
            logger.log(`fetching fileUri`, fileUri)
            const response = await fetch(fileUri!)

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch fileUri: ${response.statusText}`
                )
            }

            arrayBuffer = (await response.arrayBuffer()).slice(0)
            logger.log(`fetched fileUri`, arrayBuffer.byteLength, arrayBuffer)
        }

        // Create a new copy of the ArrayBuffer to avoid detachment issues
        const bufferCopy = arrayBuffer.slice(0)
        logger.log(
            `extractAudioAnalysis skipWavHeader=${skipWavHeader} bitDepth=${bitDepth} len=${bufferCopy.byteLength}`,
            bufferCopy.slice(0, 100)
        )

        let actualBitDepth = bitDepth
        if (!actualBitDepth) {
            logger.log(
                `extractAudioAnalysis bitDepth not provided -- getting wav file info`
            )
            const fileInfo = await getWavFileInfo(bufferCopy)
            actualBitDepth = fileInfo.bitDepth
        }
        logger.log(`extractAudioAnalysis actualBitDepth=${actualBitDepth}`)

        const {
            pcmValues: channelData,
            min,
            max,
        } = convertPCMToFloat32({
            buffer: arrayBuffer,
            bitDepth: actualBitDepth,
            skipWavHeader,
        })
        logger.log(
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
        logger.log(`extractAudioAnalysis`, {
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
        logger.log(`extractAudioAnalysis`, res)
        return res
    }
}
