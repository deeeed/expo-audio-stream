#pragma once

#include <vector>
#include <cmath>

// Forward declare kiss_fft types
struct kiss_fftr_state;
typedef struct kiss_fftr_state* kiss_fftr_cfg;

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
};

struct MelSpectrogramResult {
    std::vector<std::vector<float>> spectrogram; // [timeSteps][nMels]
    int timeSteps;
    int nMels;
};

class MelSpectrogramProcessor {
public:
    MelSpectrogramProcessor(const MelSpectrogramConfig& config);
    ~MelSpectrogramProcessor();

    MelSpectrogramResult compute(const float* samples, int numSamples);
    void computeFrame(const float* frame, int frameSize, float* melOutput);

private:
    MelSpectrogramConfig config_;
    std::vector<std::vector<float>> melFilterbank_;
    std::vector<float> window_;
    kiss_fftr_cfg fftCfg_;

    void buildMelFilterbank();
    void buildWindow();

    static float hzToMel(float hz);
    static float melToHz(float mel);
};
