import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

import {
    ExtractAudioDataOptions,
    ExtractedAudioData,
    BitDepth,
    TrimAudioOptions,
    TrimAudioResult,
} from './ExpoAudioStream.types'
import {
    ExpoAudioStreamWeb,
    ExpoAudioStreamWebProps,
} from './ExpoAudioStream.web'
import { processAudioBuffer } from './utils/audioProcessing'
import crc32 from './utils/crc32'
import { writeWavHeader } from './utils/writeWavHeader'

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
                includeNormalizedData,
                includeBase64Data,
                includeWavHeader = false,
                logger,
            } = options

            logger?.debug('EXTRACT AUDIO - Step 1: Initial request', {
                fileUri,
                extractionParams: {
                    position,
                    length,
                    startTimeMs,
                    endTimeMs,
                },
                decodingOptions: {
                    targetSampleRate:
                        decodingOptions?.targetSampleRate ?? 16000,
                    targetChannels: decodingOptions?.targetChannels ?? 1,
                    targetBitDepth: decodingOptions?.targetBitDepth ?? 16,
                    normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                },
                outputOptions: {
                    includeNormalizedData,
                    includeBase64Data,
                    includeWavHeader,
                },
            })

            // Process the audio using shared helper function
            const processedBuffer = await processAudioBuffer({
                fileUri,
                targetSampleRate: decodingOptions?.targetSampleRate ?? 16000,
                targetChannels: decodingOptions?.targetChannels ?? 1,
                normalizeAudio: decodingOptions?.normalizeAudio ?? false,
                position,
                length,
                startTimeMs,
                endTimeMs,
                logger,
            })

            logger?.debug('EXTRACT AUDIO - Step 2: Audio processing complete', {
                processedData: {
                    samples: processedBuffer.samples,
                    sampleRate: processedBuffer.sampleRate,
                    channels: processedBuffer.channels,
                    durationMs: processedBuffer.durationMs,
                },
            })

            const channelData = processedBuffer.channelData
            const bitDepth = (decodingOptions?.targetBitDepth ?? 16) as BitDepth
            const bytesPerSample = bitDepth / 8
            const numSamples = processedBuffer.samples

            logger?.debug('EXTRACT AUDIO - Step 3: PCM conversion setup', {
                channelData: {
                    length: channelData.length,
                    first: channelData[0],
                    last: channelData[channelData.length - 1],
                },
                calculation: {
                    bitDepth,
                    bytesPerSample,
                    numSamples,
                    expectedBytes: numSamples * bytesPerSample,
                },
            })

            // Create PCM data with correct length based on original byte length
            const pcmData = new Uint8Array(numSamples * bytesPerSample)
            let offset = 0

            // Convert Float32 samples to PCM format
            for (let i = 0; i < numSamples; i++) {
                const sample = channelData[i]
                const value = Math.max(-1, Math.min(1, sample))
                // Convert to 16-bit signed integer
                let intValue = Math.round(value * 32767)

                // Handle negative values correctly
                if (intValue < 0) {
                    intValue = 65536 + intValue
                }

                // Write as little-endian
                pcmData[offset++] = intValue & 255 // Low byte
                pcmData[offset++] = (intValue >> 8) & 255 // High byte
            }

            const durationMs = Math.round(
                (numSamples / processedBuffer.sampleRate) * 1000
            )

            logger?.debug('EXTRACT AUDIO - Step 4: Final output', {
                pcmData: {
                    length: pcmData.length,
                    first: pcmData[0],
                    last: pcmData[pcmData.length - 1],
                },
                timing: {
                    numSamples,
                    sampleRate: processedBuffer.sampleRate,
                    durationMs,
                    shouldBe3000ms: endTimeMs
                        ? endTimeMs - (startTimeMs ?? 0) === 3000
                        : undefined,
                },
            })

            const result: ExtractedAudioData = {
                pcmData: new Uint8Array(pcmData.buffer),
                sampleRate: processedBuffer.sampleRate,
                channels: processedBuffer.channels,
                bitDepth,
                durationMs,
                format: `pcm_${bitDepth}bit` as const,
                samples: numSamples,
            }

            // Add WAV header if requested
            if (includeWavHeader) {
                logger?.debug('EXTRACT AUDIO - Step 4: Adding WAV header', {
                    originalLength: pcmData.length,
                    newLength: result.pcmData.length,
                    firstBytes: Array.from(result.pcmData.slice(0, 44)), // WAV header is 44 bytes
                })
                const wavBuffer = writeWavHeader({
                    buffer: pcmData.buffer.slice(0, pcmData.length),
                    sampleRate: processedBuffer.sampleRate,
                    numChannels: processedBuffer.channels,
                    bitDepth,
                })
                result.pcmData = new Uint8Array(wavBuffer)
                result.hasWavHeader = true
            }

            if (includeNormalizedData) {
                // // Simple approach: Create normalized data directly from the PCM data
                // // Just convert to -1 to 1 range without any amplification
                // const normalizedData = new Float32Array(numSamples)

                // // Convert the PCM data to float values
                // for (let i = 0; i < numSamples; i++) {
                //     // Get the 16-bit PCM value (little endian)
                //     const lowByte = pcmData[i * 2]
                //     const highByte = pcmData[i * 2 + 1]
                //     const pcmValue = (highByte << 8) | lowByte

                //     // Convert to signed 16-bit value
                //     const signedValue =
                //         pcmValue > 32767 ? pcmValue - 65536 : pcmValue

                //     // Normalize to float between -1 and 1
                //     normalizedData[i] = signedValue / 32768.0
                // }
                // Store the normalized data in the result
                result.normalizedData = channelData
            }

            if (includeBase64Data) {
                // Convert the PCM data to a base64 string
                const binary = Array.from(new Uint8Array(pcmData.buffer))
                    .map((b) => String.fromCharCode(b))
                    .join('')
                result.base64Data = btoa(binary)
            }

            if (options.computeChecksum) {
                result.checksum = crc32.buf(pcmData)
            }

            logger?.debug('EXTRACT AUDIO - Step 3: PCM conversion complete', {
                pcmStats: {
                    length: pcmData.length,
                    bytesPerSample,
                    totalSamples: numSamples,
                    firstBytes: Array.from(pcmData.slice(0, 16)),
                    lastBytes: Array.from(pcmData.slice(-16)),
                },
            })

            return result
        } catch (error) {
            options.logger?.error('EXTRACT AUDIO - Error:', error)
            throw error
        }
    }

    ExpoAudioStreamModule.trimAudio = async (
        options: TrimAudioOptions
    ): Promise<TrimAudioResult> => {
        try {
            const startTime = performance.now()
            const {
                fileUri,
                mode = 'single',
                startTimeMs,
                endTimeMs,
                ranges,
                outputFileName,
                outputFormat,
            } = options

            // Validate inputs
            if (!fileUri) {
                throw new Error('fileUri is required')
            }

            if (
                mode === 'single' &&
                startTimeMs === undefined &&
                endTimeMs === undefined
            ) {
                throw new Error(
                    'At least one of startTimeMs or endTimeMs must be provided in single mode'
                )
            }

            if (
                (mode === 'keep' || mode === 'remove') &&
                (!ranges || ranges.length === 0)
            ) {
                throw new Error(
                    'ranges must be provided and non-empty for keep or remove modes'
                )
            }

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
            ExpoAudioStreamModule.sendEvent('TrimProgress', {
                progress: 10,
            })

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
                    ExpoAudioStreamModule.sendEvent('TrimProgress', {
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
            ExpoAudioStreamModule.sendEvent('TrimProgress', {
                progress: 50,
            })

            // Encode the result based on the requested format
            let outputData: ArrayBuffer
            let outputMimeType: string
            let compressionInfo: any = null

            // Check if AAC was requested on web and show a warning
            if (format === 'aac' && Platform.OS === 'web') {
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
            ExpoAudioStreamModule.sendEvent('TrimProgress', {
                progress: 90,
            })

            // Create a blob and URL for the result
            const blob = new Blob([outputData], { type: outputMimeType })
            const outputUri = URL.createObjectURL(blob)

            // Calculate processing time
            const processingTimeMs = performance.now() - startTime

            // Report progress (100% - complete)
            ExpoAudioStreamModule.sendEvent('TrimProgress', {
                progress: 100,
            })

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

    // Add a sendEvent method for web
    ExpoAudioStreamModule.sendEvent = (eventName: string, params: any) => {
        // This will be picked up by the LegacyEventEmitter in trimAudio.ts
        if (
            ExpoAudioStreamModule.listeners &&
            ExpoAudioStreamModule.listeners[eventName]
        ) {
            ExpoAudioStreamModule.listeners[eventName].forEach(
                (listener: Function) => {
                    listener(params)
                }
            )
        }
    }

    // Initialize listeners object
    ExpoAudioStreamModule.listeners = {}

    // Add methods for event listeners that LegacyEventEmitter will use
    ExpoAudioStreamModule.addListener = (
        eventName: string,
        listener: Function
    ) => {
        if (!ExpoAudioStreamModule.listeners[eventName]) {
            ExpoAudioStreamModule.listeners[eventName] = []
        }
        ExpoAudioStreamModule.listeners[eventName].push(listener)

        // Return an object with a remove method
        return {
            remove: () => {
                const index =
                    ExpoAudioStreamModule.listeners[eventName].indexOf(listener)
                if (index !== -1) {
                    ExpoAudioStreamModule.listeners[eventName].splice(index, 1)
                }
            },
        }
    }

    ExpoAudioStreamModule.removeAllListeners = (eventName: string) => {
        if (ExpoAudioStreamModule.listeners[eventName]) {
            delete ExpoAudioStreamModule.listeners[eventName]
        }
    }

    ExpoAudioStreamModule.prepareRecording = async (options: any) => {
        // For web platform, we'll implement a simplified version that just checks permissions
        // and does minimal setup. The actual recording setup will still happen in startRecording.
        try {
            // Check for microphone permissions
            const permissionsResult =
                await ExpoAudioStreamModule.getPermissionsAsync()
            if (!permissionsResult.granted) {
                throw new Error('Microphone permission not granted')
            }

            // If using a web instance, call its prepareRecording method
            if (instance) {
                return await instance.prepareRecording(options)
            }

            return true
        } catch (error) {
            console.error('Error preparing recording:', error)
            throw error
        }
    }
}

// Move the encodeCompressedAudio function outside the if block to fix the ESLint error
async function encodeCompressedAudio(
    buffer: AudioBuffer,
    format: 'opus' | 'aac',
    bitrate?: number
): Promise<{ data: ArrayBuffer; bitrate: number }> {
    return new Promise((resolve, reject) => {
        try {
            // On web, always use opus if aac is requested
            const actualFormat =
                Platform.OS === 'web' && format === 'aac' ? 'opus' : format

            // Check if MediaRecorder supports the requested format
            const mimeType =
                actualFormat === 'opus' ? 'audio/webm;codecs=opus' : 'audio/aac'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                throw new Error(`MediaRecorder does not support ${mimeType}`)
            }

            // Create a new AudioContext and source
            const ctx = new (window.AudioContext ||
                (window as any).webkitAudioContext)()
            const source = ctx.createBufferSource()
            source.buffer = buffer

            // Create a MediaStreamDestination to capture the audio
            const destination = ctx.createMediaStreamDestination()
            source.connect(destination)

            // Create a MediaRecorder with the requested format
            const recorder = new MediaRecorder(destination.stream, {
                mimeType,
                audioBitsPerSecond:
                    bitrate || (actualFormat === 'opus' ? 32000 : 64000),
            })

            const chunks: Blob[] = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data)
                }
            }

            recorder.onstop = async () => {
                try {
                    const blob = new Blob(chunks, { type: mimeType })
                    const arrayBuffer = await blob.arrayBuffer()

                    // Get the actual bitrate used
                    const actualBitrate = Math.round(
                        (arrayBuffer.byteLength * 8) / buffer.duration
                    )

                    resolve({
                        data: arrayBuffer,
                        bitrate: actualBitrate / 1000, // Convert to kbps
                    })

                    // Clean up
                    ctx.close()
                } catch (error) {
                    reject(error)
                }
            }

            // Start recording and playback
            recorder.start()
            source.start(0)

            // Stop recording when the buffer finishes playing
            setTimeout(() => {
                recorder.stop()
                source.stop()
            }, buffer.duration * 1000)
        } catch (error) {
            reject(error)
        }
    })
}

