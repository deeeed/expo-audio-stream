// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.h
// Core bridge module. Handles JavaScript-to-native calls via TurboModule (new architecture only).

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// NOTE: The codegen spec header (SherpaOnnxSpec.h) contains C++ types (std::optional etc.)
// and CANNOT be included in this .h file because it would break Swift module compilation.
// It is included only in the .mm implementation file.
// We forward-declare the protocol here so the interface compiles in both ObjC and ObjC++ contexts.
@protocol NativeSherpaOnnxSpecSpec;

// Forward declaration for Swift classes
@class SherpaOnnxASRHandler;
@class SherpaOnnxTtsHandler;
@class SherpaOnnxAudioTaggingHandler;
@class SherpaOnnxSpeakerIdHandler;
@class SherpaOnnxKWSHandler;
@class SherpaOnnxVADHandler;
@class SherpaOnnxLanguageIdHandler;
@class SherpaOnnxPunctuationHandler;
@class SherpaOnnxDiarizationHandler;

@interface SherpaOnnxRnModule : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, strong) SherpaOnnxASRHandler *asrHandler;
@property (nonatomic, strong) SherpaOnnxTtsHandler *ttsHandler;
@property (nonatomic, strong) SherpaOnnxAudioTaggingHandler *audioTaggingHandler;
@property (nonatomic, strong) SherpaOnnxSpeakerIdHandler *speakerIdHandler;
@property (nonatomic, strong) SherpaOnnxKWSHandler *kwsHandler;
@property (nonatomic, strong) SherpaOnnxVADHandler *vadHandler;
@property (nonatomic, strong) SherpaOnnxLanguageIdHandler *languageIdHandler;
@property (nonatomic, strong) SherpaOnnxPunctuationHandler *punctuationHandler;
@property (nonatomic, strong) SherpaOnnxDiarizationHandler *diarizationHandler;
@end
