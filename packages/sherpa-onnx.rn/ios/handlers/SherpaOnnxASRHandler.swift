import Foundation
import CSherpaOnnx
import AVFoundation

/**
 * Contains helper functions for C-compatible strings and config creation
 */
fileprivate func toCPointer(_ s: String) -> UnsafePointer<CChar>! {
    return s.withCString { UnsafePointer($0) }
}

/**
 * Creates a C-compatible string copy from a Swift string
 */
fileprivate func strdup(_ s: String) -> UnsafePointer<CChar> {
    return s.withCString { cString in
        let length = strlen(cString) + 1  // +1 for the null terminator
        let result = UnsafeMutablePointer<CChar>.allocate(capacity: length)
        strcpy(result, cString)
        return UnsafePointer(result)
    }
}

/**
 * Helper function to create a feature configuration
 */
fileprivate func createFeatureConfig(
    sampleRate: Int = 16000,
    featureDim: Int = 80
) -> SherpaOnnxFeatureConfig {
    var config = SherpaOnnxFeatureConfig()
    config.sample_rate = Int32(sampleRate)
    config.feature_dim = Int32(featureDim)
    return config
}

/**
 * Helper function to create an online model configuration
 */
fileprivate func createOnlineModelConfig(
    tokens: String,
    encoder: String = "",
    decoder: String = "",
    joiner: String = "",
    modelType: String = "",
    numThreads: Int = 1,
    debug: Bool = false
) -> SherpaOnnxOnlineModelConfig {
    var config = SherpaOnnxOnlineModelConfig()
    
    // Set tokens
    config.tokens = toCPointer(tokens)
    
    // Set transducer config if paths are provided
    if !encoder.isEmpty && !decoder.isEmpty && !joiner.isEmpty {
        var transducerConfig = SherpaOnnxOnlineTransducerModelConfig()
        transducerConfig.encoder = toCPointer(encoder)
        transducerConfig.decoder = toCPointer(decoder)
        transducerConfig.joiner = toCPointer(joiner)
        config.transducer = transducerConfig
    }
    
    // Set common properties
    config.num_threads = Int32(numThreads)
    config.debug = debug ? 1 : 0
    config.provider = toCPointer("cpu")
    config.model_type = toCPointer(modelType)
    
    return config
}

/**
 * Helper function to create an offline model configuration
 */
fileprivate func createOfflineModelConfig(
    modelDir: String,
    modelType: String,
    tokensFile: String = "tokens.txt",
    numThreads: Int = 1,
    debug: Bool = false
) -> SherpaOnnxOfflineModelConfig {
    var config = SherpaOnnxOfflineModelConfig()
    
    // Set tokens
    let tokensPath = "\(modelDir)/\(tokensFile)"
    config.tokens = toCPointer(tokensPath)
    
    // Configure based on model type
    if modelType == "transducer" || modelType == "zipformer" || modelType == "zipformer2" {
        var transducerConfig = SherpaOnnxOfflineTransducerModelConfig()
        transducerConfig.encoder = toCPointer("\(modelDir)/encoder.onnx")
        transducerConfig.decoder = toCPointer("\(modelDir)/decoder.onnx")
        transducerConfig.joiner = toCPointer("\(modelDir)/joiner.onnx")
        config.transducer = transducerConfig
    } else if modelType == "paraformer" {
        var paraformerConfig = SherpaOnnxOfflineParaformerModelConfig()
        paraformerConfig.model = toCPointer("\(modelDir)/model.onnx")
        config.paraformer = paraformerConfig
    } else if modelType == "whisper" {
        var whisperConfig = SherpaOnnxOfflineWhisperModelConfig()
        whisperConfig.encoder = toCPointer("\(modelDir)/encoder.onnx")
        whisperConfig.decoder = toCPointer("\(modelDir)/decoder.onnx")
        whisperConfig.language = toCPointer("en")
        whisperConfig.task = toCPointer("transcribe")
        config.whisper = whisperConfig
    }
    // Add additional model types as needed
    
    // Set common properties
    config.num_threads = Int32(numThreads)
    config.debug = debug ? 1 : 0
    config.provider = toCPointer("cpu")
    
    return config
}

