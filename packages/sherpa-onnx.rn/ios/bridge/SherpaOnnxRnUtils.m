#import "SherpaOnnxRnUtils.h"

@implementation SherpaOnnxRnUtils

+ (float *)convertSamplesToFloatArray:(NSArray<NSNumber *> *)samples length:(NSUInteger *)length {
    if (!samples || samples.count == 0) {
        if (length) {
            *length = 0;
        }
        return NULL;
    }
    
    NSUInteger count = samples.count;
    float *floatArray = (float *)malloc(sizeof(float) * count);
    
    if (!floatArray) {
        if (length) {
            *length = 0;
        }
        return NULL;
    }
    
    for (NSUInteger i = 0; i < count; i++) {
        floatArray[i] = [samples[i] floatValue];
    }
    
    if (length) {
        *length = count;
    }
    
    return floatArray;
}

+ (void)freeFloatArray:(float *)array {
    if (array) {
        free(array);
    }
}

@end 