/**
 * @experimental This feature is experimental and currently only available on Android.
 * The API may change in future versions. The web implementation is a placeholder.
 */

import { ExpoAudioStreamModule } from '..'
import { isWeb } from '../constants'
import {
    ExtractMelSpectrogramOptions,
    MelSpectrogram,
} from './AudioAnalysis.types'
import {
    processAudioBuffer,
    ProcessedAudioData,
} from '../utils/audioProcessing'

/**
 * Extracts a mel spectrogram from audio data
 *
 * @experimental This feature is experimental and currently only available on Android.
 * The iOS implementation will throw an "UNSUPPORTED_PLATFORM" error.
 * The web implementation is a placeholder that returns dummy data.
 */
export async function extractMelSpectrogram(
    options: ExtractMelSpectrogramOptions
): Promise<MelSpectrogram> {
    const {
        fileUri,
        arrayBuffer,
        windowSizeMs,
        hopLengthMs,
        nMels,
        fMin = 0,
        fMax,
        windowType = 'hann',
        normalize = false,
        logScale = true,
        decodingOptions,
        startTimeMs,
        endTimeMs,
        logger,
    } = options

    if (isWeb) {
        // Create audio context
        const audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)()

        try {
            // Process audio data using the existing utility
            const processedAudio: ProcessedAudioData = await processAudioBuffer(
                {
                    arrayBuffer,
                    fileUri,
                    targetSampleRate:
                        decodingOptions?.targetSampleRate || 16000,
                    targetChannels: decodingOptions?.targetChannels || 1,
                    normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                    startTimeMs,
                    endTimeMs,
                    audioContext,
                    logger: options.logger,
                }
            )

            // Calculate window and hop size in samples
            const sampleRate = processedAudio.sampleRate
            const windowSize = Math.floor((windowSizeMs * sampleRate) / 1000)
            const hopLength = Math.floor((hopLengthMs * sampleRate) / 1000)
            const maxFreq = fMax || sampleRate / 2

            // Extract the mel spectrogram from the processed audio
            const spectrogram = computeMelSpectrogram(
                processedAudio.channelData,
                sampleRate,
                nMels,
                windowSize,
                hopLength,
                fMin,
                maxFreq,
                windowType,
                normalize,
                logScale
            )

            const timeSteps = spectrogram.length

            return {
                spectrogram,
                sampleRate,
                nMels,
                timeSteps,
                durationMs: processedAudio.durationMs,
            }
        } catch (error) {
            logger?.error('Error extracting mel spectrogram:', error)
            throw error
        } finally {
            // Close the audio context
            await audioContext.close()
        }
    }
    return ExpoAudioStreamModule.extractMelSpectrogram(options)
}

/**
 * Computes a mel spectrogram from audio data
 *
 * @experimental This is a placeholder implementation that returns dummy data.
 * The actual implementation will be added in a future version.
 */
function computeMelSpectrogram(
    audioData: Float32Array,
    sampleRate: number,
    nMels: number,
    windowSize: number,
    hopLength: number,
    fMin: number,
    fMax: number,
    windowType: 'hann' | 'hamming',
    normalize: boolean,
    logScale: boolean
): number[][] {
    // Placeholder for the actual implementation
    // This would include:
    // 1. Windowing the audio data using the specified window type
    // 2. Computing the STFT (Short-Time Fourier Transform)
    // 3. Converting to power spectrogram
    // 4. Applying mel filterbanks
    // 5. Taking the logarithm if logScale is true
    // 6. Normalizing if normalize is true

    // For now, return a dummy implementation
    const numFrames =
        Math.floor((audioData.length - windowSize) / hopLength) + 1
    const spectrogram: number[][] = []

    // Create dummy mel spectrogram data
    for (let i = 0; i < numFrames; i++) {
        spectrogram.push(Array(nMels).fill(0))
    }

    return spectrogram
}
