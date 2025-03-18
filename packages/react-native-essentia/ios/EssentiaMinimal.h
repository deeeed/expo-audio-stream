#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>

@interface EssentiaMinimal : NSObject <RCTBridgeModule>
- (void)testEssentiaVersion:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)testSimpleAlgorithm:(NSArray *)input resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
// Algorithm information methods
- (void)getAlgorithmInfo:(nonnull NSString *)algorithm
                resolver:(nonnull RCTPromiseResolveBlock)resolve
                rejecter:(nonnull RCTPromiseRejectBlock)reject;

// - (void)getAlgorithmInfo:(nonnull NSString *)algorithm resolver:(nonnull RCTPromiseResolveBlock)resolve rejecter:(nonnull RCTPromiseRejectBlock)reject;
// - (void)getAllAlgorithms:(nonnull RCTPromiseResolveBlock)resolve rejecter:(nonnull RCTPromiseRejectBlock)reject;

@end