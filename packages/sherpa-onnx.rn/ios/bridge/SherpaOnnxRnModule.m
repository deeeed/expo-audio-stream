#import "SherpaOnnxRnModule.h"
#import "SherpaOnnxRnUtils.h"
#import "sherpa-onnx-rn-Swift.h"  // Generated Swift header

@implementation SherpaOnnxRnModule

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onResult", @"onEndpoint"];
}

RCT_EXPORT_METHOD(initialize:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // This is a placeholder implementation - you'll need to expand this
    // to convert the JS config to a proper C struct configuration
    // For now, we'll just create a simple recognizer with default settings
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        // Use the factory class to create configuration objects
        SherpaOnnxOnlineTransducerModelConfig transducerConfig = 
            [SherpaOnnxFactory createTransducerModelConfigWithEncoder:@""
                                                              decoder:@""
                                                               joiner:@""];
            
        SherpaOnnxFeatureConfig featConfig = 
            [SherpaOnnxFactory createFeatureConfigWithSampleRate:16000
                                                      featureDim:80];
            
        SherpaOnnxOnlineModelConfig modelConfig = 
            [SherpaOnnxFactory createOnlineModelConfigWithTokens:@""
                                                      transducer:transducerConfig];
            
        SherpaOnnxOnlineRecognizerConfig recognizerConfig = 
            [SherpaOnnxFactory createOnlineRecognizerConfigWithFeatConfig:featConfig
                                                              modelConfig:modelConfig
                                                           enableEndpoint:NO
                                                          decodingMethod:@"greedy_search"
                                                          maxActivePaths:4];
        
        // Create the recognizer using the factory directly
        self.recognizer = [SherpaOnnxFactory createRecognizerWithConfig:&recognizerConfig];
        
        dispatch_async(dispatch_get_main_queue(), ^{
            resolve(@{@"status": @"initialized"});
        });
    });
}

RCT_EXPORT_METHOD(acceptWaveform:(NSArray<NSNumber *> *)samples
                  sampleRate:(NSInteger)sampleRate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (!self.recognizer) {
        reject(@"not_initialized", @"Recognizer not initialized", nil);
        return;
    }
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        // Use the acceptWaveform method that takes an NSArray directly
        [self.recognizer acceptWaveform:samples sampleRate:(int)sampleRate];
        
        // Check for results
        if ([self.recognizer isReady]) {
            [self.recognizer decode];
            SherpaOnlineRecognitionResult *result = [self.recognizer getResult];
            
            dispatch_async(dispatch_get_main_queue(), ^{
                [self sendEventWithName:@"onResult" body:@{@"text": result.text}];
                resolve(@{@"status": @"success", @"text": result.text});
            });
        } else {
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve(@{@"status": @"processing"});
            });
        }
    });
}

RCT_EXPORT_METHOD(reset:(NSString *)hotwords
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (!self.recognizer) {
        reject(@"not_initialized", @"Recognizer not initialized", nil);
        return;
    }
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self.recognizer reset:hotwords];
        
        dispatch_async(dispatch_get_main_queue(), ^{
            resolve(@{@"status": @"reset"});
        });
    });
}

RCT_EXPORT_METHOD(isEndpoint:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (!self.recognizer) {
        reject(@"not_initialized", @"Recognizer not initialized", nil);
        return;
    }
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        BOOL isEndpoint = [self.recognizer isEndpoint];
        
        dispatch_async(dispatch_get_main_queue(), ^{
            if (isEndpoint) {
                [self sendEventWithName:@"onEndpoint" body:@{@"endpoint": @YES}];
            }
            resolve(@{@"isEndpoint": @(isEndpoint)});
        });
    });
}

@end 