/** Type declarations for audio features functions in the mel-spectrogram WASM module */

import type { MelSpectrogramWasmModule } from './mel-spectrogram-wasm'

export interface AudioFeaturesWasmModule extends MelSpectrogramWasmModule {
    _audio_features_compute(
        samples: number,
        numSamples: number,
        sampleRate: number,
        fftLength: number,
        nMfcc: number,
        nMelFilters: number,
        computeMfcc: number,
        computeChroma: number
    ): number

    _audio_features_free(resultPtr: number): void

    _audio_features_init(
        sampleRate: number,
        fftLength: number,
        nMfcc: number,
        nMelFilters: number,
        computeMfcc: number,
        computeChroma: number
    ): void

    _audio_features_compute_frame(
        samples: number,
        numSamples: number,
        resultPtr: number
    ): number

    _audio_features_free_arrays(resultPtr: number): void

    _audio_features_get_n_mfcc(): number
}
