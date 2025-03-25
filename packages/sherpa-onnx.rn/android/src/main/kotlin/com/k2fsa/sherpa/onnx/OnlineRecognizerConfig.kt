package com.k2fsa.sherpa.onnx

/**
 * Complete online recognizer configuration
 */
class OnlineRecognizerConfig {
    var featConfig: FeatureConfig = FeatureConfig()
    var modelConfig: OnlineModelConfig = OnlineModelConfig()
    var endpointConfig: EndpointConfig = EndpointConfig()
    var enableEndpoint: Boolean = true
    var decodingMethod: String = "greedy_search"
    var maxActivePaths: Int = 4
} 