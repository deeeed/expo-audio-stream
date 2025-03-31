// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.mm
#import "SherpaOnnxRnModule.h"
#import <React/RCTLog.h>

// Include Swift interop header
#import "sherpa-onnx-rn-Swift.h"

// Import our archive extractor
#import "SherpaOnnxArchiveExtractor.h"

#ifdef RCT_NEW_ARCH_ENABLED
// Import TurboModule headers
#import <ReactCommon/TurboModule.h>
#import <React/RCTUtils.h>
// Import the codegen-generated JSI header
#import "../codegen/SherpaOnnxSpec/SherpaOnnxSpec.h"
#endif

@implementation SherpaOnnxRnModule

RCT_EXPORT_MODULE(SherpaOnnx)

// This allows running off main thread
- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

// Initializer
- (instancetype)init {
    self = [super init];
    if (self) {
        self.asrHandler = [[SherpaOnnxASRHandler alloc] init];
        self.ttsHandler = [[SherpaOnnxTtsHandler alloc] init];
    }
    return self;
}

// Supported events (for old architecture)
- (NSArray<NSString *> *)supportedEvents {
    return @[@"sherpaOnnxRecognitionResult", @"sherpaOnnxTtsProgress"];
}

// MARK: - Test Methods

// These parameter names have to exactly match what's expected by React Native
RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    // Use the static method from SherpaOnnxASRHandler to check if library is loaded
    NSDictionary *result = [SherpaOnnxASRHandler isLibraryLoaded];
    resolve(result);
}

// Test the ONNX integration
RCT_EXPORT_METHOD(testOnnxIntegration:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    SherpaOnnxTester *tester = [[SherpaOnnxTester alloc] init];
    [tester testIntegration:^(NSDictionary *result) {
        resolve(result);
    }];
}

// MARK: - Archive Methods

// Extract a tar.bz2 file to a target directory
RCT_EXPORT_METHOD(extractTarBz2:(NSString *)sourcePath
                  targetDir:(NSString *)targetDir
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [SherpaOnnxArchiveExtractor extractTarBz2:sourcePath targetDir:targetDir completion:^(SherpaOnnxExtractionResult *result) {
        if (result.success) {
            // Create result dictionary for JS
            NSDictionary *resultDict = @{
                @"success": @(result.success),
                @"message": result.message,
                @"extractedFiles": result.extractedFiles
            };
            resolve(resultDict);
        } else {
            reject(@"extract_error", result.message, nil);
        }
    }];
}

// MARK: - ASR Methods

// Initialize ASR with the provided configuration
RCT_EXPORT_METHOD(initAsr:(NSDictionary *)config
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler initAsr:config];
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_ASR_INIT", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_INIT", exception.reason, nil);
    }
}

// Recognize speech from audio samples
RCT_EXPORT_METHOD(recognizeFromSamples:(double)sampleRate
                               samples:(NSArray *)samples
                          resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler recognizeFromSamples:(int)sampleRate samples:samples];
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_ASR_RECOGNIZE", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_RECOGNIZE", exception.reason, nil);
    }
}

// Recognize speech from an audio file
RCT_EXPORT_METHOD(recognizeFromFile:(NSString *)filePath
                       resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler recognizeFromFile:filePath];
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_ASR_RECOGNIZE_FILE", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_RECOGNIZE_FILE", exception.reason, nil);
    }
}

// Release ASR resources
RCT_EXPORT_METHOD(releaseAsr:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler releaseResources];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_RELEASE", exception.reason, nil);
    }
}

// MARK: - TTS Methods


RCT_EXPORT_METHOD(initTts:(NSDictionary *)config
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    RCTLogInfo(@"[SherpaOnnxRnModule.mm] initTts entered.");
    @try {
        RCTLogInfo(@"[SherpaOnnxRnModule.mm] Calling Swift ttsHandler.initTts...");
        NSDictionary *result = [self.ttsHandler initTts:config]; // Directly pass the dictionary
        RCTLogInfo(@"[SherpaOnnxRnModule.mm] Swift ttsHandler.initTts returned: %@", result);
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_TTS_INIT", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_TTS_INIT", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(generateTts:(NSDictionary *)config
                   resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.ttsHandler generateTts:config]; // Directly pass dict
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_TTS_GENERATE", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_TTS_GENERATE", exception.reason, nil);
    }
}

// Stop TTS playback
RCT_EXPORT_METHOD(stopTts:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.ttsHandler stopTts];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERR_TTS_STOP", exception.reason, nil);
    }
}

// Release TTS resources
RCT_EXPORT_METHOD(releaseTts:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.ttsHandler releaseTts];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERR_TTS_RELEASE", exception.reason, nil);
    }
}

// In the new architecture, we need to implement these additional methods
#ifdef RCT_NEW_ARCH_ENABLED
// Implementation of getTurboModule for TurboModule support
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  try {
    // Use the codegen-generated SherpaOnnxSpecJSI class to create the TurboModule
    return std::make_shared<facebook::react::NativeSherpaOnnxSpecSpecJSI>(params);
  } catch (const std::exception &e) {
    // Handle potential exceptions, e.g., from memory allocation
    NSLog(@"Error creating sherpa-onnx TurboModule: %s", e.what());
    return nullptr;
  }
}
#endif

// MARK: - Future Implementations

// The following methods are placeholders for future implementation to match the Android version

// Audio Tagging methods
RCT_EXPORT_METHOD(initAudioTagging:(NSDictionary *)config
               resolver:(RCTPromiseResolveBlock)resolver
               rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processAndComputeAudioTagging:(NSString *)filePath
                            resolver:(RCTPromiseResolveBlock)resolver
                            rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processAndComputeAudioSamples:(nonnull NSNumber *)sampleRate
                             samples:(nonnull NSArray<NSNumber *> *)samples
                            resolver:(RCTPromiseResolveBlock)resolver
                            rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(releaseAudioTagging:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

// Speaker ID methods
RCT_EXPORT_METHOD(initSpeakerId:(NSDictionary *)config
            resolver:(RCTPromiseResolveBlock)resolver
            rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processSpeakerIdSamples:(nonnull NSNumber *)sampleRate
                       samples:(nonnull NSArray<NSNumber *> *)samples
                      resolver:(RCTPromiseResolveBlock)resolver
                      rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(computeSpeakerEmbedding:(RCTPromiseResolveBlock)resolver
                      rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(registerSpeaker:(NSString *)name
             embedding:(nonnull NSArray<NSNumber *> *)embedding
              resolver:(RCTPromiseResolveBlock)resolver
              rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(removeSpeaker:(NSString *)name
            resolver:(RCTPromiseResolveBlock)resolver
            rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(getSpeakers:(RCTPromiseResolveBlock)resolver
          rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(identifySpeaker:(nonnull NSArray<NSNumber *> *)embedding
              threshold:(nonnull NSNumber *)threshold
               resolver:(RCTPromiseResolveBlock)resolver
               rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(verifySpeaker:(NSString *)name
           embedding:(nonnull NSArray<NSNumber *> *)embedding
           threshold:(nonnull NSNumber *)threshold
            resolver:(RCTPromiseResolveBlock)resolver
            rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processSpeakerIdFile:(NSString *)filePath
                   resolver:(RCTPromiseResolveBlock)resolver
                   rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(releaseSpeakerId:(RCTPromiseResolveBlock)resolver
               rejecter:(RCTPromiseRejectBlock)rejecter)
{
    // Not yet implemented
    rejecter(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

@end
