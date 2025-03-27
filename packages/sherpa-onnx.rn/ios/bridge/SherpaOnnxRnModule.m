#import "SherpaOnnxRnModule.h"
#import "sherpa-onnx-rn-Swift.h"  // Generated Swift header

#ifdef RCT_NEW_ARCH_ENABLED
// Import the spec for new architecture
#import <React/RCTTurboModuleManager.h>
// You'd typically use a generated spec like:
// #import <SherpaOnnxSpec/SherpaOnnxSpec.h>
#endif

@implementation SherpaOnnxRnModule

// Use the same module name for both architectures - make it explicit
RCT_EXPORT_MODULE(SherpaOnnx)

// Add this to ensure this module runs on the main thread
+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onResult", @"onEndpoint"];
}

// =========================================================================
// Initialization and Validation
// =========================================================================

RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // Simple validation that doesn't require calling C functions
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{
            @"loaded": @YES,
            @"status": @"Sherpa ONNX library validation check (no actual library calls yet)",
            @"testConfig": @{
                @"sampleRate": @16000,
                @"featureDim": @80
            }
        });
    });
}

// =========================================================================
// Archive Methods
// =========================================================================

RCT_EXPORT_METHOD(extractTarBz2:(NSString *)sourcePath
                  targetDir:(NSString *)targetDir
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve(@{@"status": @"not implemented yet"});
}

// =========================================================================
// TTS Methods
// =========================================================================

RCT_EXPORT_METHOD(initTts:(NSDictionary *)modelConfig
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // This is a placeholder implementation
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"tts initialized (placeholder)"});
    });
}

RCT_EXPORT_METHOD(generateTts:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // This is a placeholder implementation
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"tts generated (placeholder)"});
    });
}

RCT_EXPORT_METHOD(stopTts:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"tts stopped (placeholder)"});
    });
}

RCT_EXPORT_METHOD(releaseTts:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"tts released (placeholder)"});
    });
}

// =========================================================================
// ASR Methods
// =========================================================================

RCT_EXPORT_METHOD(initAsr:(NSDictionary *)modelConfig
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"asr initialized (placeholder)"});
    });
}

RCT_EXPORT_METHOD(recognizeFromSamples:(NSInteger)sampleRate
                  audioBuffer:(NSArray *)audioBuffer
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"asr recognized from samples (placeholder)"});
    });
}

RCT_EXPORT_METHOD(recognizeFromFile:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"asr recognized from file (placeholder)"});
    });
}

RCT_EXPORT_METHOD(releaseAsr:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"asr released (placeholder)"});
    });
}

// =========================================================================
// AudioTagging Methods
// =========================================================================

RCT_EXPORT_METHOD(initAudioTagging:(NSDictionary *)modelConfig
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio tagging initialized (placeholder)"});
    });
}

RCT_EXPORT_METHOD(processAudioSamples:(NSInteger)sampleRate
                  audioBuffer:(NSArray *)audioBuffer
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio samples processed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(computeAudioTagging:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio tagging computed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(releaseAudioTagging:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio tagging released (placeholder)"});
    });
}

RCT_EXPORT_METHOD(processAndComputeAudioTagging:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio tagging processed and computed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(processAudioFile:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio file processed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(processAndComputeAudioSamples:(NSInteger)sampleRate
                  audioBuffer:(NSArray *)audioBuffer
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"audio samples processed and computed (placeholder)"});
    });
}

// =========================================================================
// SpeakerId Methods
// =========================================================================

RCT_EXPORT_METHOD(initSpeakerId:(NSDictionary *)modelConfig
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker id initialized (placeholder)"});
    });
}

RCT_EXPORT_METHOD(processSpeakerIdSamples:(NSInteger)sampleRate
                  audioBuffer:(NSArray *)audioBuffer
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker id samples processed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(computeSpeakerEmbedding:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker embedding computed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(registerSpeaker:(NSString *)name
                  embedding:(NSArray *)embedding
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker registered (placeholder)"});
    });
}

RCT_EXPORT_METHOD(removeSpeaker:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker removed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(getSpeakers:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"speakers": @[]});
    });
}

RCT_EXPORT_METHOD(identifySpeaker:(NSArray *)embedding
                  threshold:(float)threshold
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker identified (placeholder)"});
    });
}

RCT_EXPORT_METHOD(verifySpeaker:(NSString *)name
                  embedding:(NSArray *)embedding
                  threshold:(float)threshold
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker verified (placeholder)"});
    });
}

RCT_EXPORT_METHOD(processSpeakerIdFile:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker id file processed (placeholder)"});
    });
}

RCT_EXPORT_METHOD(releaseSpeakerId:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"speaker id released (placeholder)"});
    });
}

// =========================================================================
// Existing implementation for initialize
// =========================================================================

RCT_EXPORT_METHOD(initialize:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    // For validation only, return success without creating the recognizer
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{@"status": @"initialization simulated for validation"});
    });
}

// Existing acceptWaveform method
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

// Existing reset method
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

// Existing isEndpoint method
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

RCT_EXPORT_METHOD(testOnnxIntegration:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        // Use Swift implementation to test integration
        SherpaOnnxTester *tester = [[SherpaOnnxTester alloc] init];
        [tester testIntegration:^(NSDictionary *result) {
            resolve(result);
        }];
    });
}

// End of the implementation, add the TurboModule method
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSherpaOnnxSpecJSI>(params);
}
#endif

@end 