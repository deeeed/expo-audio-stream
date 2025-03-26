import Foundation

// Import only what we need without exporting
import CSherpaOnnx

@objc public class SherpaOnnxFactory: NSObject {
    
    @objc public static func createTransducerModelConfig(encoder: String, decoder: String, joiner: String) -> SherpaOnnxOnlineTransducerModelConfig {
        return sherpaOnnxOnlineTransducerModelConfig(encoder: encoder, decoder: decoder, joiner: joiner)
    }
    
    @objc public static func createFeatureConfig(sampleRate: Int = 16000, featureDim: Int = 80) -> SherpaOnnxFeatureConfig {
        return sherpaOnnxFeatureConfig(sampleRate: sampleRate, featureDim: featureDim)
    }
    
    @objc public static func createOnlineModelConfig(tokens: String, transducer: SherpaOnnxOnlineTransducerModelConfig) -> SherpaOnnxOnlineModelConfig {
        return sherpaOnnxOnlineModelConfig(tokens: tokens, transducer: transducer)
    }
    
    @objc public static func createOnlineRecognizerConfig(
        featConfig: SherpaOnnxFeatureConfig,
        modelConfig: SherpaOnnxOnlineModelConfig,
        enableEndpoint: Bool = false,
        decodingMethod: String = "greedy_search",
        maxActivePaths: Int = 4
    ) -> SherpaOnnxOnlineRecognizerConfig {
        return sherpaOnnxOnlineRecognizerConfig(
            featConfig: featConfig,
            modelConfig: modelConfig,
            enableEndpoint: enableEndpoint,
            decodingMethod: decodingMethod,
            maxActivePaths: maxActivePaths
        )
    }
    
    @objc public static func createRecognizer(config: UnsafePointer<SherpaOnnxOnlineRecognizerConfig>) -> SherpaOnlineRecognizer {
        return SherpaOnlineRecognizer(config: config)
    }
}

// Note: We don't need to re-declare any of the Swift classes here as they are already
// defined in SherpaOnnx.swift with @objc annotations 