// Native stub — WASM audio features is web-only.

export interface AudioFeaturesWasmResult {
    spectralCentroid: number
    spectralFlatness: number
    spectralRolloff: number
    spectralBandwidth: number
    mfcc: number[]
    chromagram: number[]
}

export async function initAudioFeaturesWasm(
    _sampleRate: number,
    _fftLength?: number,
    _nMfcc?: number,
    _nMelFilters?: number,
    _computeMfcc?: boolean,
    _computeChroma?: boolean
): Promise<void> {
    throw new Error('WASM audio features is not available on native')
}

export function computeAudioFeaturesFrameWasm(
    _samples: Float32Array
): AudioFeaturesWasmResult | null {
    return null
}

export async function computeAudioFeaturesWasm(
    _audioData: Float32Array,
    _sampleRate: number,
    _fftLength?: number,
    _nMfcc?: number,
    _nMelFilters?: number,
    _computeMfcc?: boolean,
    _computeChroma?: boolean
): Promise<AudioFeaturesWasmResult> {
    throw new Error('WASM audio features is not available on native')
}
