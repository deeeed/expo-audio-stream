// packages/react-native-essentia/ios/Essentia.h
#import <React/RCTBridgeModule.h>

@interface Essentia : NSObject <RCTBridgeModule>

// Core functionality
- (void)initialize:(nonnull RCTPromiseResolveBlock)resolve
          rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)setAudioData:(nonnull NSArray *)audioData
          sampleRate:(nonnull NSNumber *)sampleRate
            resolver:(nonnull RCTPromiseResolveBlock)resolve
            rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)executeAlgorithm:(nonnull NSString *)algorithm
                  params:(nonnull NSDictionary *)params
                resolver:(nonnull RCTPromiseResolveBlock)resolve
                rejecter:(nonnull RCTPromiseRejectBlock)reject;

// Algorithm information methods
- (void)getAlgorithmInfo:(nonnull NSString *)algorithm
                resolver:(nonnull RCTPromiseResolveBlock)resolve
                rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)getAllAlgorithms:(nonnull RCTPromiseResolveBlock)resolve
                rejecter:(nonnull RCTPromiseRejectBlock)reject;

// Feature extraction methods
- (void)extractFeatures:(nonnull NSArray *)features
               resolver:(nonnull RCTPromiseResolveBlock)resolve
               rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)executeBatch:(nonnull NSArray *)algorithms
            resolver:(nonnull RCTPromiseResolveBlock)resolve
            rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)computeMelSpectrogram:(nonnull NSNumber *)frameSize
                      hopSize:(nonnull NSNumber *)hopSize
                        nMels:(nonnull NSNumber *)nMels
                         fMin:(nonnull NSNumber *)fMin
                         fMax:(nonnull NSNumber *)fMax
                   windowType:(nonnull NSString *)windowType
                    normalize:(nonnull NSNumber *)normalize
                     logScale:(nonnull NSNumber *)logScale
                     resolver:(nonnull RCTPromiseResolveBlock)resolve
                     rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)executePipeline:(nonnull NSString *)pipelineJsonString
               resolver:(nonnull RCTPromiseResolveBlock)resolve
               rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)computeSpectrum:(nonnull NSNumber *)frameSize
                hopSize:(nonnull NSNumber *)hopSize
               resolver:(nonnull RCTPromiseResolveBlock)resolve
               rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)computeTonnetz:(nonnull NSArray *)hpcp
              resolver:(nonnull RCTPromiseResolveBlock)resolve
              rejecter:(nonnull RCTPromiseRejectBlock)reject;

// Convenience methods for specific algorithms
// (Add more convenience methods as needed)

- (void)testConnection:(nonnull RCTPromiseResolveBlock)resolve
              rejecter:(nonnull RCTPromiseRejectBlock)reject;

- (void)getVersion:(nonnull RCTPromiseResolveBlock)resolve
          rejecter:(nonnull RCTPromiseRejectBlock)reject;

@end
