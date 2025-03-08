// packages/react-native-essentia/cpp/EssentiaWrapper.h
#ifndef ESSENTIA_WRAPPER_H
#define ESSENTIA_WRAPPER_H
#include <vector>
#include <algorithm>
#include <jni.h>
#include <sstream>
#include <map>
#include <set>

#include "essentia/essentia.h"
#include "essentia/algorithmfactory.h"
#include "essentia/essentiamath.h"
#include "essentia/pool.h"
#include "essentia/version.h"
#include "Utils.h"

class EssentiaWrapper {
public:
    EssentiaWrapper();
    ~EssentiaWrapper();

    bool initialize();
    bool setAudioData(const std::vector<essentia::Real>& data, double rate);

    std::string executeAlgorithm(const std::string& algorithm, const std::string& paramsJson);
    std::string executeSpecificAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params);
    std::string executeDynamicAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params);
    std::vector<essentia::Real> applyTonnetzTransform(const std::vector<essentia::Real>& hpcp);

    std::string getAlgorithmInfo(const std::string& algorithm);
    std::string getAllAlgorithms();


    bool isInitialized() const  { return mIsInitialized; }
    void computeSpectrum(int frameSize, int hopSize);



    // Accessors for other private members used in FeatureExtractor
    bool getSpectrumComputed() const { return spectrumComputed; }
    void setSpectrumComputed(bool computed) { spectrumComputed = computed; }
    const std::vector<essentia::Real>& getCachedSpectrum() const { return cachedSpectrum; }
    void setCachedSpectrum(const std::vector<essentia::Real>& spectrum) { cachedSpectrum = spectrum; }
    const std::vector<std::vector<essentia::Real>>& getAllSpectra() const { return allSpectra; }
    void setAllSpectra(const std::vector<std::vector<essentia::Real>>& spectra) { allSpectra = spectra; }

    double getSampleRate() const { return sampleRate; }
    const std::vector<essentia::Real>& getAudioBuffer() const { return audioBuffer; }
    const std::map<std::string, std::string>& getPrimaryOutputs() const { return primaryOutputs; }

private:
    bool mIsInitialized;
    std::vector<essentia::Real> audioBuffer;
    double sampleRate;
    bool spectrumComputed;
    std::vector<essentia::Real> cachedSpectrum;
    std::vector<std::vector<essentia::Real>> allSpectra;
    std::string findMatchingInputName(essentia::standard::Algorithm* algo, const std::string& expectedName,
                                      const std::vector<std::string>& alternatives = {});

    static const std::array<std::array<float, 12>, 6> TONNETZ_MATRIX;
    static const std::map<std::string, std::string> primaryOutputs;
};

#endif
