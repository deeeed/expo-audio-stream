import { LegacyEventEmitter, type EventSubscription } from 'expo-modules-core'

import {
    BitDepth,
    TrimAudioOptions,
    TrimAudioResult,
    TrimProgressEvent,
} from './AudioStudio.types'
import AudioStudioModule from './AudioStudioModule'
import { isWeb } from './constants'
import { processAudioBuffer } from './utils/audioProcessing'
import { cleanNativeOptions } from './utils/cleanNativeOptions'
import { encodeCompressedAudio } from './utils/encodeCompressedAudio.web'
import { resampleAudioBuffer } from './utils/resampleAudioBuffer.web'
import { writeWavHeader } from './utils/writeWavHeader'

// Create a single emitter instance
const emitter = new LegacyEventEmitter(AudioStudioModule)

/**
 * Trims an audio file based on the provided options.
 *
 * @experimental This API is experimental and not fully optimized for production use.
 * Performance may vary based on file size and device capabilities.
 * Future versions may include breaking changes.
 *
 * @param options Configuration options for the trimming operation
 * @param progressCallback Optional callback to receive progress updates
 * @returns Promise resolving to the trimmed audio file information, including processing time
 */
export async function trimAudio(
    options: TrimAudioOptions,
    progressCallback?: (event: TrimProgressEvent) => void
): Promise<TrimAudioResult> {
    // Validation
    if (!options.fileUri) {
        throw new Error('fileUri is required')
    }
    const mode = options.mode ?? 'single'
    if (mode === 'single') {
        if (
            options.startTimeMs === undefined &&
            options.endTimeMs === undefined
        ) {
            throw new Error(
                'At least one of startTimeMs or endTimeMs must be provided in single mode'
            )
        }
    } else if (mode === 'keep' || mode === 'remove') {
        if (!options.ranges || options.ranges.length === 0) {
            throw new Error(
                'ranges must be provided and non-empty for keep or remove modes'
            )
        }
    } else {
        throw new Error(
            `Invalid mode: ${mode}. Must be 'single', 'keep', or 'remove'`
        )
    }

    if (isWeb) {
        try {
            const startTime = performance.now()
            const {
                fileUri,
                startTimeMs,
                endTimeMs,
                ranges,
                outputFileName,
                outputFormat,
            } = options

            // Create AudioContext
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)()

            // First, load the entire audio file to get its properties
            const response = await fetch(fileUri)
            const arrayBuffer = await response.arrayBuffer()
            const originalAudioBuffer =
                await audioContext.decodeAudioData(arrayBuffer)

            // Get original audio properties
            const originalSampleRate = originalAudioBuffer.sampleRate
            const originalChannels = originalAudioBuffer.numberOfChannels

            // Add more detailed logging
            console.log(`Original audio details:`, {
                sampleRate: originalSampleRate,
                channels: originalChannels,
                duration: originalAudioBuffer.duration,
                length: originalAudioBuffer.length,
                // Log a few samples to verify content
                firstSamples: Array.from(
                    originalAudioBuffer.getChannelData(0).slice(0, 5)
                ),
            })

            // Determine output format - use original values as defaults if not specified
            let format = outputFormat?.format || 'wav'
            const targetSampleRate =
                outputFormat?.sampleRate || originalSampleRate
            const targetChannels = outputFormat?.channels || originalChannels
            const targetBitDepth = outputFormat?.bitDepth || 16

            // Get file info from the URL
            const filename =
                outputFileName ||
                fileUri.split('/').pop() ||
                'trimmed-audio.wav'

            // Process based on mode
            let resultBuffer: AudioBuffer

            // Report initial progress
            progressCallback?.({ progress: 10 })

            if (mode === 'single') {
                // Single mode: extract a single range
                // Use original sample rate and channels for extraction to preserve quality
                const { buffer } = await processAudioBuffer({
                    fileUri,
                    targetSampleRate, // Use the requested sample rate
                    targetChannels,
                    normalizeAudio: false,
                    startTimeMs,
                    endTimeMs,
                    audioContext,
                })

                console.log(`Processed buffer details:`, {
                    sampleRate: buffer.sampleRate,
                    channels: buffer.numberOfChannels,
                    duration: buffer.duration,
                    length: buffer.length,
                    // Log a few samples to verify content
                    firstSamples: Array.from(
                        buffer.getChannelData(0).slice(0, 5)
                    ),
                })

                resultBuffer = buffer

                // If we need to change sample rate or channels, do it after extraction
                if (
                    targetSampleRate !== originalSampleRate ||
                    targetChannels !== originalChannels
                ) {
                    console.log(
                        `Resampling from ${originalSampleRate}Hz to ${targetSampleRate}Hz`
                    )
                    resultBuffer = await resampleAudioBuffer(
                        audioContext,
                        buffer,
                        targetSampleRate,
                        targetChannels
                    )
                }
            } else {
                // For keep or remove modes
                const fullDuration = originalAudioBuffer.duration * 1000 // in ms

                type ProcessSegment = {
                    startTimeMs: number
                    endTimeMs: number
                }

                let segmentsToProcess: ProcessSegment[] = []

                if (mode === 'keep') {
                    // For keep mode, use the ranges directly
                    segmentsToProcess = ranges!
                } else {
                    // mode === 'remove'
                    // For remove mode, invert the ranges
                    const sortedRanges = [...ranges!].sort(
                        (a, b) => a.startTimeMs - b.startTimeMs
                    )

                    // Add segment from start to first range if needed
                    if (
                        sortedRanges.length > 0 &&
                        sortedRanges[0].startTimeMs > 0
                    ) {
                        segmentsToProcess.push({
                            startTimeMs: 0,
                            endTimeMs: sortedRanges[0].startTimeMs,
                        })
                    }

                    // Add segments between ranges
                    for (let i = 0; i < sortedRanges.length - 1; i++) {
                        segmentsToProcess.push({
                            startTimeMs: sortedRanges[i].endTimeMs,
                            endTimeMs: sortedRanges[i + 1].startTimeMs,
                        })
                    }

                    // Add segment from last range to end if needed
                    if (
                        sortedRanges.length > 0 &&
                        sortedRanges[sortedRanges.length - 1].endTimeMs <
                            fullDuration
                    ) {
                        segmentsToProcess.push({
                            startTimeMs:
                                sortedRanges[sortedRanges.length - 1].endTimeMs,
                            endTimeMs: fullDuration,
                        })
                    }
                }

                // Filter out empty or invalid segments
                segmentsToProcess = segmentsToProcess.filter(
                    (segment) =>
                        segment.startTimeMs < segment.endTimeMs &&
                        segment.endTimeMs - segment.startTimeMs > 1
                ) // 1ms minimum

                if (segmentsToProcess.length === 0) {
                    throw new Error(
                        'No valid segments to process after filtering ranges'
                    )
                }

                // Process each segment using original sample rate and channels
                const segmentBuffers: AudioBuffer[] = []

                for (let i = 0; i < segmentsToProcess.length; i++) {
                    const segment = segmentsToProcess[i]

                    // Report progress for each segment
                    progressCallback?.({
                        progress:
                            10 +
                            Math.round((i / segmentsToProcess.length) * 40),
                    })

                    // Use processAudioBuffer to extract this segment
                    const { buffer: segmentBuffer } = await processAudioBuffer({
                        fileUri,
                        targetSampleRate: originalSampleRate, // Use original sample rate
                        targetChannels: originalChannels, // Use original channels
                        normalizeAudio: false,
                        startTimeMs: segment.startTimeMs,
                        endTimeMs: segment.endTimeMs,
                        audioContext,
                    })

                    segmentBuffers.push(segmentBuffer)
                }

                // Concatenate all segments
                const totalSamples = segmentBuffers.reduce(
                    (sum, buffer) => sum + buffer.length,
                    0
                )

                // Create buffer with original properties first
                const concatenatedBuffer = audioContext.createBuffer(
                    originalChannels,
                    totalSamples,
                    originalSampleRate
                )

                let offset = 0
                for (const segmentBuffer of segmentBuffers) {
                    for (
                        let channel = 0;
                        channel < originalChannels;
                        channel++
                    ) {
                        const outputData =
                            concatenatedBuffer.getChannelData(channel)
                        const segmentData =
                            segmentBuffer.getChannelData(channel)

                        for (let i = 0; i < segmentBuffer.length; i++) {
                            outputData[offset + i] = segmentData[i]
                        }
                    }
                    offset += segmentBuffer.length
                }

                resultBuffer = concatenatedBuffer

                // If we need to change sample rate or channels, do it after concatenation
                if (
                    targetSampleRate !== originalSampleRate ||
                    targetChannels !== originalChannels
                ) {
                    console.log(
                        `Resampling concatenated buffer from ${originalSampleRate}Hz to ${targetSampleRate}Hz`
                    )
                    resultBuffer = await resampleAudioBuffer(
                        audioContext,
                        concatenatedBuffer,
                        targetSampleRate,
                        targetChannels
                    )
                }
            }

            // Report progress (50% - processing complete)
            progressCallback?.({ progress: 50 })

            // Encode the result based on the requested format
            let outputData: ArrayBuffer
            let outputMimeType: string
            let compressionInfo: any = null

            // Check if AAC was requested on web and show a warning
            if (format === 'aac') {
                console.warn(
                    'AAC format is not supported on web platforms. Falling back to OPUS format.'
                )
                format = 'opus'
            }

            if (format === 'wav') {
                // Create a properly interleaved buffer for WAV format
                // For WAV, we need to convert Float32Array to Int16Array (for 16-bit audio)
                const numSamples =
                    resultBuffer.length * resultBuffer.numberOfChannels
                const interleavedData = new Int16Array(numSamples)

                // Log detailed information about the buffer before encoding
                console.log(`Creating WAV file:`, {
                    bufferSampleRate: resultBuffer.sampleRate,
                    bufferChannels: resultBuffer.numberOfChannels,
                    bufferLength: resultBuffer.length,
                    targetSampleRate,
                    targetChannels,
                    targetBitDepth,
                    // Log a few samples to verify content
                    firstSamples: Array.from(
                        resultBuffer.getChannelData(0).slice(0, 5)
                    ),
                })

                // Interleave channels properly
                for (let i = 0; i < resultBuffer.length; i++) {
                    for (
                        let channel = 0;
                        channel < resultBuffer.numberOfChannels;
                        channel++
                    ) {
                        // Convert float (-1.0 to 1.0) to int16 (-32768 to 32767)
                        const floatSample =
                            resultBuffer.getChannelData(channel)[i]
                        // Clamp the value to -1.0 to 1.0
                        const clampedSample = Math.max(
                            -1.0,
                            Math.min(1.0, floatSample)
                        )
                        // Convert to int16
                        const intSample = Math.round(clampedSample * 32767)
                        // Store in interleaved buffer
                        interleavedData[
                            i * resultBuffer.numberOfChannels + channel
                        ] = intSample
                    }
                }

                // Convert Int16Array to ArrayBuffer for WAV header
                const rawBuffer = interleavedData.buffer

                // IMPORTANT: Make sure we're using the ACTUAL sample rate of the buffer
                // not just what was requested in the options
                console.log(
                    `Creating WAV with ${resultBuffer.numberOfChannels} channels at ${resultBuffer.sampleRate}Hz`
                )

                outputData = writeWavHeader({
                    buffer: rawBuffer as ArrayBuffer,
                    sampleRate: resultBuffer.sampleRate, // Use the actual buffer's sample rate
                    numChannels: resultBuffer.numberOfChannels,
                    bitDepth: targetBitDepth as BitDepth,
                })
                outputMimeType = 'audio/wav'
            } else if (format === 'opus' || format === 'aac') {
                try {
                    // Try to use MediaRecorder for compressed formats
                    const { data, bitrate } = await encodeCompressedAudio(
                        resultBuffer,
                        format,
                        outputFormat?.bitrate
                    )

                    outputData = data
                    outputMimeType =
                        format === 'opus' ? 'audio/webm' : 'audio/aac'
                    compressionInfo = {
                        format,
                        bitrate,
                        size: data.byteLength,
                    }
                } catch (error) {
                    console.warn(
                        `Failed to encode to ${format}, falling back to WAV: ${error}`
                    )

                    // Same WAV encoding as above
                    const wavData = new Float32Array(
                        resultBuffer.length * resultBuffer.numberOfChannels
                    )

                    for (let i = 0; i < resultBuffer.length; i++) {
                        for (
                            let channel = 0;
                            channel < resultBuffer.numberOfChannels;
                            channel++
                        ) {
                            wavData[
                                i * resultBuffer.numberOfChannels + channel
                            ] = resultBuffer.getChannelData(channel)[i]
                        }
                    }

                    outputData = writeWavHeader({
                        buffer: wavData.buffer as ArrayBuffer,
                        sampleRate: resultBuffer.sampleRate,
                        numChannels: resultBuffer.numberOfChannels,
                        bitDepth: targetBitDepth as BitDepth,
                    })
                    outputMimeType = 'audio/wav'
                }
            } else {
                // Default to WAV for unsupported formats
                console.warn(
                    `Format ${format} not supported on web, using WAV instead`
                )

                // Same WAV encoding as above
                const wavData = new Float32Array(
                    resultBuffer.length * resultBuffer.numberOfChannels
                )

                for (let i = 0; i < resultBuffer.length; i++) {
                    for (
                        let channel = 0;
                        channel < resultBuffer.numberOfChannels;
                        channel++
                    ) {
                        wavData[i * resultBuffer.numberOfChannels + channel] =
                            resultBuffer.getChannelData(channel)[i]
                    }
                }

                outputData = writeWavHeader({
                    buffer: wavData.buffer as ArrayBuffer,
                    sampleRate: resultBuffer.sampleRate,
                    numChannels: resultBuffer.numberOfChannels,
                    bitDepth: targetBitDepth as BitDepth,
                })
                outputMimeType = 'audio/wav'
            }

            // Report progress (90% - encoding complete)
            progressCallback?.({ progress: 90 })

            // Create a blob and URL for the result
            const blob = new Blob([outputData], { type: outputMimeType })
            const outputUri = URL.createObjectURL(blob)

            // Calculate processing time
            const processingTimeMs = performance.now() - startTime

            // Report progress (100% - complete)
            progressCallback?.({ progress: 100 })

            // Create result object
            const result: TrimAudioResult = {
                uri: outputUri,
                filename,
                durationMs: Math.round(resultBuffer.duration * 1000),
                size: outputData.byteLength,
                sampleRate: resultBuffer.sampleRate,
                channels: resultBuffer.numberOfChannels,
                bitDepth: targetBitDepth,
                mimeType: outputMimeType,
                processingInfo: {
                    durationMs: processingTimeMs,
                },
            }

            // Add compression info if available
            if (compressionInfo) {
                result.compression = compressionInfo
            }

            return result
        } catch (error) {
            console.error('Error in trimAudio:', error)
            throw error
        }
    }

    // Set up progress event listener if callback is provided
    let subscription: EventSubscription | undefined
    if (progressCallback) {
        subscription = emitter.addListener(
            'TrimProgress',
            (event: TrimProgressEvent) => {
                progressCallback(event)
            }
        )
    }

    try {
        // Clean non-serializable/undefined values to avoid Android Kotlin bridge crash
        const result = await AudioStudioModule.trimAudio(
            cleanNativeOptions(options)
        )
        return result
    } finally {
        if (subscription) {
            subscription.remove()
        }
    }
}

/**
 * Simplified version of trimAudio that returns only the URI of the trimmed file.
 *
 * @experimental This API is experimental and not fully optimized for production use.
 * Performance may vary based on file size and device capabilities.
 * Future versions may include breaking changes.
 *
 * @param options Configuration options for the trimming operation
 * @returns Promise resolving to the URI of the trimmed audio file
 */
export async function trimAudioSimple(
    options: TrimAudioOptions
): Promise<string> {
    const result = await trimAudio(options)
    return result.uri
}
