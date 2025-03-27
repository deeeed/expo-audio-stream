#ifdef RCT_NEW_ARCH_ENABLED
#pragma once

#import <React/RCTTurboModule.h>

/**
 * The spec for the SherpaOnnx module when using TurboModules.
 */
@protocol SherpaOnnxSpec <RCTTurboModule>

/**
 * Verify the library is properly loaded
 */
- (NSDictionary *)validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                               rejecter:(RCTPromiseRejectBlock)reject;

/**
 * Test C library integration
 */
- (NSDictionary *)testOnnxIntegration:(RCTPromiseResolveBlock)resolve
                             rejecter:(RCTPromiseRejectBlock)reject;

// You would add the other method specs here...
// - (NSDictionary *)initTts:(NSDictionary *)options resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
// etc.

@end

#endif // RCT_NEW_ARCH_ENABLED 