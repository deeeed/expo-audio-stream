#ifdef __cplusplus
#import "rncpp.h"
#endif

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNRncppSpec.h"

@interface Rncpp : NSObject <NativeRncppSpec>
#else
#import <React/RCTBridgeModule.h>

@interface Rncpp : NSObject <RCTBridgeModule>
#endif

@end
