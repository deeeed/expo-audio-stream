import { ExtractedAudioData } from '@siteed/expo-audio-stream'

export interface AudioStats {
    max: number
    min: number
    mean: number
    rms: number
    nonZeroCount: number
    nonZeroPercentage: number
    clipCount: number
    firstSamples: number[]
    totalSamples: number
    sampleRate: number
    hasSignal: boolean
    signalStrength: number
}

export function validateAudioData(
    data: Float32Array | Int16Array | undefined,
    label: string,
    sampleRate?: number
): AudioStats | null {
    if (!data || data.length === 0) {
        console.warn(`${label} is empty or null`)
        return null
    }

    const sampleSize = Math.min(10000, data.length)
    const samples = data.slice(0, sampleSize)
    let max = -Infinity
    let min = Infinity
    let sum = 0
    let rms = 0
    let nonZeroCount = 0
    let clipCount = 0
    
    for (let i = 0; i < sampleSize; i++) {
        const value = samples[i]
        max = Math.max(max, value)
        min = Math.min(min, value)
        sum += Math.abs(value)
        rms += value * value
        if (value !== 0) nonZeroCount++
        if (Math.abs(value) > 0.99) clipCount++
    }

    return {
        max,
        min,
        mean: sum / sampleSize,
        rms: Math.sqrt(rms / sampleSize),
        nonZeroCount,
        nonZeroPercentage: (nonZeroCount / sampleSize) * 100,
        clipCount,
        firstSamples: Array.from(samples.slice(0, 10)),
        totalSamples: data.length,
        sampleRate: sampleRate ?? 16000,
        hasSignal: max !== min || max !== 0,
        signalStrength: sum / sampleSize
    }
}

export function validateExtractedAudio(
    extractedData: ExtractedAudioData,
    fileName: string
): void {
    const pcmStats = validateAudioData(
        extractedData.pcmData ? new Int16Array(extractedData.pcmData) : undefined,
        'PCM data',
        extractedData.sampleRate
    )
    const normalizedStats = validateAudioData(
        extractedData.normalizedData,
        'Normalized data',
        extractedData.sampleRate
    )

    // Log comprehensive audio validation results
    console.debug('Audio extraction results:', {
        pcmStats,
        normalizedStats,
        metadata: {
            sampleRate: extractedData.sampleRate,
            channels: extractedData.channels,
            duration: extractedData.durationMs,
            format: extractedData.format,
            hasWavHeader: extractedData.hasWavHeader,
            pcmDataSize: extractedData.pcmData?.byteLength,
            normalizedDataSize: extractedData.normalizedData?.length,
            base64DataSize: extractedData.base64Data?.length
        }
    })

    // Validate signal presence
    if ((!pcmStats?.hasSignal && !normalizedStats?.hasSignal) || 
        ((pcmStats?.signalStrength ?? 0) < 1e-6 && (normalizedStats?.signalStrength ?? 0) < 1e-6)) {
        throw new Error(
            `No audio signal detected. File: ${fileName}\n` +
            `PCM RMS: ${pcmStats?.rms.toExponential(2)}\n` +
            `Normalized RMS: ${normalizedStats?.rms.toExponential(2)}\n` +
            'Please try a different file or time range.'
        )
    }
} 