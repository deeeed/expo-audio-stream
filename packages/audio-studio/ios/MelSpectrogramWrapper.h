#import <Foundation/Foundation.h>

@interface MelSpectrogramWrapper : NSObject

+ (nullable NSDictionary *)computeWithSamples:(const float *)samples
                                   numSamples:(int)numSamples
                                   sampleRate:(int)sampleRate
                                    fftLength:(int)fftLength
                            windowSizeSamples:(int)windowSizeSamples
                             hopLengthSamples:(int)hopLengthSamples
                                        nMels:(int)nMels
                                         fMin:(float)fMin
                                         fMax:(float)fMax
                                   windowType:(int)windowType
                                     logScale:(BOOL)logScale
                                    normalize:(BOOL)normalize;

+ (void)initWithSampleRate:(int)sampleRate
                 fftLength:(int)fftLength
         windowSizeSamples:(int)windowSizeSamples
          hopLengthSamples:(int)hopLengthSamples
                     nMels:(int)nMels
                      fMin:(float)fMin
                      fMax:(float)fMax
                windowType:(int)windowType;

+ (nullable NSArray<NSNumber *> *)computeFrameWithSamples:(const float *)samples
                                                frameSize:(int)frameSize;

@end
