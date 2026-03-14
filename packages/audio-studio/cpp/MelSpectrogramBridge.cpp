#include "MelSpectrogramBridge.h"
#include "MelSpectrogram.h"
#include <cstdlib>
#include <cstring>
#include <memory>

// Cache the processor so repeated calls with the same config skip
// FFT plan creation, window computation, and filterbank generation.
static std::unique_ptr<MelSpectrogramProcessor> cachedProcessor;

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

    // Reuse processor if config matches
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<MelSpectrogramProcessor>(config);
    }

    MelSpectrogramResult result = cachedProcessor->compute(samples, numSamples);

    if (result.timeSteps <= 0) {
        return nullptr;
    }

    // Allocate C result — data is already flat, just transfer ownership
    CMelSpectrogramResult* cResult = (CMelSpectrogramResult*)malloc(sizeof(CMelSpectrogramResult));
    cResult->timeSteps = result.timeSteps;
    cResult->nMels = result.nMels;
    const size_t dataSize = result.timeSteps * result.nMels * sizeof(float);
    cResult->data = (float*)malloc(dataSize);
    std::memcpy(cResult->data, result.data.data(), dataSize);

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
