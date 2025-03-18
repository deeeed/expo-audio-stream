#import "EssentiaSimple.h"
#import <React/RCTLog.h>

// Include C++ code
#ifdef __cplusplus
#include <string>
#include <vector>

// Simple C++ class for testing
class SimpleCppClass {
public:
    std::string getVersion() {
        return "1.0.0";
    }

    std::vector<float> processData(const std::vector<float>& input) {
        std::vector<float> output;
        for (float value : input) {
            output.push_back(value * 2.0f);
        }
        return output;
    }
};
#endif

@implementation EssentiaSimple {
    SimpleCppClass* _cppInstance;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    if (self = [super init]) {
        _cppInstance = new SimpleCppClass();
    }
    return self;
}

- (void)dealloc {
    delete _cppInstance;
}

// Required for async methods
+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_EXPORT_METHOD(simpleMethod:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // Create test data
    std::vector<float> testData = {1.0f, 2.0f, 3.0f};

    // Process using C++ code
    std::vector<float> result = _cppInstance->processData(testData);

    // Convert result to NSArray
    NSMutableArray* resultArray = [NSMutableArray array];
    for (float value : result) {
        [resultArray addObject:@(value)];
    }

    // Return data and version
    NSDictionary* response = @{
        @"version": [NSString stringWithUTF8String:_cppInstance->getVersion().c_str()],
        @"data": resultArray
    };

    resolve(response);
}

@end