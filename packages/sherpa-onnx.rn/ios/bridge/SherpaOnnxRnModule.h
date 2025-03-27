// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.h
// Core bridge module. Handles JavaScript-to-native calls for both architectures.

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Forward declaration for Swift classes
@class SherpaOnlineRecognizer;

@interface SherpaOnnxRnModule : RCTEventEmitter <RCTBridgeModule
#ifdef RCT_NEW_ARCH_ENABLED
, SherpaOnnxSpec  // Conform to the spec for new architecture
#endif
>
@property (nonatomic, strong) SherpaOnlineRecognizer *recognizer;
@end