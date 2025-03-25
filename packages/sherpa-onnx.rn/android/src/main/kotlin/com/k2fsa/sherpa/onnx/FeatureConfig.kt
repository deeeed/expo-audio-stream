package com.k2fsa.sherpa.onnx

/**
 * Feature extractor configuration
 */
data class FeatureConfig(
    var featureDim: Int = 80,
    var sampleRate: Int = 16000,
    var extractorType: String = "fbank"
) 