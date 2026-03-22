import type { AudioFeaturesWasmResult } from './AudioAnalysis.types'
import type { AudioFeaturesWasmModule } from './audio-features-wasm'
import { getWasmModule } from './wasmLoader.web'

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

function readResult(
    Module: AudioFeaturesWasmModule,
    ptr: number
): AudioFeaturesWasmResult {
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

    return {
        spectralCentroid,
        spectralFlatness,
        spectralRolloff,
        spectralBandwidth,
        mfcc,
        chromagram,
    }
}

// --- Streaming (per-frame) API ---

/**
 * Encapsulates a single WASM streaming audio features session.
 * Each instance owns its own WASM heap allocations; multiple sessions
 * can exist concurrently without interfering with each other.
 *
 * Usage:
 *   const session = await AudioFeaturesStreamingSession.create(sampleRate)
 *   try {
 *     for (const frame of frames) {
 *       const result = session.computeFrame(frame)
 *     }
 *   } finally {
 *     session.dispose()
 *   }
 */
export class AudioFeaturesStreamingSession {
    private module: AudioFeaturesWasmModule
    private framePtr = 0
    private frameCapacity = 0
    private resultPtr = 0

    private constructor(module: AudioFeaturesWasmModule) {
        this.module = module
    }

    /**
     * Initialise a new streaming session. Loads the WASM module if needed.
     */
    static async create(
        sampleRate: number,
        fftLength = 1024,
        nMfcc = 13,
        nMelFilters = 26,
        computeMfcc = true,
        computeChroma = true
    ): Promise<AudioFeaturesStreamingSession> {
        const Module = await getWasmModule()
        const session = new AudioFeaturesStreamingSession(Module)

        Module._audio_features_init(
            sampleRate,
            fftLength,
            nMfcc,
            nMelFilters,
            computeMfcc ? 1 : 0,
            computeChroma ? 1 : 0
        )

        // Pre-allocate result struct on WASM heap
        session.resultPtr = Module._malloc(STRUCT_SIZE)
        // Zero-initialize to prevent freeing garbage pointers on first use
        Module.HEAPU8.fill(
            0,
            session.resultPtr,
            session.resultPtr + STRUCT_SIZE
        )

        return session
    }

    /**
     * Compute audio features for a single frame.
     * Returns null on error or if the session has been disposed.
     */
    computeFrame(samples: Float32Array): AudioFeaturesWasmResult | null {
        if (!this.resultPtr) return null
        const Module = this.module

        // (Re-)allocate frame input buffer if needed
        if (samples.length > this.frameCapacity) {
            if (this.framePtr) Module._free(this.framePtr)
            this.framePtr = Module._malloc(samples.length * 4)
            this.frameCapacity = samples.length
        }

        // Copy samples to WASM heap
        Module.HEAPF32.set(samples, this.framePtr >> 2)

        const ok = Module._audio_features_compute_frame(
            this.framePtr,
            samples.length,
            this.resultPtr
        )
        if (!ok) return null

        const result = readResult(Module, this.resultPtr)

        // Free internal arrays (mfcc, chromagram) allocated by C
        Module._audio_features_free_arrays(this.resultPtr)

        return result
    }

    /**
     * Free all WASM heap allocations owned by this session.
     * The session must not be used after calling dispose().
     */
    dispose(): void {
        const Module = this.module
        if (this.framePtr) {
            Module._free(this.framePtr)
            this.framePtr = 0
            this.frameCapacity = 0
        }
        if (this.resultPtr) {
            Module._free(this.resultPtr)
            this.resultPtr = 0
        }
    }
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
    const Module = await getWasmModule()

    const numSamples = audioData.length
    const inputPtr = Module._malloc(numSamples * 4)
    Module.HEAPF32.set(audioData, inputPtr >> 2)

    const resultPtr = Module._audio_features_compute(
        inputPtr,
        numSamples,
        sampleRate,
        fftLength,
        nMfcc,
        nMelFilters,
        computeMfcc ? 1 : 0,
        computeChroma ? 1 : 0
    )

    Module._free(inputPtr)

    if (resultPtr === 0) {
        throw new Error('audio_features_compute returned null')
    }

    const result = readResult(Module, resultPtr)
    Module._audio_features_free(resultPtr)

    return result
}
