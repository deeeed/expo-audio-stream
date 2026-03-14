#include "MelSpectrogramBridge.h"
#include "MelSpectrogram.h"
#include <cstdlib>
#include <cstring>

extern "C" {

CMelSpectrogramResult* mel_spectrogram_compute(
    const float* samples, int numSamples, int sampleRate,
    int fftLength, int windowSizeSamples, int hopLengthSamples,
    int nMels, float fMin, float fMax,
    int windowType, int logScale, int normalize)
{
    MelSpectrogramConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.windowSizeSamples = windowSizeSamples;
    config.hopLengthSamples = hopLengthSamples;
    config.nMels = nMels;
    config.fMin = fMin;
    config.fMax = fMax;
    config.windowType = windowType;
    config.logScale = (logScale != 0);
    config.normalize = (normalize != 0);

    MelSpectrogramProcessor processor(config);
    MelSpectrogramResult result = processor.compute(samples, numSamples);

    if (result.timeSteps <= 0) {
        return nullptr;
    }

    CMelSpectrogramResult* cResult = (CMelSpectrogramResult*)malloc(sizeof(CMelSpectrogramResult));
    cResult->timeSteps = result.timeSteps;
    cResult->nMels = result.nMels;
    cResult->data = (float*)malloc(result.timeSteps * result.nMels * sizeof(float));

    for (int i = 0; i < result.timeSteps; ++i) {
        memcpy(cResult->data + i * result.nMels, result.spectrogram[i].data(), result.nMels * sizeof(float));
    }

    return cResult;
}

void mel_spectrogram_free(CMelSpectrogramResult* result) {
    if (result) {
        if (result->data) {
            free(result->data);
        }
        free(result);
    }
}

} // extern "C"
