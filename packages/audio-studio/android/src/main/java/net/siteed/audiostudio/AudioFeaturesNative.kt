package net.siteed.audiostudio

object AudioFeaturesNative {
    init {
        System.loadLibrary("audio-studio-cpp")
    }

    external fun computeFrame(
        samples: FloatArray,
        sampleRate: Int,
        fftLength: Int,
        nMfcc: Int,
        nMelFilters: Int,
        computeMfcc: Boolean,
        computeChroma: Boolean
    ): HashMap<String, Any>

    external fun init(
        sampleRate: Int,
        fftLength: Int,
        nMfcc: Int,
        nMelFilters: Int,
        computeMfcc: Boolean,
        computeChroma: Boolean
    )
}
