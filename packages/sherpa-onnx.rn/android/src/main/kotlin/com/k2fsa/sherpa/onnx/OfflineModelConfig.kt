package com.k2fsa.sherpa.onnx

/**
 * Base configuration for offline models
 */
class OfflineModelConfig {
    var debug: Boolean = false
    var provider: String = "cpu"
    var numThreads: Int = 2
    var tokens: String = ""
    var modelType: String = ""
    var modelingUnit: String = ""
    var bpeVocab: String = ""
    var transducer: OfflineTransducerModelConfig? = null
    var paraformer: OfflineParaformerModelConfig? = null
    var whisper: OfflineWhisperModelConfig? = null
}

/**
 * Configuration for offline transducer models
 */
class OfflineTransducerModelConfig {
    var encoder: String = ""
    var decoder: String = ""
    var joiner: String = ""
}

/**
 * Configuration for offline paraformer models
 */
class OfflineParaformerModelConfig {
    var encoder: String = ""
    var decoder: String = ""
}

/**
 * Configuration for offline whisper models
 */
class OfflineWhisperModelConfig {
    var model: String = ""
} 