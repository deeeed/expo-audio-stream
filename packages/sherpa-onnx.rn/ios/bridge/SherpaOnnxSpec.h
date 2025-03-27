// packages/sherpa-onnx.rn/ios/SherpaOnnxSpec.h
// Defines the TurboModule interface (new architecture only).

#ifdef RCT_NEW_ARCH_ENABLED
#pragma once

#import <React/RCTBridgeModule.h>

@protocol SherpaOnnxSpec <RCTBridgeModule>

- (void)validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                    rejecter:(RCTPromiseRejectBlock)reject;
- (void)testOnnxIntegration:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject;

@end

#endif // RCT_NEW_ARCH_ENABLED
