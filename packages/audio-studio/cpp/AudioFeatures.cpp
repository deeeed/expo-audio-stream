#include "AudioFeatures.h"

#include <algorithm>
#include <cstring>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

AudioFeaturesProcessor::AudioFeaturesProcessor(const AudioFeaturesConfig& config)
    : config_(config), fftCfg_(nullptr) {
    if (config_.sampleRate <= 0) config_.sampleRate = 16000;
    if (config_.fftLength <= 0) config_.fftLength = 1024;
    if (config_.nMfcc <= 0) config_.nMfcc = 13;
    if (config_.nMelFilters <= 0) config_.nMelFilters = 26;
    numBins_ = config_.fftLength / 2 + 1;
    fftCfg_ = kiss_fftr_alloc(config_.fftLength, 0, nullptr, nullptr);
    buildWindow();
    if (config_.computeMfcc) {
        buildMelFilterbank();
        buildDCTMatrix();
    }
    allocateBuffers();
}

AudioFeaturesProcessor::~AudioFeaturesProcessor() {
    if (fftCfg_) {
        free(fftCfg_);
    }
}

void AudioFeaturesProcessor::allocateBuffers() {
    fftInput_.resize(config_.fftLength, 0.0f);
    fftOutput_.resize(numBins_);
    magnitudeSpectrum_.resize(numBins_, 0.0f);
    powerSpectrum_.resize(numBins_, 0.0f);
}

float AudioFeaturesProcessor::hzToMel(float hz) {
    return 2595.0f * std::log10(1.0f + hz / 700.0f);
}

float AudioFeaturesProcessor::melToHz(float mel) {
    return 700.0f * (std::pow(10.0f, mel / 2595.0f) - 1.0f);
}

void AudioFeaturesProcessor::buildWindow() {
    window_.resize(config_.fftLength);
    const float N = static_cast<float>(config_.fftLength - 1);
    for (int i = 0; i < config_.fftLength; ++i) {
        // Hann window
        window_[i] = 0.5f * (1.0f - std::cos(2.0f * static_cast<float>(M_PI) * i / N));
    }
}

void AudioFeaturesProcessor::buildMelFilterbank() {
    const float fMin = 0.0f;
    const float fMax = static_cast<float>(config_.sampleRate) / 2.0f;
    const float melMin = hzToMel(fMin);
    const float melMax = hzToMel(fMax);

    // nMelFilters + 2 points for triangular filters
    const int nPoints = config_.nMelFilters + 2;
    std::vector<float> melPoints(nPoints);
    for (int i = 0; i < nPoints; ++i) {
        float mel = melMin + i * (melMax - melMin) / (config_.nMelFilters + 1);
        melPoints[i] = melToHz(mel);
    }

    const float binWidth = static_cast<float>(config_.sampleRate) / config_.fftLength;

    melFilters_.resize(config_.nMelFilters);
    for (int m = 0; m < config_.nMelFilters; ++m) {
        const float fLow = melPoints[m];
        const float fCenter = melPoints[m + 1];
        const float fHigh = melPoints[m + 2];

        int binStart = std::max(0, static_cast<int>(std::ceil(fLow / binWidth)));
        int binEnd = std::min(numBins_ - 1, static_cast<int>(std::floor(fHigh / binWidth)));

        melFilters_[m].startBin = binStart;
        const int count = binEnd - binStart + 1;
        melFilters_[m].weights.resize(count > 0 ? count : 0);

        for (int bin = binStart; bin <= binEnd; ++bin) {
            float freq = static_cast<float>(bin) * binWidth;
            float weight;
            if (freq <= fCenter) {
                weight = (fCenter - fLow) > 0.0f ? (freq - fLow) / (fCenter - fLow) : 0.0f;
            } else {
                weight = (fHigh - fCenter) > 0.0f ? (fHigh - freq) / (fHigh - fCenter) : 0.0f;
            }
            melFilters_[m].weights[bin - binStart] = std::max(0.0f, weight);
        }
    }
}

void AudioFeaturesProcessor::buildDCTMatrix() {
    // Precompute DCT-II matrix: dct[i][j] = scale * cos(pi * i * (2*j + 1) / (2*N))
    const int N = config_.nMelFilters;
    const int K = config_.nMfcc;
    const float scale = std::sqrt(2.0f / N);

    dctMatrix_.resize(K * N);
    for (int i = 0; i < K; ++i) {
        for (int j = 0; j < N; ++j) {
            dctMatrix_[i * N + j] = scale * std::cos(
                static_cast<float>(M_PI) * i * (2 * j + 1) / (2.0f * N)
            );
        }
    }
}

void AudioFeaturesProcessor::computeFFT(const float* samples, int numSamples) {
    float* fftIn = fftInput_.data();

    // Zero the buffer
    std::memset(fftIn, 0, config_.fftLength * sizeof(float));

    // Apply window to input (truncate or zero-pad as needed)
    const int len = std::min(numSamples, config_.fftLength);
    for (int i = 0; i < len; ++i) {
        fftIn[i] = samples[i] * window_[i];
    }

    // Compute real FFT
    kiss_fftr(fftCfg_, fftIn, fftOutput_.data());

    // Compute magnitude and power spectra
    for (int i = 0; i < numBins_; ++i) {
        float re = fftOutput_[i].r;
        float im = fftOutput_[i].i;
        float power = re * re + im * im;
        powerSpectrum_[i] = power;
        magnitudeSpectrum_[i] = std::sqrt(power);
    }
}

