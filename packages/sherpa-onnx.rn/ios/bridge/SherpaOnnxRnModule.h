#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Forward declaration for Swift classes
@class SherpaOnlineRecognizer;

// This header file ensures that the React Native module is properly exposed
// The actual implementation is in SherpaOnnxRnModule.m
@interface SherpaOnnxRnModule : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, strong) SherpaOnlineRecognizer *recognizer;
@end 