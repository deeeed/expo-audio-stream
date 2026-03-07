// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.h
// Core bridge module. Handles JavaScript-to-native calls via TurboModule (new architecture only).

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Import the generated spec header
#import "../codegen/SherpaOnnxSpec/SherpaOnnxSpec.h"

// Forward declaration for Swift classes
@class SherpaOnnxASRHandler;
@class SherpaOnnxTtsHandler;

@interface SherpaOnnxRnModule : RCTEventEmitter <RCTBridgeModule, NativeSherpaOnnxSpecSpec>
@property (nonatomic, strong) SherpaOnnxASRHandler *asrHandler;
@property (nonatomic, strong) SherpaOnnxTtsHandler *ttsHandler;
@end
