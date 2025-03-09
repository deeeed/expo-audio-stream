// packages/react-native-essentia/cpp/FeatureExtractor.h
#ifndef FEATURE_EXTRACTOR_H
#define FEATURE_EXTRACTOR_H

#include <string>
#include <vector>
#include <essentia/essentia.h>
#include "EssentiaWrapper.h"

class FeatureExtractor {
public:
    FeatureExtractor(EssentiaWrapper* wrapper);
    std::string extractFeatures(const std::string& featuresJson);
    std::string computeMelSpectrogram(int frameSize, int hopSize, int nMels, float fMin, float fMax,
                                     const std::string& windowType, bool normalize, bool logScale);
    std::string executePipeline(const std::string& pipelineJson);
    std::string applyTonnetzTransform(const std::string& hpcpJson);
    std::vector<essentia::Real> applyTonnetzTransform(const std::vector<essentia::Real>& hpcp);

private:
    EssentiaWrapper* mWrapper;
};

#endif
