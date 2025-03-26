#import <Foundation/Foundation.h>

// Simple utility functions for the SherpaOnnx module
@interface SherpaOnnxRnUtils : NSObject

// Convert NSArray to float array
+ (float *)convertSamplesToFloatArray:(NSArray<NSNumber *> *)samples length:(NSUInteger *)length;

// Free the float array created by convertSamplesToFloatArray
+ (void)freeFloatArray:(float *)array;

@end 