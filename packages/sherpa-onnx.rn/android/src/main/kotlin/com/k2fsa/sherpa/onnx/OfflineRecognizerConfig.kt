package com.k2fsa.sherpa.onnx

/**
 * Feature extractor configuration
 */
class FeatureConfig {
    var featureDim: Int = 80
    var sampleRate: Int = 16000
    var extractorType: String = "fbank"
}

/**
 * Transducer model configuration
 */
class OfflineTransducerModelConfig {
    var encoder: String = ""
    var decoder: String = ""
    var joiner: String = ""
}

/**
 * Paraformer model configuration
 */
class OfflineParaformerModelConfig {
    var encoder: String = ""
    var decoder: String = ""
}

/**
 * Whisper model configuration
 */
class OfflineWhisperModelConfig {
    var model: String = ""
    var language: String = "en"
    var task: String = "transcribe"
}

/**
 * Model configuration
 */
class OfflineModelConfig {
    var transducer: OfflineTransducerModelConfig? = null
    var paraformer: OfflineParaformerModelConfig? = null
    var whisper: OfflineWhisperModelConfig? = null
    var tokens: String = ""
    var numThreads: Int = 1
    var debug: Boolean = false
    var provider: String = "cpu"
}

/**
 * Complete offline recognizer configuration
 */
class OfflineRecognizerConfig {
    var featConfig: FeatureConfig = FeatureConfig()
    var modelConfig: OfflineModelConfig = OfflineModelConfig()
    var decodingMethod: String = "greedy_search"
    var maxActivePaths: Int = 4
} 