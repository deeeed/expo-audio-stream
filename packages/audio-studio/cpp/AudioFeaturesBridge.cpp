#include "AudioFeaturesBridge.h"
#include "AudioFeatures.h"
#include <cstdlib>
#include <cstring>
#include <memory>
#include <mutex>

static std::unique_ptr<AudioFeaturesProcessor> cachedProcessor;
static std::mutex cachedMutex;

static CAudioFeaturesResult* resultFromCpp(const AudioFeaturesResult& src) {
    CAudioFeaturesResult* r = (CAudioFeaturesResult*)malloc(sizeof(CAudioFeaturesResult));
    r->spectralCentroid = src.spectralCentroid;
    r->spectralFlatness = src.spectralFlatness;
    r->spectralRolloff = src.spectralRolloff;
    r->spectralBandwidth = src.spectralBandwidth;

    r->mfccCount = static_cast<int>(src.mfcc.size());
    if (r->mfccCount > 0) {
        r->mfcc = (float*)malloc(r->mfccCount * sizeof(float));
        std::memcpy(r->mfcc, src.mfcc.data(), r->mfccCount * sizeof(float));
    } else {
        r->mfcc = nullptr;
    }

    r->chromagramCount = static_cast<int>(src.chromagram.size());
    if (r->chromagramCount > 0) {
        r->chromagram = (float*)malloc(r->chromagramCount * sizeof(float));
        std::memcpy(r->chromagram, src.chromagram.data(), r->chromagramCount * sizeof(float));
    } else {
        r->chromagram = nullptr;
    }

    return r;
}

static void fillResultFromCpp(const AudioFeaturesResult& src, CAudioFeaturesResult* r) {
    r->spectralCentroid = src.spectralCentroid;
    r->spectralFlatness = src.spectralFlatness;
    r->spectralRolloff = src.spectralRolloff;
    r->spectralBandwidth = src.spectralBandwidth;

    r->mfccCount = static_cast<int>(src.mfcc.size());
    if (r->mfccCount > 0) {
        r->mfcc = (float*)malloc(r->mfccCount * sizeof(float));
        std::memcpy(r->mfcc, src.mfcc.data(), r->mfccCount * sizeof(float));
    } else {
        r->mfcc = nullptr;
    }

    r->chromagramCount = static_cast<int>(src.chromagram.size());
    if (r->chromagramCount > 0) {
        r->chromagram = (float*)malloc(r->chromagramCount * sizeof(float));
        std::memcpy(r->chromagram, src.chromagram.data(), r->chromagramCount * sizeof(float));
    } else {
        r->chromagram = nullptr;
    }
}

extern "C" {

CAudioFeaturesResult* audio_features_compute(
    const float* samples, int numSamples, int sampleRate,
    int fftLength, int nMfcc, int nMelFilters,
    int computeMfcc, int computeChroma)
{
    AudioFeaturesConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.nMfcc = nMfcc;
    config.nMelFilters = nMelFilters;
    config.computeMfcc = (computeMfcc != 0);
    config.computeChroma = (computeChroma != 0);

    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<AudioFeaturesProcessor>(config);
    }

    AudioFeaturesResult result = cachedProcessor->compute(samples, numSamples);
    return resultFromCpp(result);
}

void audio_features_free(CAudioFeaturesResult* result) {
    if (result) {
        if (result->mfcc) free(result->mfcc);
        if (result->chromagram) free(result->chromagram);
        free(result);
    }
}

void audio_features_free_arrays(CAudioFeaturesResult* result) {
    if (result) {
        if (result->mfcc) { free(result->mfcc); result->mfcc = nullptr; }
        if (result->chromagram) { free(result->chromagram); result->chromagram = nullptr; }
    }
}

void audio_features_init(int sampleRate, int fftLength,
    int nMfcc, int nMelFilters, int computeMfcc, int computeChroma)
{
    AudioFeaturesConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.nMfcc = nMfcc;
    config.nMelFilters = nMelFilters;
    config.computeMfcc = (computeMfcc != 0);
    config.computeChroma = (computeChroma != 0);

    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<AudioFeaturesProcessor>(config);
    }
}

int audio_features_compute_frame(const float* samples, int numSamples,
    CAudioFeaturesResult* result)
{
    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor || !samples || !result) {
        return 0;
    }

    AudioFeaturesResult cppResult = cachedProcessor->compute(samples, numSamples);
    fillResultFromCpp(cppResult, result);
    return 1;
}

int audio_features_get_n_mfcc(void) {
    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor) {
        return 0;
    }
    return cachedProcessor->config().nMfcc;
}

} // extern "C"
