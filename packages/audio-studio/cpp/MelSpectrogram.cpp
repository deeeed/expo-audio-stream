#include "MelSpectrogram.h"
#include "kiss_fft/kiss_fftr.h"

#include <algorithm>
#include <cstring>
#include <limits>

MelSpectrogramProcessor::MelSpectrogramProcessor(const MelSpectrogramConfig& config)
    : config_(config), fftCfg_(nullptr) {
    if (config_.fMax <= 0.0f) {
        config_.fMax = static_cast<float>(config_.sampleRate) / 2.0f;
    }
    fftCfg_ = kiss_fftr_alloc(config_.fftLength, 0, nullptr, nullptr);
    buildWindow();
    buildMelFilterbank();
}

MelSpectrogramProcessor::~MelSpectrogramProcessor() {
    if (fftCfg_) {
        free(fftCfg_);
    }
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

    // Build frequency array for each FFT bin
    std::vector<float> freqs(numBins);
    for (int i = 0; i < numBins; ++i) {
        freqs[i] = static_cast<float>(i) * config_.sampleRate / config_.fftLength;
    }

    // Build triangular filterbank (Hz-domain linear interpolation)
    melFilterbank_.resize(config_.nMels, std::vector<float>(numBins, 0.0f));
    for (int melIdx = 0; melIdx < config_.nMels; ++melIdx) {
        float fLow = melPoints[melIdx];
        float fCenter = melPoints[melIdx + 1];
        float fHigh = melPoints[melIdx + 2];

        for (int bin = 0; bin < numBins; ++bin) {
            float freq = freqs[bin];
            if (freq < fLow || freq > fHigh) {
                melFilterbank_[melIdx][bin] = 0.0f;
            } else if (freq <= fCenter) {
                melFilterbank_[melIdx][bin] = (freq - fLow) / (fCenter - fLow);
            } else {
                melFilterbank_[melIdx][bin] = (fHigh - freq) / (fHigh - fCenter);
            }
        }
    }
}

MelSpectrogramResult MelSpectrogramProcessor::compute(const float* samples, int numSamples) {
    const int numBins = config_.fftLength / 2 + 1;
    const int numFrames = (numSamples - config_.windowSizeSamples) / config_.hopLengthSamples + 1;

    if (numFrames <= 0) {
        return MelSpectrogramResult{{}, 0, config_.nMels};
    }

    // Allocate FFT buffers
    std::vector<float> fftInput(config_.fftLength, 0.0f);
    std::vector<kiss_fft_cpx> fftOutput(numBins);
    std::vector<float> powerSpectrum(numBins);

    // Result
    std::vector<std::vector<float>> spectrogram(numFrames, std::vector<float>(config_.nMels, 0.0f));

    for (int frameIdx = 0; frameIdx < numFrames; ++frameIdx) {
        const int start = frameIdx * config_.hopLengthSamples;

        // Zero the FFT input buffer
        std::memset(fftInput.data(), 0, config_.fftLength * sizeof(float));

        // Apply window to frame
        const int end = std::min(start + config_.windowSizeSamples, numSamples);
        for (int i = start; i < end; ++i) {
            fftInput[i - start] = samples[i] * window_[i - start];
        }

        // Compute real FFT
        kiss_fftr(fftCfg_, fftInput.data(), fftOutput.data());

        // Compute power spectrum (real^2 + imag^2)
        for (int i = 0; i < numBins; ++i) {
            powerSpectrum[i] = fftOutput[i].r * fftOutput[i].r + fftOutput[i].i * fftOutput[i].i;
        }

        // Apply mel filterbank
        for (int melIdx = 0; melIdx < config_.nMels; ++melIdx) {
            float sum = 0.0f;
            for (int bin = 0; bin < numBins; ++bin) {
                sum += powerSpectrum[bin] * melFilterbank_[melIdx][bin];
            }
            spectrogram[frameIdx][melIdx] = sum;
        }
    }

    // Post-processing: log scaling
    if (config_.logScale) {
        for (int i = 0; i < numFrames; ++i) {
            for (int j = 0; j < config_.nMels; ++j) {
                spectrogram[i][j] = std::log(std::max(1e-10f, spectrogram[i][j]));
            }
        }
    }

    // Post-processing: normalize
    if (config_.normalize) {
        float minVal = std::numeric_limits<float>::max();
        float maxVal = std::numeric_limits<float>::lowest();
        for (int i = 0; i < numFrames; ++i) {
            for (int j = 0; j < config_.nMels; ++j) {
                minVal = std::min(minVal, spectrogram[i][j]);
                maxVal = std::max(maxVal, spectrogram[i][j]);
            }
        }
        float range = maxVal - minVal;
        if (range > 0.0f) {
            for (int i = 0; i < numFrames; ++i) {
                for (int j = 0; j < config_.nMels; ++j) {
                    spectrogram[i][j] = (spectrogram[i][j] - minVal) / range;
                }
            }
        }
    }

    return MelSpectrogramResult{std::move(spectrogram), numFrames, config_.nMels};
}

void MelSpectrogramProcessor::computeFrame(const float* frame, int frameSize, float* melOutput) {
    const int numBins = config_.fftLength / 2 + 1;

    std::vector<float> fftInput(config_.fftLength, 0.0f);
    std::vector<kiss_fft_cpx> fftOutput(numBins);

    // Apply window
    int len = std::min(frameSize, config_.windowSizeSamples);
    for (int i = 0; i < len; ++i) {
        fftInput[i] = frame[i] * window_[i];
    }

    kiss_fftr(fftCfg_, fftInput.data(), fftOutput.data());

    // Power spectrum -> mel
    for (int melIdx = 0; melIdx < config_.nMels; ++melIdx) {
        float sum = 0.0f;
        for (int bin = 0; bin < numBins; ++bin) {
            float power = fftOutput[bin].r * fftOutput[bin].r + fftOutput[bin].i * fftOutput[bin].i;
            sum += power * melFilterbank_[melIdx][bin];
        }
        melOutput[melIdx] = sum;
    }
}
