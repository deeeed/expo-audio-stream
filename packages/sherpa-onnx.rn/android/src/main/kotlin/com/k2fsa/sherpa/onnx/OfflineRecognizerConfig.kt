package com.k2fsa.sherpa.onnx

/**
 * Complete offline recognizer configuration
 */
class OfflineRecognizerConfig {
    var featConfig: FeatureConfig = FeatureConfig()
    var modelConfig: OfflineModelConfig = OfflineModelConfig()
    var decodingMethod: String = "greedy_search"
    var maxActivePaths: Int = 4
    var hotwordsFile: String = ""
    var hotwordsScore: Float = 1.0f
    var ruleFsts: String = ""
    var ruleFars: String = ""
    var blankPenalty: Float = 0.0f
} 