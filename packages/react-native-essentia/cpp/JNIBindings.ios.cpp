// packages/react-native-essentia/cpp/JNIBindings.ios.cpp
// This is a placeholder file that is used on iOS to satisfy the build system
// All the JNI functionality is implemented in the Objective-C++ wrapper instead
#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>

#include "EssentiaWrapper.h"
#include "FeatureExtractor.h"
#include "Utils.h"

@interface EssentiaModule : NSObject <RCTBridgeModule>
@property (nonatomic, assign) EssentiaWrapper* wrapper;
@end

@implementation EssentiaModule

RCT_EXPORT_MODULE(EssentiaModule);

// Initialize the module
- (instancetype)init {
    self = [super init];
    if (self) {
        self.wrapper = new EssentiaWrapper();
    }
    return self;
}

// Deallocate the wrapper
- (void)dealloc {
    delete self.wrapper;
}

// Initialize Essentia
RCT_EXPORT_METHOD(initializeEssentia:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    bool success = self.wrapper->initialize();
    if (success) {
        resolve(@(YES));
    } else {
        reject(@"INITIALIZE_FAILED", @"Failed to initialize Essentia", nil);
    }
}

// Set audio data
RCT_EXPORT_METHOD(setAudioData:(NSArray<NSNumber *> *)audioData
                  sampleRate:(double)sampleRate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    std::vector<float> buffer;
    for (NSNumber *value in audioData) {
        buffer.push_back([value floatValue]);
    }
    bool success = self.wrapper->setAudioData(buffer, sampleRate);
    if (success) {
        resolve(@(YES));
    } else {
        reject(@"SET_AUDIO_FAILED", @"Failed to set audio data", nil);
    }
}

// Execute algorithm
RCT_EXPORT_METHOD(executeAlgorithm:(NSString *)algorithm
                  paramsJson:(NSString *)paramsJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    std::string algoStr = [algorithm UTF8String];
    std::string paramsStr = [paramsJson UTF8String];
    std::string result = self.wrapper->executeAlgorithm(algoStr.c_str(), paramsStr.c_str());
    resolve(@(result.c_str()));
}

// Test connection (equivalent to testJniConnection)
RCT_EXPORT_METHOD(testConnection:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@"Connection successful");
}

// Get algorithm info
RCT_EXPORT_METHOD(getAlgorithmInfo:(NSString *)algorithm
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    std::string algoStr = [algorithm UTF8String];
    std::string result = self.wrapper->getAlgorithmInfo(algoStr.c_str());
    resolve(@(result.c_str()));
}

// Get all algorithms
RCT_EXPORT_METHOD(getAllAlgorithms:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    std::string result = self.wrapper->getAllAlgorithms();
    resolve(@(result.c_str()));
}

// Extract features
RCT_EXPORT_METHOD(extractFeatures:(NSString *)featuresJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    FeatureExtractor extractor(self.wrapper);
    std::string jsonStr = [featuresJson UTF8String];
    std::string result = extractor.extractFeatures(jsonStr.c_str());
    resolve(@(result.c_str()));
}

// Get version
RCT_EXPORT_METHOD(getVersion:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(essentia::version));
}

// Compute mel spectrogram
RCT_EXPORT_METHOD(computeMelSpectrogram:(int)frameSize
                  hopSize:(int)hopSize
                  nMels:(int)nMels
                  fMin:(float)fMin
                  fMax:(float)fMax
                  windowType:(NSString *)windowType
                  normalize:(BOOL)normalize
                  logScale:(BOOL)logScale
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    FeatureExtractor extractor(self.wrapper);
    std::string windowStr = [windowType UTF8String];
    std::string result = extractor.computeMelSpectrogram(frameSize, hopSize, nMels, fMin, fMax, windowStr.c_str(), normalize, logScale);
    resolve(@(result.c_str()));
}

// Execute pipeline
RCT_EXPORT_METHOD(executePipeline:(NSString *)pipelineJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    FeatureExtractor extractor(self.wrapper);
    std::string jsonStr = [pipelineJson UTF8String];
    std::string result = extractor.executePipeline(jsonStr.c_str());
    resolve(@(result.c_str()));
}

// Compute spectrum
RCT_EXPORT_METHOD(computeSpectrum:(int)frameSize
                  hopSize:(int)hopSize
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    self.wrapper->computeSpectrum(frameSize, hopSize);
    bool success = self.wrapper->getSpectrumComputed();
    resolve(@(success));
}

// Compute Tonnetz
RCT_EXPORT_METHOD(computeTonnetz:(NSString *)hpcpJson
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    const char* jsonStr = [hpcpJson UTF8String];
    std::string result;
    try {
        nlohmann::json inputJson = nlohmann::json::parse(jsonStr);
        if (inputJson.is_array()) {
            std::vector<essentia::Real> hpcp;
            for (const auto& element : inputJson) {
                if (element.is_number()) {
                    hpcp.push_back(static_cast<essentia::Real>(element.get<double>()));
                }
            }
            std::vector<essentia::Real> tonnetz = self.wrapper->applyTonnetzTransform(hpcp);
            nlohmann::json resultJson;
            resultJson["success"] = true;
            resultJson["data"] = {{"tonnetz", tonnetz}};
            result = resultJson.dump();
        } else {
            result = createErrorResponse("HPCP must be an array", "INVALID_INPUT");
        }
    } catch (const std::exception& e) {
        result = createErrorResponse(e.what(), "PROCESSING_ERROR");
    }
    resolve(@(result.c_str()));
}

@end
