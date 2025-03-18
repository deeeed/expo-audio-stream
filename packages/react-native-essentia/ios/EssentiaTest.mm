#import "EssentiaTest.h"
#import <React/RCTLog.h>

// Include the C++ wrapper
#ifdef __cplusplus
#include "../cpp/SimpleWrapper.h"
#endif

@implementation EssentiaTest {
    SimpleWrapper* _wrapper;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    if (self = [super init]) {
        _wrapper = new SimpleWrapper();
    }
    return self;
}

- (void)dealloc {
    delete _wrapper;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_EXPORT_METHOD(testCppIntegration:(NSArray*)input
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // Convert NSArray to std::vector<float>
    std::vector<float> inputVector;
    for (NSNumber* num in input) {
        inputVector.push_back([num floatValue]);
    }

    // Process using C++ wrapper
    std::vector<float> resultVector = _wrapper->doubleValues(inputVector);

    // Convert result back to NSArray
    NSMutableArray* resultArray = [NSMutableArray array];
    for (float value : resultVector) {
        [resultArray addObject:@(value)];
    }

    // Get version from C++ wrapper
    NSString* version = [NSString stringWithUTF8String:_wrapper->getVersion().c_str()];

    NSDictionary* response = @{
        @"version": version,
        @"data": resultArray
    };

    resolve(response);
}

@end
