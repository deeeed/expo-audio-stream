#import "SherpaOnnxRnModule.h"
#import "sherpa-onnx-rn-Swift.h"

#ifdef RCT_NEW_ARCH_ENABLED
// Just import TurboModule.h which seems to be found correctly
#import <ReactCommon/TurboModule.h>
#import <React/RCTUtils.h>
#endif

@implementation SherpaOnnxRnModule

RCT_EXPORT_MODULE(SherpaOnnx)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onResult", @"onEndpoint"];
}

// Architecture-specific implementations
#ifndef RCT_NEW_ARCH_ENABLED
// Old architecture methods use RCT_EXPORT_METHOD
RCT_EXPORT_METHOD(validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{
            @"loaded": @YES,
            @"status": @"Sherpa ONNX library validation check (no actual library calls yet)",
            @"testConfig": @{
                @"sampleRate": @16000,
                @"featureDim": @80
            }
        });
    });
}

RCT_EXPORT_METHOD(testOnnxIntegration:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        SherpaOnnxTester *tester = [[SherpaOnnxTester alloc] init];
        [tester testIntegration:^(NSDictionary *result) {
            resolve(result);
        }];
    });
}
#else
// New architecture methods use protocol-based implementation
- (void)validateLibraryLoaded:(RCTPromiseResolveBlock)resolve
                    rejecter:(RCTPromiseRejectBlock)reject
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(@{
            @"loaded": @YES,
            @"status": @"Sherpa ONNX library validation check (new arch)",
            @"testConfig": @{
                @"sampleRate": @16000,
                @"featureDim": @80
            }
        });
    });
}

- (void)testOnnxIntegration:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
{
    dispatch_async(dispatch_get_main_queue(), ^{
        SherpaOnnxTester *tester = [[SherpaOnnxTester alloc] init];
        [tester testIntegration:^(NSDictionary *result) {
            resolve(result);
        }];
    });
}
#endif

// Add a method to create the recognizer with a dictionary config
RCT_EXPORT_METHOD(createRecognizer:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        // Use the factory method instead of direct initialization with C structs
        self.recognizer = [SherpaOnlineRecognizer createWithConfig:config];
        if (self.recognizer) {
            resolve(@{@"success": @YES});
        } else {
            reject(@"create_error", @"Failed to create recognizer", nil);
        }
    });
}

// Add other RCT_EXPORT_METHODs here as needed...

#ifdef RCT_NEW_ARCH_ENABLED
// Simplest implementation for now
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const std::shared_ptr<facebook::react::CallInvoker> &)invoker 
{
//   // Log the issue for debugging
//   NSLog(@"WARNING: SherpaOnnx returning nullptr from getTurboModule - methods will be undefined in JS");
//   return nullptr; // Will compile but module methods won't be available in JS

  return std::make_shared<facebook::react::NativeSherpaOnnxSpecJSI>(self, invoker);

}
#endif

@end