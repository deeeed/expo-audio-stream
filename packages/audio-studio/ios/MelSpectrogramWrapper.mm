#import "MelSpectrogramWrapper.h"

// Include C++ implementation directly since CocoaPods doesn't compile
// source files from outside the pod's root directory (../cpp/)
#include "kiss_fft/kiss_fft.c"
#include "kiss_fft/kiss_fftr.c"
#include "MelSpectrogram.cpp"
#include "MelSpectrogramBridge.cpp"

@implementation MelSpectrogramWrapper

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
                                    normalize:(BOOL)normalize
{
    CMelSpectrogramResult* result = mel_spectrogram_compute(
        samples, numSamples, sampleRate,
        fftLength, windowSizeSamples, hopLengthSamples,
        nMels, fMin, fMax,
        windowType, logScale ? 1 : 0, normalize ? 1 : 0);

    if (!result) {
        return nil;
    }

    // Convert flat float array to NSArray of NSArray<NSNumber>
    NSMutableArray *spectrogram = [NSMutableArray arrayWithCapacity:result->timeSteps];
    for (int i = 0; i < result->timeSteps; i++) {
        NSMutableArray *row = [NSMutableArray arrayWithCapacity:result->nMels];
        for (int j = 0; j < result->nMels; j++) {
            [row addObject:@(result->data[i * result->nMels + j])];
        }
        [spectrogram addObject:row];
    }

    NSDictionary *dict = @{
        @"spectrogram": spectrogram,
        @"timeSteps": @(result->timeSteps),
        @"nMels": @(result->nMels)
    };

    mel_spectrogram_free(result);

    return dict;
}

@end
