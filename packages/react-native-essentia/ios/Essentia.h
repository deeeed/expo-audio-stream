#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface Essentia : NSObject <RCTBridgeModule>

// Core functionality
- (void)initialize:(RCTPromiseResolveBlock)resolve
          rejecter:(RCTPromiseRejectBlock)reject;

- (void)setAudioData:(NSArray *)audioData
          sampleRate:(double)sampleRate
            resolver:(RCTPromiseResolveBlock)resolve
            rejecter:(RCTPromiseRejectBlock)reject;

- (void)executeAlgorithm:(NSString *)algorithm
                  params:(NSDictionary *)params
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject;

// Algorithm information methods
- (void)getAlgorithmInfo:(NSString *)algorithm
                resolver:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject;

- (void)getAllAlgorithms:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject;

// Feature extraction methods
- (void)extractFeatures:(NSArray *)features
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject;

- (void)computeMelSpectrogram:(nonnull NSNumber *)frameSize
                      hopSize:(nonnull NSNumber *)hopSize
                        nMels:(nonnull NSNumber *)nMels
                         fMin:(nonnull NSNumber *)fMin
                         fMax:(nonnull NSNumber *)fMax
                   windowType:(NSString *)windowType
                    normalize:(nonnull NSNumber *)normalize
                     logScale:(nonnull NSNumber *)logScale
                     resolver:(RCTPromiseResolveBlock)resolve
                     rejecter:(RCTPromiseRejectBlock)reject;

- (void)executePipeline:(NSDictionary *)pipelineConfig
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject;

- (void)computeSpectrum:(nonnull NSNumber *)frameSize
                hopSize:(nonnull NSNumber *)hopSize
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject;

- (void)computeTonnetz:(NSArray *)hpcp
              resolver:(RCTPromiseResolveBlock)resolve
              rejecter:(RCTPromiseRejectBlock)reject;

// Convenience methods for specific algorithms
// (Add more convenience methods as needed)

- (void)testJniConnection:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject;

- (void)getVersion:(RCTPromiseResolveBlock)resolve
          rejecter:(RCTPromiseRejectBlock)reject;

@end
