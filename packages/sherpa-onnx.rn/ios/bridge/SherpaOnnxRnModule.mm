// packages/sherpa-onnx.rn/ios/bridge/SherpaOnnxRnModule.mm
#import "SherpaOnnxRnModule.h"
#import <React/RCTLog.h>

// Include Swift interop header
#import "sherpa-onnx-rn-Swift.h"

#ifdef RCT_NEW_ARCH_ENABLED
// Import TurboModule headers
#import <ReactCommon/TurboModule.h>
#import <React/RCTUtils.h>
// Import the codegen-generated JSI header
#import "../codegen/SherpaOnnxSpec/SherpaOnnxSpec.h"
#endif

@implementation SherpaOnnxRnModule

RCT_EXPORT_MODULE(SherpaOnnx)

// This allows running off main thread
- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

// Supported events (for old architecture)
- (NSArray<NSString *> *)supportedEvents {
    return @[@"sherpaOnnxRecognitionResult", @"sherpaOnnxTtsProgress"];
}

// MARK: - Test Methods

// These parameter names have to exactly match what's expected by React Native
RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    // Use the static method from SherpaOnlineRecognizer to check if library is loaded
    NSDictionary *result = [SherpaOnlineRecognizer isLibraryLoaded];
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

// MARK: - Core Functionality

// Create a recognizer instance with the provided configuration
RCT_EXPORT_METHOD(createRecognizer:(NSDictionary *)config
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
#ifdef RCT_NEW_ARCH_ENABLED
        // For new architecture, we need to extract the value from the codegen wrapper
        NSDictionary *configDict = config;
#else
        NSDictionary *configDict = config;
#endif
        self.recognizer = [SherpaOnlineRecognizer createWithConfig:configDict];
        if (self.recognizer) {
            resolve(@{@"success": @YES});
        } else {
            reject(@"create_error", @"Failed to create recognizer", nil);
        }
    });
}

// In the new architecture, we need to implement these additional methods
#ifdef RCT_NEW_ARCH_ENABLED
// Implementation of getTurboModule for TurboModule support
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  try {
    // Use the codegen-generated SherpaOnnxSpecJSI class to create the TurboModule
    return std::make_shared<facebook::react::NativeSherpaOnnxSpecSpecJSI>(params);
  } catch (const std::exception &e) {
    // Handle potential exceptions, e.g., from memory allocation
    NSLog(@"Error creating sherpa-onnx TurboModule: %s", e.what());
    return nullptr;
  }
}
#endif

@end