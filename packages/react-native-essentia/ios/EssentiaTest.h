#import <React/RCTBridgeModule.h>

@interface EssentiaTest : NSObject <RCTBridgeModule>
- (void)testCppIntegration:(NSArray*)input resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
@end