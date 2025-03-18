#import <React/RCTBridgeModule.h>

@interface EssentiaSimple : NSObject <RCTBridgeModule>
- (void)simpleMethod:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
@end