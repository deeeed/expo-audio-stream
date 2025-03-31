// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.h
// Core bridge module. Handles JavaScript-to-native calls for both architectures.

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
// Import the generated spec header
#import "../codegen/SherpaOnnxSpec/SherpaOnnxSpec.h"
#endif

// Forward declaration for Swift classes
@class SherpaOnnxASRHandler;
@class SherpaOnnxTtsHandler;

@interface SherpaOnnxRnModule : RCTEventEmitter <RCTBridgeModule
#ifdef RCT_NEW_ARCH_ENABLED
, NativeSherpaOnnxSpecSpec
#endif
>
@property (nonatomic, strong) SherpaOnnxASRHandler *asrHandler;
@property (nonatomic, strong) SherpaOnnxTtsHandler *ttsHandler;
@end