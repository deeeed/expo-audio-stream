package com.k2fsa.sherpa.onnx

class EndpointRule {
    var mustContainNonSilence: Boolean = false
    var minTrailingSilence: Float = 2.0f
    var minUtteranceLength: Float = 0.0f
}

class EndpointConfig {
    var rule1: EndpointRule = EndpointRule()
    var rule2: EndpointRule = EndpointRule()
    var rule3: EndpointRule = EndpointRule()

    init {
        rule1.mustContainNonSilence = true
        rule1.minTrailingSilence = 2.0f
        rule1.minUtteranceLength = 0.0f

        rule2.mustContainNonSilence = false
        rule2.minTrailingSilence = 1.0f
        rule2.minUtteranceLength = 0.0f

        rule3.mustContainNonSilence = false
        rule3.minTrailingSilence = 0.0f
        rule3.minUtteranceLength = 20.0f
    }
}

/**
 * Configuration for online transducer models
 */
class OnlineTransducerModelConfig {
    var encoder: String = ""
    var decoder: String = ""
    var joiner: String = ""
}

/**
 * Configuration for online paraformer models
 */
class OnlineParaformerModelConfig {
    var encoder: String = ""
    var decoder: String = ""
}

/**
 * Configuration for online zipformer2 CTC models
 */
class OnlineZipformer2CtcModelConfig {
    var model: String = ""
}

/**
 * Configuration for online whisper models
 */
class OnlineWhisperModelConfig {
    var encoder: String = ""
    var decoder: String = ""
}

/**
 * Configuration for online NeMo CTC models
 */
class OnlineNemoCtcModelConfig {
    var model: String = ""
}

/**
 * Base configuration for online models
 */
class OnlineModelConfig {
    var debug: Boolean = false
    var provider: String = "cpu"
    var numThreads: Int = 2
    var tokens: String = ""
    var modelType: String = "transducer"
    var decodingMethod: String = "greedy_search"
    var maxActivePaths: Int = 4
    var hotwordsFile: String = ""
    var hotwordsScore: Float = 1.5f
    var transducer: OnlineTransducerModelConfig? = null
    var paraformer: OnlineParaformerModelConfig? = null
    var zipformer2Ctc: OnlineZipformer2CtcModelConfig? = null
    var whisper: OnlineWhisperModelConfig? = null
    var nemoCtc: OnlineNemoCtcModelConfig? = null
} 