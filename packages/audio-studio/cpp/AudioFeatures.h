#pragma once

#include <vector>
#include <cmath>
#include "kiss_fft/kiss_fft.h"
#include "kiss_fft/kiss_fftr.h"

struct AudioFeaturesConfig {
    int sampleRate;
    int fftLength = 1024;
    int nMfcc = 13;           // Number of MFCC coefficients to output
    int nMelFilters = 26;     // Number of mel filters for MFCC
    bool computeMfcc = true;
    bool computeChroma = true;

    bool operator==(const AudioFeaturesConfig& other) const {
        return sampleRate == other.sampleRate &&
               fftLength == other.fftLength &&
               nMfcc == other.nMfcc &&
               nMelFilters == other.nMelFilters &&
               computeMfcc == other.computeMfcc &&
               computeChroma == other.computeChroma;
    }
};

struct AudioFeaturesResult {
    float spectralCentroid;
    float spectralFlatness;
    float spectralRolloff;
    float spectralBandwidth;
    std::vector<float> mfcc;       // nMfcc coefficients
    std::vector<float> chromagram;  // 12 bins
};

class AudioFeaturesProcessor {
public:
    AudioFeaturesProcessor(const AudioFeaturesConfig& config);
    ~AudioFeaturesProcessor();

    // Non-copyable (owns FFT plan)
    AudioFeaturesProcessor(const AudioFeaturesProcessor&) = delete;
    AudioFeaturesProcessor& operator=(const AudioFeaturesProcessor&) = delete;

    AudioFeaturesResult compute(const float* samples, int numSamples);

    const AudioFeaturesConfig& config() const { return config_; }

private:
    AudioFeaturesConfig config_;
    int numBins_;  // fftLength / 2 + 1

    // FFT resources
    kiss_fftr_cfg fftCfg_;
    std::vector<float> window_;
    std::vector<float> fftInput_;
    std::vector<kiss_fft_cpx> fftOutput_;
    std::vector<float> magnitudeSpectrum_;
    std::vector<float> powerSpectrum_;

    // Mel filterbank for MFCC (sparse, same pattern as MelSpectrogram)
    struct MelFilter {
        int startBin;
        std::vector<float> weights;
    };
    std::vector<MelFilter> melFilters_;

    // DCT matrix for MFCC (precomputed)
    std::vector<float> dctMatrix_;  // [nMfcc * nMelFilters]

    void buildWindow();
    void buildMelFilterbank();
    void buildDCTMatrix();
    void allocateBuffers();

    void computeFFT(const float* samples, int numSamples);
    float computeSpectralCentroid() const;
    float computeSpectralFlatness() const;
    float computeSpectralRolloff() const;
    float computeSpectralBandwidth(float centroid) const;
    void computeMFCC(std::vector<float>& mfcc) const;
    void computeChromagram(std::vector<float>& chroma) const;

    static float hzToMel(float hz);
    static float melToHz(float mel);
};