float AudioFeaturesProcessor::computeSpectralCentroid() const {
    float sum = 0.0f;
    float weightedSum = 0.0f;
    const float binToFreq = static_cast<float>(config_.sampleRate) / config_.fftLength;

    for (int i = 0; i < numBins_; ++i) {
        float freq = i * binToFreq;
        weightedSum += freq * magnitudeSpectrum_[i];
        sum += magnitudeSpectrum_[i];
    }

    return sum > 0.0f ? weightedSum / sum : 0.0f;
}

float AudioFeaturesProcessor::computeSpectralFlatness() const {
    const float eps = 1e-10f;
    float sumLog = 0.0f;
    float sum = 0.0f;

    for (int i = 0; i < numBins_; ++i) {
        sumLog += std::log(powerSpectrum_[i] + eps);
        sum += powerSpectrum_[i];
    }

    float geometricMean = std::exp(sumLog / numBins_);
    float arithmeticMean = sum / numBins_;

    return arithmeticMean > 0.0f ? geometricMean / arithmeticMean : 0.0f;
}

float AudioFeaturesProcessor::computeSpectralRolloff() const {
    float totalEnergy = 0.0f;
    for (int i = 0; i < numBins_; ++i) {
        totalEnergy += magnitudeSpectrum_[i];
    }

    const float threshold = totalEnergy * 0.85f;
    float cumulativeEnergy = 0.0f;
    const float binToFreq = static_cast<float>(config_.sampleRate) / config_.fftLength;

    for (int i = 0; i < numBins_; ++i) {
        cumulativeEnergy += magnitudeSpectrum_[i];
        if (cumulativeEnergy >= threshold) {
            return i * binToFreq;
        }
    }

    return 0.0f;
}

float AudioFeaturesProcessor::computeSpectralBandwidth(float centroid) const {
    float sum = 0.0f;
    float weightedSum = 0.0f;
    const float binToFreq = static_cast<float>(config_.sampleRate) / config_.fftLength;

    for (int i = 0; i < numBins_; ++i) {
        float freq = i * binToFreq;
        float diff = freq - centroid;
        weightedSum += magnitudeSpectrum_[i] * diff * diff;
        sum += magnitudeSpectrum_[i];
    }

    return sum > 0.0f ? std::sqrt(weightedSum / sum) : 0.0f;
}

void AudioFeaturesProcessor::computeMFCC(std::vector<float>& mfcc) const {
    const int N = config_.nMelFilters;
    const int K = config_.nMfcc;
    mfcc.resize(K);

    // Apply mel filterbank to power spectrum -> log mel energies
    std::vector<float> logMelEnergies(N);
    for (int m = 0; m < N; ++m) {
        const MelFilter& filter = melFilters_[m];
        const int count = static_cast<int>(filter.weights.size());
        float energy = 0.0f;
        const float* w = filter.weights.data();
        const float* p = powerSpectrum_.data() + filter.startBin;
        for (int k = 0; k < count; ++k) {
            energy += p[k] * w[k];
        }
        logMelEnergies[m] = std::log(std::max(energy, 1e-10f));
    }

    // Apply precomputed DCT matrix
    for (int i = 0; i < K; ++i) {
        float sum = 0.0f;
        const float* dctRow = dctMatrix_.data() + i * N;
        for (int j = 0; j < N; ++j) {
            sum += logMelEnergies[j] * dctRow[j];
        }
        mfcc[i] = sum;
    }
}

void AudioFeaturesProcessor::computeChromagram(std::vector<float>& chroma) const {
    chroma.assign(12, 0.0f);
    const float binToFreq = static_cast<float>(config_.sampleRate) / config_.fftLength;

    for (int i = 1; i < numBins_; ++i) {  // skip DC bin
        float freq = i * binToFreq;
        if (freq < 20.0f) continue;  // skip sub-audible frequencies

        // Map frequency to pitch class: MIDI note = 69 + 12*log2(freq/440)
        float midiNote = 69.0f + 12.0f * std::log2(freq / 440.0f);
        int pitchClass = static_cast<int>(std::round(midiNote)) % 12;
        if (pitchClass < 0) pitchClass += 12;

        chroma[pitchClass] += magnitudeSpectrum_[i];
    }
}

AudioFeaturesResult AudioFeaturesProcessor::compute(const float* samples, int numSamples) {
    AudioFeaturesResult result;

    // Single FFT pass for all features
    computeFFT(samples, numSamples);

    // Spectral features (always computed)
    result.spectralCentroid = computeSpectralCentroid();
    result.spectralFlatness = computeSpectralFlatness();
    result.spectralRolloff = computeSpectralRolloff();
    result.spectralBandwidth = computeSpectralBandwidth(result.spectralCentroid);

    // MFCC (optional)
    if (config_.computeMfcc) {
        computeMFCC(result.mfcc);
    }

    // Chromagram (optional)
    if (config_.computeChroma) {
        computeChromagram(result.chromagram);
    }

    return result;
}
