// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.mm
#import "SherpaOnnxRnModule.h"
#import <React/RCTLog.h>
#import <UIKit/UIKit.h>
#import <mach/mach.h>
#import <mach/task.h>
#import <mach/mach_init.h>

// Include Swift interop header
#import "sherpa-onnx-rn-Swift.h"

// Import our archive extractor
#import "SherpaOnnxArchiveExtractor.h"

// TurboModule headers
#import <ReactCommon/TurboModule.h>
#import <React/RCTUtils.h>
// Import the codegen-generated JSI header (from React-Codegen pod, not local copy)
#import <SherpaOnnxSpec/SherpaOnnxSpec.h>

// Add protocol conformance here (in .mm) rather than in .h, because the codegen header
// contains C++ types that break Swift module compilation if included in the .h
@interface SherpaOnnxRnModule () <NativeSherpaOnnxSpecSpec>
@end

@implementation SherpaOnnxRnModule

RCT_EXPORT_MODULE(SherpaOnnx)

// This allows running off main thread
- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

// Initializer
- (instancetype)init {
    NSLog(@"🚀 [SherpaOnnx] Module init called");
    self = [super init];
    if (self) {
        NSLog(@"🚀 [SherpaOnnx] Creating ASR handler...");
        @try {
            self.asrHandler = [[SherpaOnnxASRHandler alloc] init];
            NSLog(@"✅ [SherpaOnnx] ASR handler created");
        } @catch (NSException *exception) {
            NSLog(@"❌ [SherpaOnnx] Failed to create ASR handler: %@", exception);
        }
        
        NSLog(@"🚀 [SherpaOnnx] Creating TTS handler...");
        @try {
            self.ttsHandler = [[SherpaOnnxTtsHandler alloc] init];
            NSLog(@"✅ [SherpaOnnx] TTS handler created");
        } @catch (NSException *exception) {
            NSLog(@"❌ [SherpaOnnx] Failed to create TTS handler: %@", exception);
        }
        
        NSLog(@"✅ [SherpaOnnx] Module init completed");
    } else {
        NSLog(@"❌ [SherpaOnnx] Module init failed - super init returned nil");
    }
    return self;
}

