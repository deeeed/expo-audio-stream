#pragma once

#include <vector>
#include <cmath>
#include "kiss_fft/kiss_fft.h"
#include "kiss_fft/kiss_fftr.h"

struct MelSpectrogramConfig {
    int sampleRate;
    int fftLength = 2048;
    int windowSizeSamples;
    int hopLengthSamples;
    int nMels = 128;
    float fMin = 0.0f;
    float fMax = 0.0f;  // 0 = use sampleRate/2
    int windowType = 0; // 0=hann, 1=hamming
    bool logScale = true;
    bool normalize = false;

    bool operator==(const MelSpectrogramConfig& other) const {
        return sampleRate == other.sampleRate &&
               fftLength == other.fftLength &&
               windowSizeSamples == other.windowSizeSamples &&
               hopLengthSamples == other.hopLengthSamples &&
               nMels == other.nMels &&
               fMin == other.fMin &&
               fMax == other.fMax &&
               windowType == other.windowType &&
               logScale == other.logScale &&
               normalize == other.normalize;
    }
};

struct MelSpectrogramResult {
    std::vector<float> data;  // Flat array: [timeSteps * nMels], row-major
    int timeSteps;
    int nMels;

    // Access element at [frame][mel]
    float& at(int frame, int mel) { return data[frame * nMels + mel]; }
    float at(int frame, int mel) const { return data[frame * nMels + mel]; }
};

class MelSpectrogramProcessor {
public:
    MelSpectrogramProcessor(const MelSpectrogramConfig& config);
    ~MelSpectrogramProcessor();

    // Non-copyable (owns FFT plan)
    MelSpectrogramProcessor(const MelSpectrogramProcessor&) = delete;
    MelSpectrogramProcessor& operator=(const MelSpectrogramProcessor&) = delete;

    MelSpectrogramResult compute(const float* samples, int numSamples);
    void computeFrame(const float* frame, int frameSize, float* melOutput);

    const MelSpectrogramConfig& config() const { return config_; }

private:
    MelSpectrogramConfig config_;

    // Sparse mel filterbank: per mel band, store [startBin, weights[]]
    struct MelFilter {
        int startBin;
        std::vector<float> weights;  // only non-zero weights
    };
    std::vector<MelFilter> melFilters_;

    std::vector<float> window_;
    kiss_fftr_cfg fftCfg_;

    // Pre-allocated work buffers (avoid per-frame allocation)
    std::vector<float> fftInput_;
    std::vector<kiss_fft_cpx> fftOutput_;
    std::vector<float> powerSpectrum_;

    void buildMelFilterbank();
    void buildWindow();
    void allocateBuffers();

    static float hzToMel(float hz);
    static float melToHz(float mel);
};
