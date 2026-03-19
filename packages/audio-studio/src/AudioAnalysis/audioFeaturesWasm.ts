import type { AudioFeaturesWasmModule } from './audio-features-wasm'

export interface AudioFeaturesWasmResult {
    spectralCentroid: number
    spectralFlatness: number
    spectralRolloff: number
    spectralBandwidth: number
    mfcc: number[]
    chromagram: number[]
}

let modulePromise: Promise<AudioFeaturesWasmModule> | null = null

function getModule(): Promise<AudioFeaturesWasmModule> {
    if (!modulePromise) {
        modulePromise = (async () => {
            // Same WASM module as mel spectrogram (now includes audio features)
            // @ts-expect-error -- prebuilt Emscripten JS glue has no .d.ts
            const mod = await import('../../prebuilt/wasm/mel-spectrogram.js')
            const factory = mod.default ?? mod
            return factory() as Promise<AudioFeaturesWasmModule>
        })()
    }
    return modulePromise
}

// --- Struct layout for CAudioFeaturesResult (wasm32) ---
// Offset  0: float spectralCentroid  (4 bytes)
// Offset  4: float spectralFlatness  (4 bytes)
// Offset  8: float spectralRolloff   (4 bytes)
// Offset 12: float spectralBandwidth (4 bytes)
// Offset 16: float* mfcc             (4 bytes pointer)
// Offset 20: int mfccCount           (4 bytes)
// Offset 24: float* chromagram       (4 bytes pointer)
// Offset 28: int chromagramCount     (4 bytes)
const STRUCT_SIZE = 32

function readResult(Module: AudioFeaturesWasmModule, ptr: number): AudioFeaturesWasmResult {
    const spectralCentroid = Module.getValue(ptr, 'float')
    const spectralFlatness = Module.getValue(ptr + 4, 'float')
    const spectralRolloff = Module.getValue(ptr + 8, 'float')
    const spectralBandwidth = Module.getValue(ptr + 12, 'float')

    const mfccPtr = Module.getValue(ptr + 16, 'i32')
    const mfccCount = Module.getValue(ptr + 20, 'i32')
    const chromaPtr = Module.getValue(ptr + 24, 'i32')
    const chromaCount = Module.getValue(ptr + 28, 'i32')

    const mfcc: number[] = []
    if (mfccPtr && mfccCount > 0) {
        const offset = mfccPtr >> 2
        for (let i = 0; i < mfccCount; i++) {
            mfcc.push(Module.HEAPF32[offset + i])
        }
    }

    const chromagram: number[] = []
    if (chromaPtr && chromaCount > 0) {
        const offset = chromaPtr >> 2
        for (let i = 0; i < chromaCount; i++) {
            chromagram.push(Module.HEAPF32[offset + i])
        }
    }

    return { spectralCentroid, spectralFlatness, spectralRolloff, spectralBandwidth, mfcc, chromagram }
}

// --- Streaming (per-frame) API ---

let streamingModule: AudioFeaturesWasmModule | null = null
let streamingFramePtr = 0
let streamingFrameCapacity = 0
let streamingResultPtr = 0

/**
 * Initialise the WASM streaming audio features processor.
 * Call once before computeAudioFeaturesFrameWasm().
 */
export async function initAudioFeaturesWasm(
    sampleRate: number,
    fftLength = 1024,
    nMfcc = 13,
    nMelFilters = 26,
    computeMfcc = true,
    computeChroma = true
): Promise<void> {
    const Module = await getModule()
    streamingModule = Module

    Module._audio_features_init(
        sampleRate, fftLength, nMfcc, nMelFilters,
        computeMfcc ? 1 : 0, computeChroma ? 1 : 0
    )

    // Pre-allocate result struct on WASM heap
    if (streamingResultPtr) Module._free(streamingResultPtr)
    streamingResultPtr = Module._malloc(STRUCT_SIZE)

    // Frame input buffer allocated on demand
    streamingFrameCapacity = 0
    streamingFramePtr = 0
}

/**
 * Compute audio features for a single frame via WASM C++.
 * Returns null if not initialised or on error.
 */
export function computeAudioFeaturesFrameWasm(samples: Float32Array): AudioFeaturesWasmResult | null {
    if (!streamingModule || !streamingResultPtr) return null
    const Module = streamingModule

    // (Re-)allocate frame input buffer if needed
    if (samples.length > streamingFrameCapacity) {
        if (streamingFramePtr) Module._free(streamingFramePtr)
        streamingFramePtr = Module._malloc(samples.length * 4)
        streamingFrameCapacity = samples.length
    }

    // Copy samples to WASM heap
    Module.HEAPF32.set(samples, streamingFramePtr >> 2)

    const ok = Module._audio_features_compute_frame(
        streamingFramePtr, samples.length, streamingResultPtr
    )
    if (!ok) return null

    const result = readResult(Module, streamingResultPtr)

    // Free internal arrays (mfcc, chromagram) allocated by C
    Module._audio_features_free_arrays(streamingResultPtr)

    return result
}

// --- Batch API ---

/**
 * Compute audio features for a buffer of samples via WASM C++.
 * Lazy-loads the WASM module on first call.
 */
export async function computeAudioFeaturesWasm(
    audioData: Float32Array,
    sampleRate: number,
    fftLength = 1024,
    nMfcc = 13,
    nMelFilters = 26,
    computeMfcc = true,
    computeChroma = true
): Promise<AudioFeaturesWasmResult> {
    const Module = await getModule()

    const numSamples = audioData.length
    const inputPtr = Module._malloc(numSamples * 4)
    Module.HEAPF32.set(audioData, inputPtr >> 2)

    const resultPtr = Module._audio_features_compute(
        inputPtr, numSamples, sampleRate, fftLength,
        nMfcc, nMelFilters,
        computeMfcc ? 1 : 0, computeChroma ? 1 : 0
    )

    Module._free(inputPtr)

    if (resultPtr === 0) {
        throw new Error('audio_features_compute returned null')
    }

    const result = readResult(Module, resultPtr)
    Module._audio_features_free(resultPtr)

    return result
}