// Improved resampleAudioBuffer function
async function resampleAudioBuffer(
    context: AudioContext,
    buffer: AudioBuffer,
    targetSampleRate: number,
    targetChannels: number
): Promise<AudioBuffer> {
    // If no change needed, return the original buffer
    if (
        buffer.sampleRate === targetSampleRate &&
        buffer.numberOfChannels === targetChannels
    ) {
        return buffer
    }

    console.log(
        `Resampling: ${buffer.sampleRate}Hz → ${targetSampleRate}Hz, ${buffer.numberOfChannels} → ${targetChannels} channels`
    )

    // Calculate the new length based on the sample rate change
    const newLength = Math.round(
        (buffer.length * targetSampleRate) / buffer.sampleRate
    )

    // Create an offline context for resampling
    const offlineContext = new OfflineAudioContext(
        targetChannels,
        newLength,
        targetSampleRate
    )

    // Create a source node
    const source = offlineContext.createBufferSource()
    source.buffer = buffer

    // If we need to change channel count
    if (buffer.numberOfChannels !== targetChannels) {
        if (targetChannels === 1 && buffer.numberOfChannels > 1) {
            // Downmix to mono
            const merger = offlineContext.createChannelMerger(1)

            // Create a gain node to reduce volume when downmixing to prevent clipping
            const gainNode = offlineContext.createGain()
            gainNode.gain.value = 1.0 / buffer.numberOfChannels

            source.connect(gainNode)
            gainNode.connect(merger)
            merger.connect(offlineContext.destination)
        } else if (targetChannels === 2 && buffer.numberOfChannels === 1) {
            // Upmix mono to stereo (duplicate the channel)
            const splitter = offlineContext.createChannelSplitter(1)
            const merger = offlineContext.createChannelMerger(2)

            source.connect(splitter)
            splitter.connect(merger, 0, 0)
            splitter.connect(merger, 0, 1)
            merger.connect(offlineContext.destination)
        } else {
            // For other cases, just connect and let the system handle it
            source.connect(offlineContext.destination)
        }
    } else {
        // No channel conversion needed
        source.connect(offlineContext.destination)
    }

    // Start rendering
    source.start(0)
    const resampledBuffer = await offlineContext.startRendering()

    console.log(
        `Resampling complete: ${resampledBuffer.length} samples at ${resampledBuffer.sampleRate}Hz`
    )

    return resampledBuffer
}

if (Platform.OS !== 'web') {
    ExpoAudioStreamModule = requireNativeModule('ExpoAudioStream')
}

export default ExpoAudioStreamModule
