#ifndef AUDIO_FEATURES_BRIDGE_H
#define AUDIO_FEATURES_BRIDGE_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float spectralCentroid;
    float spectralFlatness;
    float spectralRolloff;
    float spectralBandwidth;
    float* mfcc;         // nMfcc coefficients (caller must free via audio_features_free)
    int mfccCount;
    float* chromagram;   // 12 bins (caller must free via audio_features_free)
    int chromagramCount;
} CAudioFeaturesResult;

// Batch API: compute features for a buffer of samples
CAudioFeaturesResult* audio_features_compute(
    const float* samples, int numSamples, int sampleRate,
    int fftLength, int nMfcc, int nMelFilters,
    int computeMfcc, int computeChroma);

void audio_features_free(CAudioFeaturesResult* result);

// Streaming API: init processor, then compute per-frame
void audio_features_init(int sampleRate, int fftLength,
    int nMfcc, int nMelFilters, int computeMfcc, int computeChroma);

// Returns 1 on success, 0 on failure.
// Output written to the provided CAudioFeaturesResult (caller-allocated).
// mfcc and chromagram pointers inside result are allocated by this function
// and must be freed by the caller via audio_features_free_arrays().
int audio_features_compute_frame(const float* samples, int numSamples,
    CAudioFeaturesResult* result);

// Free only the internal arrays (mfcc, chromagram) of a stack-allocated result
void audio_features_free_arrays(CAudioFeaturesResult* result);

int audio_features_get_n_mfcc(void);

#ifdef __cplusplus
}
#endif

#endif // AUDIO_FEATURES_BRIDGE_H