// Add a class method to verify the module loads
+ (void)initialize {
    if (self == [SherpaOnnxRnModule class]) {
        NSLog(@"🎯 [SherpaOnnx] Module class initialized");
    }
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

// Get architecture information for debugging and diagnostics
RCT_EXPORT_METHOD(getArchitectureInfo:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSLog(@"🔍 [SherpaOnnx] getArchitectureInfo called");
    NSString *architecture = @"ios-new";
    NSString *moduleType = @"TurboModule";
    BOOL turboModulesEnabled = YES;
    
    NSDictionary *result = @{
        @"architecture": architecture,
        @"jsiAvailable": @(NO), // JSI not exposed in iOS
        @"turboModulesEnabled": @(turboModulesEnabled),
        @"libraryLoaded": @([[SherpaOnnxASRHandler isLibraryLoaded][@"loaded"] boolValue]),
        @"currentThread": [NSThread currentThread].name ?: @"main",
        @"threadId": @([[NSThread currentThread].threadDictionary[@"threadId"] intValue] ?: 1),
        @"moduleType": moduleType
    };
    resolve(result);
}

// Get comprehensive system information for iOS
RCT_EXPORT_METHOD(getSystemInfo:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSLog(@"🔍 [SherpaOnnx] getSystemInfo called");
    NSString *architectureType = @"new";
    NSString *architectureDescription = @"New Architecture (TurboModules)";
    NSString *moduleType = @"TurboModule";
    BOOL turboModulesEnabled = YES;
    
    // Architecture information
    NSDictionary *architectureInfo = @{
        @"type": architectureType,
        @"description": architectureDescription,
        @"jsiAvailable": @(NO),
        @"turboModulesEnabled": @(turboModulesEnabled),
        @"moduleType": moduleType
    };
    
    // Memory information
    NSProcessInfo *processInfo = [NSProcessInfo processInfo];
    double totalMemoryMB = processInfo.physicalMemory / 1024.0 / 1024.0;
    
    // Get current memory usage
    struct mach_task_basic_info info;
    mach_msg_type_number_t size = MACH_TASK_BASIC_INFO_COUNT;
    if (task_info(mach_task_self(), MACH_TASK_BASIC_INFO, (task_info_t)&info, &size) == KERN_SUCCESS) {
        double usedMemoryMB = info.resident_size / 1024.0 / 1024.0;
        
        NSDictionary *memoryInfo = @{
            @"maxMemoryMB": @(totalMemoryMB),
            @"totalMemoryMB": @(totalMemoryMB),
            @"freeMemoryMB": @(totalMemoryMB - usedMemoryMB),
            @"usedMemoryMB": @(usedMemoryMB),
            @"systemTotalMemoryMB": @(totalMemoryMB)
        };
        
        // CPU information
        NSDictionary *cpuInfo = @{
            @"availableProcessors": @(processInfo.processorCount),
            @"supportedAbis": @[@"arm64", @"x86_64"] // iOS supports these architectures
        };
        
        // Device information
        UIDevice *device = [UIDevice currentDevice];
        NSDictionary *deviceInfo = @{
            @"brand": @"Apple",
            @"model": device.model,
            @"device": device.name,
            @"manufacturer": @"Apple",
            @"iosVersion": device.systemVersion
        };
        
        // GPU information - Metal support
        NSString *metalVersion = @"Metal";
        #if TARGET_OS_SIMULATOR
        metalVersion = @"Metal (Simulator)";
        #endif
        
        NSDictionary *gpuInfo = @{
            @"metalVersion": metalVersion
        };
        
        // Thread information
        NSDictionary *threadInfo = @{
            @"currentThread": [NSThread currentThread].name ?: @"main",
            @"threadId": @([[NSThread currentThread].threadDictionary[@"threadId"] intValue] ?: 1)
        };
        
        NSDictionary *result = @{
            @"architecture": architectureInfo,
            @"memory": memoryInfo,
            @"cpu": cpuInfo,
            @"device": deviceInfo,
            @"gpu": gpuInfo,
            @"libraryLoaded": @([[SherpaOnnxASRHandler isLibraryLoaded][@"loaded"] boolValue]),
            @"thread": threadInfo
        };
        resolve(result);
    } else {
        reject(@"system_info_error", @"Failed to get system information", nil);
    }
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
RCT_EXPORT_METHOD(initAsr:(JS::NativeSherpaOnnxSpec::SpecInitAsrConfig &)config
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    NSString *modelDir = config.modelDir();
    NSString *modelType = config.modelType();
    NSString *modelPath = config.modelPath();
    auto numThreads = config.numThreads();
    auto debug = config.debug();
    auto streaming = config.streaming();
    auto sampleRate = config.sampleRate();
    auto featureDim = config.featureDim();
    NSString *decodingMethod = config.decodingMethod();
    auto maxActivePaths = config.maxActivePaths();
    NSString *provider = config.provider();

    // Model file paths (flattened from modelFiles object)
    NSString *modelFileEncoder = config.modelFileEncoder();
    NSString *modelFileDecoder = config.modelFileDecoder();
    NSString *modelFileJoiner = config.modelFileJoiner();
    NSString *modelFileTokens = config.modelFileTokens();
    NSString *modelFileModel = config.modelFileModel();
    NSString *modelFilePreprocessor = config.modelFilePreprocessor();
    NSString *modelFileUncachedDecoder = config.modelFileUncachedDecoder();
    NSString *modelFileCachedDecoder = config.modelFileCachedDecoder();

    NSMutableDictionary *configDict = [NSMutableDictionary dictionary];
    if (modelDir) [configDict setObject:modelDir forKey:@"modelDir"];
    if (modelType) [configDict setObject:modelType forKey:@"modelType"];
    if (modelPath) [configDict setObject:modelPath forKey:@"modelPath"];
    if (numThreads) [configDict setObject:@(*numThreads) forKey:@"numThreads"];
    if (debug) [configDict setObject:@(*debug) forKey:@"debug"];
    if (streaming) [configDict setObject:@(*streaming) forKey:@"streaming"];
    if (sampleRate) [configDict setObject:@(*sampleRate) forKey:@"sampleRate"];
    if (featureDim) [configDict setObject:@(*featureDim) forKey:@"featureDim"];
    if (decodingMethod) [configDict setObject:decodingMethod forKey:@"decodingMethod"];
    if (maxActivePaths) [configDict setObject:@(*maxActivePaths) forKey:@"maxActivePaths"];
    if (provider) [configDict setObject:provider forKey:@"provider"];

    // Build modelFiles sub-dictionary
    NSMutableDictionary *modelFiles = [NSMutableDictionary dictionary];
    if (modelFileEncoder) [modelFiles setObject:modelFileEncoder forKey:@"encoder"];
    if (modelFileDecoder) [modelFiles setObject:modelFileDecoder forKey:@"decoder"];
    if (modelFileJoiner) [modelFiles setObject:modelFileJoiner forKey:@"joiner"];
    if (modelFileTokens) [modelFiles setObject:modelFileTokens forKey:@"tokens"];
    if (modelFileModel) [modelFiles setObject:modelFileModel forKey:@"model"];
    if (modelFilePreprocessor) [modelFiles setObject:modelFilePreprocessor forKey:@"preprocessor"];
    if (modelFileUncachedDecoder) [modelFiles setObject:modelFileUncachedDecoder forKey:@"uncachedDecoder"];
    if (modelFileCachedDecoder) [modelFiles setObject:modelFileCachedDecoder forKey:@"cachedDecoder"];
    if (modelFiles.count > 0) [configDict setObject:modelFiles forKey:@"modelFiles"];

    @try {
        NSDictionary *result = [self.asrHandler initAsr:configDict];
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

// MARK: - ASR Online Streaming Methods

RCT_EXPORT_METHOD(createAsrOnlineStream:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler createAsrOnlineStream];
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_ASR_STREAM", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_STREAM", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(acceptAsrOnlineWaveform:(double)sampleRate
                  samples:(NSArray *)samples
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler acceptAsrOnlineWaveform:(int)sampleRate samples:samples];
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_ASR_WAVEFORM", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_WAVEFORM", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(isAsrOnlineEndpoint:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler isAsrOnlineEndpoint];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_ENDPOINT", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getAsrOnlineResult:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler getAsrOnlineResult];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_RESULT", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(resetAsrOnlineStream:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        NSDictionary *result = [self.asrHandler resetAsrOnlineStream];
        if ([result[@"success"] boolValue]) {
            resolve(result);
        } else {
            reject(@"ERR_ASR_RESET", result[@"error"], nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_ASR_RESET", exception.reason, nil);
    }
}

// MARK: - TTS Methods


RCT_EXPORT_METHOD(initTts:(JS::NativeSherpaOnnxSpec::SpecInitTtsConfig &)config
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    NSString *modelDir = config.modelDir();
    NSString *modelType = config.modelType();
    NSString *modelFile = config.modelFile();
    NSString *tokensFile = config.tokensFile();
    NSString *acousticModelName = config.acousticModelName();
    NSString *vocoder = config.vocoder();
    NSString *voices = config.voices();
    NSString *lexicon = config.lexicon();
    NSString *dataDir = config.dataDir();
    NSString *dictDir = config.dictDir();
    NSString *ruleFsts = config.ruleFsts();
    NSString *ruleFars = config.ruleFars();
    auto numThreads = config.numThreads();
    auto debug = config.debug();
    auto noiseScale = config.noiseScale();
    auto noiseScaleW = config.noiseScaleW();
    auto lengthScale = config.lengthScale();
    NSString *lang = config.lang();

    NSMutableDictionary *configDict = [NSMutableDictionary dictionary];
    if (modelDir) [configDict setObject:modelDir forKey:@"modelDir"];
    if (modelType) [configDict setObject:modelType forKey:@"modelType"];
    if (modelFile) [configDict setObject:modelFile forKey:@"modelFile"];
    if (tokensFile) [configDict setObject:tokensFile forKey:@"tokensFile"];
    if (acousticModelName) [configDict setObject:acousticModelName forKey:@"acousticModelName"];
    if (vocoder) [configDict setObject:vocoder forKey:@"vocoder"];
    if (voices) [configDict setObject:voices forKey:@"voices"];
    if (lexicon) [configDict setObject:lexicon forKey:@"lexicon"];
    if (dataDir) [configDict setObject:dataDir forKey:@"dataDir"];
    if (dictDir) [configDict setObject:dictDir forKey:@"dictDir"];
    if (ruleFsts) [configDict setObject:ruleFsts forKey:@"ruleFsts"];
    if (ruleFars) [configDict setObject:ruleFars forKey:@"ruleFars"];
    if (numThreads) [configDict setObject:@(*numThreads) forKey:@"numThreads"];
    if (debug) [configDict setObject:@(*debug) forKey:@"debug"];
    if (noiseScale) [configDict setObject:@(*noiseScale) forKey:@"noiseScale"];
    if (noiseScaleW) [configDict setObject:@(*noiseScaleW) forKey:@"noiseScaleW"];
    if (lengthScale) [configDict setObject:@(*lengthScale) forKey:@"lengthScale"];
    if (lang) [configDict setObject:lang forKey:@"lang"];
    RCTLogInfo(@"[SherpaOnnxRnModule.mm] initTts entered.");
    @try {
        RCTLogInfo(@"[SherpaOnnxRnModule.mm] Calling Swift ttsHandler.initTts...");
        NSDictionary *result = [self.ttsHandler initTts:configDict]; // Directly pass the dictionary
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

RCT_EXPORT_METHOD(generateTts:(JS::NativeSherpaOnnxSpec::SpecGenerateTtsConfig &)config
                   resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject)
{
    NSString *text = config.text();
    double speakerId = config.speakerId();
    double speakingRate = config.speakingRate();
    bool playAudio = config.playAudio();
    NSString *fileNamePrefix = config.fileNamePrefix();
    auto lengthScale = config.lengthScale();
    auto noiseScale = config.noiseScale();
    auto noiseScaleW = config.noiseScaleW();

    NSMutableDictionary *configDict = [NSMutableDictionary dictionary];
    if (text) [configDict setObject:text forKey:@"text"];
    [configDict setObject:@(speakerId) forKey:@"speakerId"];
    [configDict setObject:@(speakingRate) forKey:@"speakingRate"];
    [configDict setObject:@(playAudio) forKey:@"playAudio"];
    if (fileNamePrefix) [configDict setObject:fileNamePrefix forKey:@"fileNamePrefix"];
    if (lengthScale) [configDict setObject:@(*lengthScale) forKey:@"lengthScale"];
    if (noiseScale) [configDict setObject:@(*noiseScale) forKey:@"noiseScale"];
    if (noiseScaleW) [configDict setObject:@(*noiseScaleW) forKey:@"noiseScaleW"];
    @try {
        NSDictionary *result = [self.ttsHandler generateTts:configDict]; // Directly pass dict
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

// Implementation of getTurboModule for TurboModule support
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSherpaOnnxSpecSpecJSI>(params);
}

// MARK: - Audio Tagging Methods (Stubs for Protocol Conformance)

RCT_EXPORT_METHOD(initAudioTagging:(JS::NativeSherpaOnnxSpec::SpecInitAudioTaggingConfig &)config
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processAndComputeAudioTagging:(NSString *)filePath
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processAndComputeAudioSamples:(double)sampleRate
                              samples:(NSArray *)samples
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(releaseAudioTagging:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Audio tagging is not yet implemented on iOS", nil);
}

// MARK: - Speaker ID Methods (Stubs for Protocol Conformance)

RCT_EXPORT_METHOD(initSpeakerId:(JS::NativeSherpaOnnxSpec::SpecInitSpeakerIdConfig &)config
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processSpeakerIdSamples:(double)sampleRate
                        samples:(NSArray *)samples
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(computeSpeakerEmbedding:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(registerSpeaker:(NSString *)name
              embedding:(NSArray *)embedding
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(removeSpeaker:(NSString *)name
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(getSpeakers:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(identifySpeaker:(NSArray *)embedding
              threshold:(double)threshold
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(verifySpeaker:(NSString *)name
            embedding:(NSArray *)embedding
            threshold:(double)threshold
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(processSpeakerIdFile:(NSString *)filePath
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

RCT_EXPORT_METHOD(releaseSpeakerId:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"not_implemented", @"Speaker ID is not yet implemented on iOS", nil);
}

@end
