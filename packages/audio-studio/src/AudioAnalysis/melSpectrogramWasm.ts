// Native stub — WASM mel spectrogram is web-only.
// These functions are only called in web contexts; on native, the C++ TurboModule handles mel spectrograms.

export async function initMelStreamingWasm(
    _sampleRate: number,
    _nMels?: number,
    _fftLength?: number,
    _windowSizeSamples?: number,
    _hopLengthSamples?: number,
    _fMin?: number,
    _fMax?: number
): Promise<void> {
    throw new Error('WASM mel spectrogram is not available on native')
}

export function computeMelFrameWasm(_samples: Float32Array): number[] | null {
    return null
}

export async function computeMelSpectrogramWasm(
    _audioData: Float32Array,
    _sampleRate: number,
    _nMels: number,
    _windowSizeSamples: number,
    _hopLengthSamples: number,
    _fMin: number,
    _fMax: number,
    _windowType: 'hann' | 'hamming',
    _normalize: boolean,
    _logScale: boolean
): Promise<number[][]> {
    throw new Error('WASM mel spectrogram is not available on native')
}
