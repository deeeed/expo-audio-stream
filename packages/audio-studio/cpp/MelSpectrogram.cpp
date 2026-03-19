#include "MelSpectrogram.h"

#include <algorithm>
#include <cstring>
#include <limits>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

MelSpectrogramProcessor::MelSpectrogramProcessor(const MelSpectrogramConfig& config)
    : config_(config), fftCfg_(nullptr) {
    // Clamp invalid values to safe defaults to prevent division by zero
    if (config_.fftLength <= 0) config_.fftLength = 2048;
    if (config_.hopLengthSamples <= 0) config_.hopLengthSamples = 160;
    if (config_.windowSizeSamples <= 1) config_.windowSizeSamples = 400;
    if (config_.nMels <= 0) config_.nMels = 128;
    if (config_.fMax <= 0.0f) {
        config_.fMax = static_cast<float>(config_.sampleRate) / 2.0f;
    }
    fftCfg_ = kiss_fftr_alloc(config_.fftLength, 0, nullptr, nullptr);
    buildWindow();
    buildMelFilterbank();
    allocateBuffers();
}

MelSpectrogramProcessor::~MelSpectrogramProcessor() {
    if (fftCfg_) {
        free(fftCfg_);
    }
}

void MelSpectrogramProcessor::allocateBuffers() {
    const int numBins = config_.fftLength / 2 + 1;
    fftInput_.resize(config_.fftLength, 0.0f);
    fftOutput_.resize(numBins);
    powerSpectrum_.resize(numBins);
}

float MelSpectrogramProcessor::hzToMel(float hz) {
    return 2595.0f * std::log10(1.0f + hz / 700.0f);
}

float MelSpectrogramProcessor::melToHz(float mel) {
    return 700.0f * (std::pow(10.0f, mel / 2595.0f) - 1.0f);
}

void MelSpectrogramProcessor::buildWindow() {
    window_.resize(config_.windowSizeSamples);
    const float N = static_cast<float>(config_.windowSizeSamples - 1);
    for (int i = 0; i < config_.windowSizeSamples; ++i) {
        if (config_.windowType == 1) {
            // Hamming
            window_[i] = 0.54f - 0.46f * std::cos(2.0f * static_cast<float>(M_PI) * i / N);
        } else {
            // Hann (default)
            window_[i] = 0.5f * (1.0f - std::cos(2.0f * static_cast<float>(M_PI) * i / N));
        }
    }
}

void MelSpectrogramProcessor::buildMelFilterbank() {
    const int numBins = config_.fftLength / 2 + 1;
    const float melMin = hzToMel(config_.fMin);
    const float melMax = hzToMel(config_.fMax);

    // nMels + 2 points for triangular filters
    std::vector<float> melPoints(config_.nMels + 2);
    for (int i = 0; i < config_.nMels + 2; ++i) {
        float mel = melMin + i * (melMax - melMin) / (config_.nMels + 1);
        melPoints[i] = melToHz(mel);
    }

    const float binWidth = static_cast<float>(config_.sampleRate) / config_.fftLength;

    // Build sparse filterbank — only store non-zero weights per mel band
    melFilters_.resize(config_.nMels);
    for (int melIdx = 0; melIdx < config_.nMels; ++melIdx) {
        const float fLow = melPoints[melIdx];
        const float fCenter = melPoints[melIdx + 1];
        const float fHigh = melPoints[melIdx + 2];

        // Find bin range that overlaps this filter
        int binStart = std::max(0, static_cast<int>(std::ceil(fLow / binWidth)));
        int binEnd = std::min(numBins - 1, static_cast<int>(std::floor(fHigh / binWidth)));

        melFilters_[melIdx].startBin = binStart;
        const int count = binEnd - binStart + 1;
        melFilters_[melIdx].weights.resize(count > 0 ? count : 0);

        for (int bin = binStart; bin <= binEnd; ++bin) {
            float freq = static_cast<float>(bin) * binWidth;
            float weight;
            if (freq <= fCenter) {
                float denom = fCenter - fLow;
                weight = (denom > 0.0f) ? (freq - fLow) / denom : 0.0f;
            } else {
                float denom = fHigh - fCenter;
                weight = (denom > 0.0f) ? (fHigh - freq) / denom : 0.0f;
            }
            melFilters_[melIdx].weights[bin - binStart] = std::max(0.0f, weight);
        }
    }
}