/**
 * Result wrapper for online recognition
 */
@objc public class SherpaOnnxRecognitionResult: NSObject {
    private let result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!
    
    @objc public var text: String {
        return String(cString: result.pointee.text)
    }
    
    @objc public var count: Int32 {
        return result.pointee.count
    }
    
    init(result: UnsafePointer<SherpaOnnxOnlineRecognizerResult>!) {
        self.result = result
        super.init()
    }
    
    deinit {
        if let result = result {
            SherpaOnnxDestroyOnlineRecognizerResult(result)
        }
    }
}

/**
 * SherpaOnnxASRHandler - Automatic Speech Recognition Handler
 * 
 * Manages ASR functionality using Sherpa-ONNX C API.
 * Supports both online (streaming) and offline recognition.
 * 
 * This handler mirrors the ASRHandler.kt implementation for Android
 * to ensure feature parity across platforms.
 */
@objc public class SherpaOnnxASRHandler: NSObject {
    // Online recognizer components
    private var onlineRecognizer: OpaquePointer?
    private var onlineStream: OpaquePointer?
    
    // Offline recognizer components
    private var offlineRecognizer: OpaquePointer?
    
    // State tracking
    private var isInitialized: Bool = false
    private var isRecognizing: Bool = false
    private var isStreaming: Bool = false
    private var sampleRate: Int = 16000
    
    // Thread management
    private let queue = DispatchQueue(label: "com.siteed.sherpaonnx.asr", qos: .userInitiated)
    
    @objc public override init() {
        super.init()
    }
    
    deinit {
        cleanupResources()
    }
    
    /**
     * Check if the library is properly loaded
     */
    @objc public static func isLibraryLoaded() -> [String: Any] {
        // Try to use a simple API call to verify library is loaded and accessible
        let tempDir = FileManager.default.temporaryDirectory.path
        let result = SherpaOnnxFileExists(tempDir)
        
        var info: [String: Any] = [
            "loaded": result >= 0,
            "status": result >= 0 ? "Library is loaded and accessible" : "Library could not be accessed properly"
        ]
        
        // Add some standard config values that might be useful
        info["testConfig"] = [
            "sampleRate": 16000,
            "featureDim": 80
        ]
        
        return info
    }
    
    /**
     * Initialize ASR with the specified configuration
     * 
     * @param config ASR configuration parameters
     * @return Dictionary with initialization result
     */
    @objc public func initAsr(_ config: NSDictionary) -> NSDictionary {
        // For now, return a placeholder response
        return [
            "success": false,
            "error": "ASR not yet implemented - will be added soon"
        ]
    }
    
    /**
     * Recognize speech from audio samples
     * 
     * @param sampleRate The sample rate of the audio data
     * @param samples Array of audio samples
     * @return Dictionary with recognition result
     */
    @objc public func recognizeFromSamples(_ sampleRate: Int, samples: NSArray) -> NSDictionary {
        // For now, return a placeholder response
        return [
            "success": false,
            "error": "ASR not yet implemented - will be added soon"
        ]
    }
    
    /**
     * Recognize speech from an audio file
     * 
     * @param filePath Path to the audio file
     * @return Dictionary with recognition result
     */
    @objc public func recognizeFromFile(_ filePath: String) -> NSDictionary {
        // For now, return a placeholder response
        return [
            "success": false,
            "error": "ASR not yet implemented - will be added soon"
        ]
    }
    
    /**
     * Release all resources used by the ASR
     * 
     * @return Dictionary indicating if resources were released successfully
     */
    @objc public func releaseResources() -> NSDictionary {
        cleanupResources()
        return ["released": true]
    }
    
