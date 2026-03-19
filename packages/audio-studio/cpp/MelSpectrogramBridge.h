#ifndef MEL_SPECTROGRAM_BRIDGE_H
#define MEL_SPECTROGRAM_BRIDGE_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float* data;       // Flat array: timeSteps * nMels
    int timeSteps;
    int nMels;
} CMelSpectrogramResult;

CMelSpectrogramResult* mel_spectrogram_compute(
    const float* samples, int numSamples, int sampleRate,
    int fftLength, int windowSizeSamples, int hopLengthSamples,
    int nMels, float fMin, float fMax,
    int windowType, int logScale, int normalize);

void mel_spectrogram_free(CMelSpectrogramResult* result);

// Single-frame API for live/per-segment mel computation
void mel_spectrogram_init(int sampleRate, int fftLength, int windowSizeSamples,
    int hopLengthSamples, int nMels, float fMin, float fMax, int windowType);
int mel_spectrogram_compute_frame(const float* frame, int frameSize, float* melOutput);
int mel_spectrogram_get_n_mels(void);

#ifdef __cplusplus
}
#endif

#endif // MEL_SPECTROGRAM_BRIDGE_H
