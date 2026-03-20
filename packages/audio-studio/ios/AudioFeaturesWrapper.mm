#import "AudioFeaturesWrapper.h"

// Only include the NEW AudioFeatures files.
// kiss_fft and MelSpectrogram sources are already compiled via MelSpectrogramWrapper.mm.
#include "AudioFeatures.cpp"
#include "AudioFeaturesBridge.cpp"

@implementation AudioFeaturesWrapper

+ (nullable NSDictionary *)computeFrameWithSamples:(const float *)samples
                                        numSamples:(int)numSamples
                                        sampleRate:(int)sampleRate
                                         fftLength:(int)fftLength
                                            nMfcc:(int)nMfcc
                                       nMelFilters:(int)nMelFilters
                                       computeMfcc:(BOOL)computeMfcc
                                      computeChroma:(BOOL)computeChroma
{
    CAudioFeaturesResult* result = audio_features_compute(
        samples, numSamples, sampleRate,
        fftLength, nMfcc, nMelFilters,
        computeMfcc ? 1 : 0, computeChroma ? 1 : 0);

    if (!result) {
        return nil;
    }

    NSMutableArray<NSNumber *> *mfccArray = [NSMutableArray arrayWithCapacity:result->mfccCount];
    for (int i = 0; i < result->mfccCount; i++) {
        [mfccArray addObject:@(result->mfcc[i])];
    }

    NSMutableArray<NSNumber *> *chromaArray = [NSMutableArray arrayWithCapacity:result->chromagramCount];
    for (int i = 0; i < result->chromagramCount; i++) {
        [chromaArray addObject:@(result->chromagram[i])];
    }

    NSDictionary *dict = @{
        @"spectralCentroid": @(result->spectralCentroid),
        @"spectralFlatness": @(result->spectralFlatness),
        @"spectralRolloff": @(result->spectralRolloff),
        @"spectralBandwidth": @(result->spectralBandwidth),
        @"mfcc": mfccArray,
        @"chromagram": chromaArray
    };

    audio_features_free(result);

    return dict;
}

+ (void)initWithSampleRate:(int)sampleRate
                 fftLength:(int)fftLength
                    nMfcc:(int)nMfcc
               nMelFilters:(int)nMelFilters
               computeMfcc:(BOOL)computeMfcc
              computeChroma:(BOOL)computeChroma
{
    audio_features_init(sampleRate, fftLength, nMfcc, nMelFilters,
        computeMfcc ? 1 : 0, computeChroma ? 1 : 0);
}

@end
