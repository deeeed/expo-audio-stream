#import "SherpaOnnxModule.h"

@implementation SherpaOnnxModule

RCT_EXPORT_MODULE(SherpaOnnx);

// Create a boolean to track if the library has loaded
static BOOL libraryLoaded = NO;

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

+ (BOOL)isLibraryLoaded {
    return libraryLoaded;
}

// Note: We are deliberately not loading the library in initialize anymore
// because Swift will handle that now
+ (void)initialize {
    // Just set libraryLoaded to YES so the Swift code can handle the actual loading
    libraryLoaded = YES;
}

- (instancetype)init {
    self = [super init];
    return self;
}

// Helper method to check library loaded and reject if not
- (void)checkLibraryLoaded:(RCTPromiseRejectBlock)reject {
    if (!libraryLoaded) {
        reject(@"ERR_NOT_INITIALIZED", @"Library not loaded", nil);
    }
}

// TTS Methods - forward to Swift module
RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] validateLibraryLoaded:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(initTts:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] initTts:config withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(generateTts:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] generateTts:config withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(stopTts:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] stopTts:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(releaseTts:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] releaseTts:resolve withRejecter:reject];
}

// ASR Methods
RCT_EXPORT_METHOD(initAsr:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] initAsr:config withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(recognizeFromSamples:(NSNumber *)sampleRate
                 audioBuffer:(NSArray *)samples
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] recognizeFromSamples:sampleRate audioBuffer:samples withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(recognizeFromFile:(NSString *)filePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] recognizeFromFile:filePath withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(releaseAsr:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] releaseAsr:resolve withRejecter:reject];
}

// Audio Tagging Methods
RCT_EXPORT_METHOD(initAudioTagging:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] initAudioTagging:config withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(processAudioSamples:(NSNumber *)sampleRate
                 audioBuffer:(NSArray *)samples
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] processAudioSamples:sampleRate audioBuffer:samples withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(computeAudioTagging:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] computeAudioTagging:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(processAndComputeAudioTagging:(NSString *)filePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] processAndComputeAudioTagging:filePath withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(processAudioFile:(NSString *)filePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] processAudioFile:filePath withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(releaseAudioTagging:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] releaseAudioTagging:resolve withRejecter:reject];
}

// Speaker ID Methods
RCT_EXPORT_METHOD(initSpeakerId:(NSDictionary *)config
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] initSpeakerId:config withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(processSpeakerIdSamples:(NSNumber *)sampleRate
                 samples:(NSArray *)samples
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] processSpeakerIdSamples:sampleRate audioBuffer:samples withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(computeSpeakerEmbedding:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] computeSpeakerEmbedding:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(registerSpeaker:(NSString *)name
                 embedding:(NSArray *)embedding
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] registerSpeaker:name embedding:embedding withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(removeSpeaker:(NSString *)name
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] removeSpeaker:name withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(getSpeakers:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] getSpeakers:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(identifySpeaker:(NSArray *)embedding
                 threshold:(NSNumber *)threshold
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] identifySpeaker:embedding threshold:threshold withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(verifySpeaker:(NSString *)name
                 embedding:(NSArray *)embedding
                 threshold:(NSNumber *)threshold
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] verifySpeaker:name embedding:embedding threshold:threshold withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(processSpeakerIdFile:(NSString *)filePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] processSpeakerIdFile:filePath withResolver:resolve withRejecter:reject];
}

RCT_EXPORT_METHOD(releaseSpeakerId:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] releaseSpeakerId:resolve withRejecter:reject];
}

// Archive Methods
RCT_EXPORT_METHOD(extractTarBz2:(NSString *)sourcePath
                 targetDir:(NSString *)targetDir
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    // Forward to Swift module
    [[self.bridge moduleForName:@"SherpaOnnxSwiftModule"] extractTarBz2:sourcePath targetDir:targetDir withResolver:resolve withRejecter:reject];
}

@end 