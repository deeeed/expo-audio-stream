import type { MelSpectrogramWasmModule } from './mel-spectrogram-wasm'
import { getWasmModule } from './wasmLoader.web'

// --- Streaming (per-frame) API for live mel spectrogram ---

let streamingModule: MelSpectrogramWasmModule | null = null
let streamingNMels = 0
let streamingFramePtr = 0
let streamingMelPtr = 0
let streamingFrameCapacity = 0

/**
 * Initialise the WASM streaming processor. Call once before computeMelFrame().
 * Re-initialises only when config changes.
 */
export async function initMelStreamingWasm(
    sampleRate: number,
    nMels = 128,
    fftLength = 2048,
    windowSizeSamples = 400,
    hopLengthSamples = 160,
    fMin = 0,
    fMax = 0
): Promise<void> {
    const Module = (await getWasmModule()) as MelSpectrogramWasmModule
    streamingModule = Module
    const actualFMax = fMax > 0 ? fMax : sampleRate / 2
    Module._mel_spectrogram_init(
        sampleRate,
        fftLength,
        windowSizeSamples,
        hopLengthSamples,
        nMels,
        fMin,
        actualFMax,
        0 /* hann */
    )
    streamingNMels = nMels

    // Pre-allocate output buffer (fixed size)
    if (streamingMelPtr) Module._free(streamingMelPtr)
    streamingMelPtr = Module._malloc(nMels * 4)

    // Frame input buffer allocated on demand in computeMelFrame
    streamingFrameCapacity = 0
    streamingFramePtr = 0
}

/**
 * Compute a single mel spectrogram frame from raw PCM samples via WASM C++.
 * Returns null if not initialised or on error.
 */
export function computeMelFrameWasm(samples: Float32Array): number[] | null {
    if (!streamingModule || !streamingMelPtr) return null
    const Module = streamingModule

    // (Re-)allocate frame input buffer if needed
    if (samples.length > streamingFrameCapacity) {
        if (streamingFramePtr) Module._free(streamingFramePtr)
        streamingFramePtr = Module._malloc(samples.length * 4)
        streamingFrameCapacity = samples.length
    }

    // Copy samples to WASM heap
    Module.HEAPF32.set(samples, streamingFramePtr >> 2)

    const ok = Module._mel_spectrogram_compute_frame(
        streamingFramePtr,
        samples.length,
        streamingMelPtr
    )
    if (!ok) return null

    // Read mel output from WASM heap
    const offset = streamingMelPtr >> 2
    const result = new Array(streamingNMels)
    for (let i = 0; i < streamingNMels; i++) {
        result[i] = Module.HEAPF32[offset + i]
    }
    return result
}

/**
 * Computes a mel spectrogram via the WASM-compiled C++ implementation.
 * Lazy-loads the WASM module on first call.
 */
export async function computeMelSpectrogramWasm(
    audioData: Float32Array,
    sampleRate: number,
    nMels: number,
    windowSizeSamples: number,
    hopLengthSamples: number,
    fMin: number,
    fMax: number,
    windowType: 'hann' | 'hamming',
    normalize: boolean,
    logScale: boolean
): Promise<number[][]> {
    const Module = (await getWasmModule()) as MelSpectrogramWasmModule

    const fftLength = 2048
    const windowTypeInt = windowType === 'hamming' ? 1 : 0

    // Allocate input buffer on WASM heap
    const numSamples = audioData.length
    const inputPtr = Module._malloc(numSamples * 4) // 4 bytes per float
    Module.HEAPF32.set(audioData, inputPtr >> 2)

    // Call the C bridge
    const resultPtr = Module._mel_spectrogram_compute(
        inputPtr,
        numSamples,
        sampleRate,
        fftLength,
        windowSizeSamples,
        hopLengthSamples,
        nMels,
        fMin,
        fMax,
        windowTypeInt,
        logScale ? 1 : 0,
        normalize ? 1 : 0
    )

    // Free input buffer
    Module._free(inputPtr)

    if (resultPtr === 0) {
        throw new Error(
            'mel_spectrogram_compute returned null (too few samples?)'
        )
    }

    // Read CMelSpectrogramResult struct (wasm32 pointers are 4 bytes)
    // struct layout: { float* data (offset 0), int timeSteps (offset 4), int nMels (offset 8) }
    const dataPtr = Module.getValue(resultPtr, 'i32')
    const timeSteps = Module.getValue(resultPtr + 4, 'i32')
    const resultNMels = Module.getValue(resultPtr + 8, 'i32')

    if (!dataPtr || timeSteps <= 0 || resultNMels <= 0) {
        Module._mel_spectrogram_free(resultPtr)
        throw new Error(
            'mel_spectrogram_compute returned invalid result struct'
        )
    }

    // Copy spectrogram data to JS arrays
    const spectrogram: number[][] = []
    const heapOffset = dataPtr >> 2 // float32 offset into HEAPF32
    for (let t = 0; t < timeSteps; t++) {
        const row = new Array(resultNMels)
        for (let m = 0; m < resultNMels; m++) {
            row[m] = Module.HEAPF32[heapOffset + t * resultNMels + m]
        }
        spectrogram.push(row)
    }

    // Free the C result
    Module._mel_spectrogram_free(resultPtr)

    return spectrogram
}
