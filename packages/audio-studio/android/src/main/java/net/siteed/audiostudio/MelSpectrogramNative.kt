package net.siteed.audiostudio

object MelSpectrogramNative {
    init {
        System.loadLibrary("audio-studio-cpp")
    }

    external fun compute(
        samples: FloatArray,
        sampleRate: Int,
        fftLength: Int,
        windowSizeSamples: Int,
        hopLengthSamples: Int,
        nMels: Int,
        fMin: Float,
        fMax: Float,
        windowType: Int,
        logScale: Boolean,
        normalize: Boolean
    ): Array<FloatArray>
}