    /**
     * Create a persistent online stream for live streaming ASR.
     */
    @objc public func createAsrOnlineStream() -> NSDictionary {
        guard let recognizer = onlineRecognizer else {
            return ["success": false, "error": "Online ASR not initialized"]
        }
        if let stream = onlineStream {
            SherpaOnnxDestroyOnlineStream(stream)
            onlineStream = nil
        }
        onlineStream = SherpaOnnxCreateOnlineStream(recognizer)
        if onlineStream == nil {
            return ["success": false, "error": "Failed to create online stream"]
        }
        return ["success": true]
    }

    /**
     * Feed audio samples and decode all ready frames.
     */
    @objc public func acceptAsrOnlineWaveform(_ sampleRate: Int, samples: NSArray) -> NSDictionary {
        guard let recognizer = onlineRecognizer, let stream = onlineStream else {
            return ["success": false, "error": "Online stream not created"]
        }
        var floatSamples = [Float]()
        floatSamples.reserveCapacity(samples.count)
        for i in 0..<samples.count {
            if let val_ = samples[i] as? NSNumber {
                floatSamples.append(val_.floatValue)
            }
        }
        floatSamples.withUnsafeBufferPointer { buffer in
            SherpaOnnxOnlineStreamAcceptWaveform(stream, Int32(sampleRate), buffer.baseAddress, Int32(floatSamples.count))
        }
        while SherpaOnnxIsOnlineStreamReady(recognizer, stream) == 1 {
            SherpaOnnxDecodeOnlineStream(recognizer, stream)
        }
        return ["success": true]
    }

    /**
     * Check if an endpoint has been detected.
     */
    @objc public func isAsrOnlineEndpoint() -> NSDictionary {
        guard let recognizer = onlineRecognizer, let stream = onlineStream else {
            return ["isEndpoint": false, "error": "Online stream not created"]
        }
        let isEndpoint = SherpaOnnxOnlineStreamIsEndpoint(recognizer, stream) == 1
        return ["isEndpoint": isEndpoint]
    }

    /**
     * Get the current recognition result.
     */
    @objc public func getAsrOnlineResult() -> NSDictionary {
        guard let recognizer = onlineRecognizer, let stream = onlineStream else {
            return ["text": "", "tokens": [], "timestamps": [], "error": "Online stream not created"]
        }
        let resultPtr = SherpaOnnxGetOnlineStreamResult(recognizer, stream)
        guard let result = resultPtr else {
            return ["text": "", "tokens": [], "timestamps": []]
        }
        let text = String(cString: result.pointee.text).trimmingCharacters(in: .whitespaces)
        var tokens: [String] = []
        var timestamps: [Double] = []
        let count = Int(result.pointee.count)
        if count > 0 {
            for i in 0..<count {
                if let tokenPtr = result.pointee.tokens_arr?[i] {
                    tokens.append(String(cString: tokenPtr))
                }
            }
            if let ts = result.pointee.timestamps {
                for i in 0..<count {
                    timestamps.append(Double(ts[i]))
                }
            }
        }
        SherpaOnnxDestroyOnlineRecognizerResult(resultPtr)
        return ["text": text, "tokens": tokens, "timestamps": timestamps]
    }

    /**
     * Reset the online stream for the next utterance.
     */
    @objc public func resetAsrOnlineStream() -> NSDictionary {
        guard let recognizer = onlineRecognizer, let stream = onlineStream else {
            return ["success": false, "error": "Online stream not created"]
        }
        SherpaOnnxOnlineStreamReset(recognizer, stream)
        return ["success": true]
    }

    /**
     * Release resources used by the ASR
     */
    private func cleanupResources() {
        // Clean up online resources
        if let stream = onlineStream {
            SherpaOnnxDestroyOnlineStream(stream)
            onlineStream = nil
        }
        
        if let recognizer = onlineRecognizer {
            SherpaOnnxDestroyOnlineRecognizer(recognizer)
            onlineRecognizer = nil
        }
        
        // Clean up offline resources
        if let recognizer = offlineRecognizer {
            SherpaOnnxDestroyOfflineRecognizer(recognizer)
            offlineRecognizer = nil
        }
        
        // Reset state
        isInitialized = false
        isRecognizing = false
        isStreaming = false
    }
} 