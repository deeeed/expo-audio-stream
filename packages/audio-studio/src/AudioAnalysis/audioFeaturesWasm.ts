// Native stub — WASM audio features is web-only.

import type { AudioFeaturesWasmResult } from './AudioAnalysis.types'

export class AudioFeaturesStreamingSession {
    static async create(
        _sampleRate: number,
        _fftLength?: number,
        _nMfcc?: number,
        _nMelFilters?: number,
        _computeMfcc?: boolean,
        _computeChroma?: boolean
    ): Promise<AudioFeaturesStreamingSession> {
        throw new Error('WASM audio features is not available on native')
    }

    computeFrame(_samples: Float32Array): AudioFeaturesWasmResult | null {
        return null
    }

    dispose(): void {}
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