MelSpectrogramResult MelSpectrogramProcessor::compute(const float* samples, int numSamples) {
    const int numBins = config_.fftLength / 2 + 1;
    const int numFrames = (numSamples - config_.windowSizeSamples) / config_.hopLengthSamples + 1;

    if (numFrames <= 0) {
        return MelSpectrogramResult{{}, 0, config_.nMels};
    }

    // Use pre-allocated work buffers
    float* fftIn = fftInput_.data();
    kiss_fft_cpx* fftOut = fftOutput_.data();
    float* power = powerSpectrum_.data();

    // Zero the tail of fftInput once (only matters when windowSize < fftLength)
    if (config_.windowSizeSamples < config_.fftLength) {
        std::memset(fftIn + config_.windowSizeSamples, 0,
                    (config_.fftLength - config_.windowSizeSamples) * sizeof(float));
    }

    // Flat contiguous result buffer
    MelSpectrogramResult result;
    result.timeSteps = numFrames;
    result.nMels = config_.nMels;
    result.data.resize(numFrames * config_.nMels);

    for (int frameIdx = 0; frameIdx < numFrames; ++frameIdx) {
        const int start = frameIdx * config_.hopLengthSamples;

        // Apply window to frame
        const int frameLen = std::min(config_.windowSizeSamples, numSamples - start);
        for (int i = 0; i < frameLen; ++i) {
            fftIn[i] = samples[start + i] * window_[i];
        }

        // Compute real FFT
        kiss_fftr(fftCfg_, fftIn, fftOut);

        // Compute power spectrum (real^2 + imag^2)
        for (int i = 0; i < numBins; ++i) {
            power[i] = fftOut[i].r * fftOut[i].r + fftOut[i].i * fftOut[i].i;
        }

        // Apply sparse mel filterbank
        float* melRow = result.data.data() + frameIdx * config_.nMels;
        for (int melIdx = 0; melIdx < config_.nMels; ++melIdx) {
            const MelFilter& filter = melFilters_[melIdx];
            const int count = static_cast<int>(filter.weights.size());
            float sum = 0.0f;
            const float* w = filter.weights.data();
            const float* p = power + filter.startBin;
            for (int k = 0; k < count; ++k) {
                sum += p[k] * w[k];
            }
            melRow[melIdx] = sum;
        }
    }

    // Post-processing: log scaling
    if (config_.logScale) {
        const int total = numFrames * config_.nMels;
        float* d = result.data.data();
        for (int i = 0; i < total; ++i) {
            d[i] = std::log(std::max(1e-10f, d[i]));
        }
    }

    // Post-processing: normalize
    if (config_.normalize) {
        const int total = numFrames * config_.nMels;
        float* d = result.data.data();
        float minVal = std::numeric_limits<float>::max();
        float maxVal = std::numeric_limits<float>::lowest();
        for (int i = 0; i < total; ++i) {
            minVal = std::min(minVal, d[i]);
            maxVal = std::max(maxVal, d[i]);
        }
        float range = maxVal - minVal;
        if (range > 0.0f) {
            float invRange = 1.0f / range;
            for (int i = 0; i < total; ++i) {
                d[i] = (d[i] - minVal) * invRange;
            }
        }
    }

    return result;
}

void MelSpectrogramProcessor::computeFrame(const float* frame, int frameSize, float* melOutput) {
    const int numBins = config_.fftLength / 2 + 1;

    // Use pre-allocated buffers
    float* fftIn = fftInput_.data();
    kiss_fft_cpx* fftOut = fftOutput_.data();
    float* power = powerSpectrum_.data();

    // Zero and apply window
    std::memset(fftIn, 0, config_.fftLength * sizeof(float));
    int len = std::min(frameSize, config_.windowSizeSamples);
    for (int i = 0; i < len; ++i) {
        fftIn[i] = frame[i] * window_[i];
    }

    kiss_fftr(fftCfg_, fftIn, fftOut);

    // Power spectrum -> sparse mel filterbank
    for (int i = 0; i < numBins; ++i) {
        power[i] = fftOut[i].r * fftOut[i].r + fftOut[i].i * fftOut[i].i;
    }

    for (int melIdx = 0; melIdx < config_.nMels; ++melIdx) {
        const MelFilter& filter = melFilters_[melIdx];
        const int count = static_cast<int>(filter.weights.size());
        float sum = 0.0f;
        const float* w = filter.weights.data();
        const float* p = power + filter.startBin;
        for (int k = 0; k < count; ++k) {
            sum += p[k] * w[k];
        }
        melOutput[melIdx] = sum;
    }
}
