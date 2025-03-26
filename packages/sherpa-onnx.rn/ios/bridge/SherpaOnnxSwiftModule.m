//
//  SherpaOnnxSwiftModule.m
//  sherpa-onnx-rn
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SherpaOnnxSwiftModule, NSObject)

// Common Methods
RCT_EXTERN_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

// TTS Methods
RCT_EXTERN_METHOD(initTts:(NSDictionary *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateTts:(NSDictionary *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopTts:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(releaseTts:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

// ASR Methods
RCT_EXTERN_METHOD(initAsr:(NSDictionary *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(recognizeFromSamples:(nonnull NSNumber *)sampleRate
                 audioBuffer:(NSArray *)audioBuffer
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(recognizeFromFile:(NSString *)filePath
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(releaseAsr:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

// Audio Tagging Methods
RCT_EXTERN_METHOD(initAudioTagging:(NSDictionary *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(processAudioSamples:(nonnull NSNumber *)sampleRate
                 audioBuffer:(NSArray *)audioBuffer
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(computeAudioTagging:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(processAndComputeAudioTagging:(NSString *)filePath
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(processAudioFile:(NSString *)filePath
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(releaseAudioTagging:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

// Speaker ID Methods
RCT_EXTERN_METHOD(initSpeakerId:(NSDictionary *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(processSpeakerIdSamples:(nonnull NSNumber *)sampleRate
                 audioBuffer:(NSArray *)audioBuffer
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(computeSpeakerEmbedding:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(registerSpeaker:(NSString *)name
                 embedding:(NSArray *)embedding
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeSpeaker:(NSString *)name
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSpeakers:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(identifySpeaker:(NSArray *)embedding
                 threshold:(nonnull NSNumber *)threshold
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifySpeaker:(NSString *)name
                 embedding:(NSArray *)embedding
                 threshold:(nonnull NSNumber *)threshold
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(processSpeakerIdFile:(NSString *)filePath
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(releaseSpeakerId:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

// Archive Methods
RCT_EXTERN_METHOD(extractTarBz2:(NSString *)sourcePath
                 targetDir:(NSString *)targetDir
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

@end 