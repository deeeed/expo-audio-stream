#import <Foundation/Foundation.h>

@interface AudioFeaturesWrapper : NSObject

+ (nullable NSDictionary *)computeFrameWithSamples:(const float *)samples
                                        numSamples:(int)numSamples
                                        sampleRate:(int)sampleRate
                                         fftLength:(int)fftLength
                                            nMfcc:(int)nMfcc
                                       nMelFilters:(int)nMelFilters
                                       computeMfcc:(BOOL)computeMfcc
                                      computeChroma:(BOOL)computeChroma;

+ (void)initWithSampleRate:(int)sampleRate
                 fftLength:(int)fftLength
                    nMfcc:(int)nMfcc
               nMelFilters:(int)nMelFilters
               computeMfcc:(BOOL)computeMfcc
              computeChroma:(BOOL)computeChroma;

@end
