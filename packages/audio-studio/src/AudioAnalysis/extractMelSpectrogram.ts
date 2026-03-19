/**
 * @experimental This feature is experimental and currently only available on Android.
 * The API may change in future versions.
 */

import { AudioStudioModule } from '..'
import { isWeb } from '../constants'
import {
    ExtractMelSpectrogramOptions,
    MelSpectrogram,
} from './AudioAnalysis.types'
import {
    processAudioBuffer,
    ProcessedAudioData,
} from '../utils/audioProcessing'
import { cleanNativeOptions } from '../utils/cleanNativeOptions'
import { computeMelSpectrogramWasm } from './melSpectrogramWasm'

/**
 * Maximum duration in milliseconds that extractMelSpectrogram will process in a single call.
 * The C++ core requires the entire trimmed range as a contiguous float array in memory,
 * so this bound prevents OOM on all platforms. Callers needing longer ranges can iterate
 * in windows of this size using startTimeMs/endTimeMs.
 */
export const MAX_DURATION_MS = 30_000

/**
 * Extracts a mel spectrogram from audio data
 *
 * @experimental This feature is experimental.
 * Uses shared C++ implementation on all platforms (native on iOS/Android, WASM on web).
 */
export async function extractMelSpectrogram(
    options: ExtractMelSpectrogramOptions
): Promise<MelSpectrogram> {
    let {
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

    // Apply max duration guard
    if (startTimeMs == null && endTimeMs == null) {
        startTimeMs = 0
        endTimeMs = MAX_DURATION_MS
        logger?.warn?.(
            `extractMelSpectrogram: no time range specified, defaulting to 0–${MAX_DURATION_MS}ms`
        )
    } else {
        const start = startTimeMs ?? 0
        const end = endTimeMs ?? start + MAX_DURATION_MS
        if (end - start > MAX_DURATION_MS) {
            endTimeMs = start + MAX_DURATION_MS
            logger?.warn?.(
                `extractMelSpectrogram: requested range ${end - start}ms exceeds max ${MAX_DURATION_MS}ms, clamping endTimeMs to ${endTimeMs}`
            )
        }
    }

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

            // Extract the mel spectrogram via WASM (same C++ as native)
            const spectrogram = await computeMelSpectrogramWasm(
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
    // Strip logger/arrayBuffer (non-serializable) then clean undefined values
    // to avoid Android "Cannot convert '[object Object]' to Kotlin type" crash
    const {
        logger: _logger,
        arrayBuffer: _arrayBuffer,
        ...nativeOptions
    } = options
    return AudioStudioModule.extractMelSpectrogram(
        cleanNativeOptions(nativeOptions)
    )
}
