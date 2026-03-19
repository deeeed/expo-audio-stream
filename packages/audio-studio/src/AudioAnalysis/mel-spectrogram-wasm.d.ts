/** Type declarations for the Emscripten-generated mel-spectrogram WASM module */

export interface MelSpectrogramWasmModule {
    _mel_spectrogram_compute(
        samples: number,
        numSamples: number,
        sampleRate: number,
        fftLength: number,
        windowSizeSamples: number,
        hopLengthSamples: number,
        nMels: number,
        fMin: number,
        fMax: number,
        windowType: number,
        logScale: number,
        normalize: number
    ): number

    _mel_spectrogram_free(resultPtr: number): void

    _mel_spectrogram_init(
        sampleRate: number,
        fftLength: number,
        windowSizeSamples: number,
        hopLengthSamples: number,
        nMels: number,
        fMin: number,
        fMax: number,
        windowType: number
    ): void

    _mel_spectrogram_compute_frame(
        framePtr: number,
        frameSize: number,
        melOutputPtr: number
    ): number

    _mel_spectrogram_get_n_mels(): number

    _malloc(size: number): number
    _free(ptr: number): void

    HEAPF32: Float32Array
    HEAPU8: Uint8Array
    getValue(ptr: number, type: string): number
}

export default function createMelSpectrogramModule(): Promise<MelSpectrogramWasmModule>
