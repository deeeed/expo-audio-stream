import Foundation
import AVFoundation
import CSherpaOnnx

/**
 * Convert a String from swift to a `const char*` so that we can pass it to
 * the C language.
 */
fileprivate func toCPointer(_ s: String) -> UnsafePointer<Int8>! {
    let cs = (s as NSString).utf8String
    return UnsafePointer<Int8>(cs)
}

/**
 * SherpaOnnxTtsHandler - Text-to-Speech Handler
 * 
 * Manages Text-to-Speech functionality using Sherpa-ONNX C API.
 * Supports different model types: VITS, Kokoro, Matcha.
 * 
 * This handler mirrors the TtsHandler.kt implementation for Android
 * to ensure feature parity across platforms.
 */
@objc public class SherpaOnnxTtsHandler: NSObject {
    private var tts: OpaquePointer?
    private var isInitialized: Bool = false
    private var sampleRate: Int = 16000
    private var audioPlayer: AVAudioPlayer?
    private var isGenerating: Bool = false
    
    @objc public override init() {
        super.init()
    }
    
    deinit {
        cleanupTtsResources()
    }
    
    /**
     * Initialize TTS with configuration
     * 
     * @param config Dictionary containing TTS configuration
     * @return Dictionary with initialization result
     */
    @objc public func initTts(_ config: NSDictionary) -> NSDictionary {
        if tts != nil {
            cleanupTtsResources()
        }
        
        do {
            // Extract configuration parameters
            let modelDir = config["modelDir"] as? String ?? ""
            let modelType = config["modelType"] as? String ?? "vits"
            let modelName = config["modelName"] as? String ?? "model.onnx"
            let voices = config["voices"] as? String
            let lexicon = config["lexicon"] as? String
            let dataDir = config["dataDir"] as? String ?? modelDir
            let numThreads = config["numThreads"] as? Int ?? 1
            let debug = config["debug"] as? Bool ?? false
            
            // Log configuration for debugging
            NSLog("TTS Init - Model dir: \(modelDir)")
            NSLog("TTS Init - Model type: \(modelType)")
            NSLog("TTS Init - Model name: \(modelName)")
            NSLog("TTS Init - Data dir: \(dataDir)")
            
            // Create model configuration based on type
            var modelConfig: SherpaOnnxOfflineTtsModelConfig
            
            if modelType == "vits" {
                let vitsConfig = sherpaOnnxOfflineTtsVitsModelConfig(
                    model: "\(modelDir)/\(modelName)",
                    lexicon: lexicon != nil ? "\(modelDir)/\(lexicon!)" : "",
                    tokens: "\(modelDir)/tokens.txt",
                    dataDir: dataDir,
                    noiseScale: 0.667,
                    noiseScaleW: 0.8,
                    lengthScale: 1.0
                )
                
                modelConfig = sherpaOnnxOfflineTtsModelConfig(
                    vits: vitsConfig,
                    numThreads: numThreads,
                    debug: debug ? 1 : 0,
                    provider: "cpu"
                )
            } else if modelType == "kokoro" {
                let voicesPath = voices != nil ? "\(modelDir)/\(voices!)" : "\(modelDir)/voices.bin"
                
                let kokoroConfig = sherpaOnnxOfflineTtsKokoroModelConfig(
                    model: "\(modelDir)/\(modelName)",
                    voices: voicesPath,
                    tokens: "\(modelDir)/tokens.txt",
                    dataDir: dataDir,
                    lengthScale: 1.0,
                    lexicon: lexicon != nil ? "\(modelDir)/\(lexicon!)" : ""
                )
                
                modelConfig = sherpaOnnxOfflineTtsModelConfig(
                    kokoro: kokoroConfig,
                    numThreads: numThreads,
                    debug: debug ? 1 : 0,
                    provider: "cpu"
                )
            } else if modelType == "matcha" {
                let vocoderPath = voices != nil ? "\(modelDir)/\(voices!)" : "\(modelDir)/vocos-22khz-univ.onnx"
                
                let matchaConfig = sherpaOnnxOfflineTtsMatchaModelConfig(
                    acousticModel: "\(modelDir)/\(modelName)",
                    vocoder: vocoderPath,
                    lexicon: lexicon != nil ? "\(modelDir)/\(lexicon!)" : "",
                    tokens: "\(modelDir)/tokens.txt",
                    dataDir: dataDir,
                    noiseScale: 0.667,
                    lengthScale: 1.0
                )
                
                modelConfig = sherpaOnnxOfflineTtsModelConfig(
                    matcha: matchaConfig,
                    numThreads: numThreads,
                    debug: debug ? 1 : 0,
                    provider: "cpu"
                )
            } else {
                throw NSError(domain: "SherpaOnnx", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unsupported model type: \(modelType)"])
            }
            
            // Create TTS configuration
            var ttsConfig = sherpaOnnxOfflineTtsConfig(model: modelConfig)
            
            // Initialize TTS
            NSLog("Creating TTS instance...")
            tts = SherpaOnnxCreateOfflineTts(&ttsConfig)
            
            if tts == nil {
                throw NSError(domain: "SherpaOnnx", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to initialize TTS engine"])
            }
            
            // Get sample rate from TTS instance
            sampleRate = Int(SherpaOnnxOfflineTtsSampleRate(tts))
            isInitialized = true
            
            NSLog("TTS initialized successfully!")
            
            return [
                "success": true,
                "sampleRate": sampleRate,
                "error": NSNull()
            ]
        } catch {
            NSLog("TTS initialization failed: \(error.localizedDescription)")
            return [
                "success": false,
                "error": error.localizedDescription
            ]
        }
    }
    
    /**
     * Generate speech from text
     * 
     * @param config Dictionary containing generation parameters
     * @return Dictionary with generation result
     */
    @objc public func generateTts(_ config: NSDictionary) -> NSDictionary {
        if tts == nil || !isInitialized {
            return [
                "success": false,
                "error": "TTS not initialized"
            ]
        }
        
        if isGenerating {
            return [
                "success": false,
                "error": "TTS is already generating speech"
            ]
        }
        
        do {
            isGenerating = true
            
            // Extract parameters
            let text = config["text"] as? String ?? ""
            let speakerId = config["speakerId"] as? Int ?? 0
            let speakingRate = Float(config["speakingRate"] as? Double ?? 1.0)
            let playAudio = config["playAudio"] as? Bool ?? true
            let fileNamePrefix = config["fileNamePrefix"] as? String
            
            // Apply custom parameters if provided
            if let _ = config["lengthScale"] as? Float { // Use _ to ignore the value
                // Note: Unlike Android, we don't have direct access to modify these parameters 
                // on existing TTS instance. Instead, we'd need to recreate the instance.
                NSLog("lengthScale parameter provided but cannot be applied to existing instance in iOS")
            }
            
            if let _ = config["noiseScale"] as? Float { // Use _ to ignore the value
                NSLog("noiseScale parameter provided but cannot be applied to existing instance in iOS")
            }
            
            if let _ = config["noiseScaleW"] as? Float { // Use _ to ignore the value
                NSLog("noiseScaleW parameter provided but cannot be applied to existing instance in iOS")
            }
            
            if text.isEmpty {
                throw NSError(domain: "SherpaOnnx", code: 3, userInfo: [NSLocalizedDescriptionKey: "Text cannot be empty"])
            }
            
            NSLog("Generating TTS for text: '\(text)' with speakerId: \(speakerId), speed: \(speakingRate)")
            
            // Generate speech
            let result = SherpaOnnxOfflineTtsGenerate(tts, toCPointer(text), Int32(speakerId), speakingRate)
            
            if result == nil {
                throw NSError(domain: "SherpaOnnx", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to generate speech"])
            }
            
            // Get samples from result
            let numSamples = Int(result!.pointee.n)
            guard let samples = result!.pointee.samples else {
                throw NSError(domain: "SherpaOnnx", code: 5, userInfo: [NSLocalizedDescriptionKey: "Generated speech contains no samples"])
            }
            
            // Create filename
            let fileName = fileNamePrefix != nil ? "\(fileNamePrefix!)_\(Int(Date().timeIntervalSince1970))" : "generated_audio_\(Int(Date().timeIntervalSince1970))"
            let fileManager = FileManager.default
            let cacheDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
            let filePath = cacheDir.appendingPathComponent("\(fileName).wav")
            
            // Save audio to file
            let saved = saveAudioToFile(samples, numSamples: numSamples, sampleRate: sampleRate, filePath: filePath)
            
            if playAudio {
                // Play audio
                try playAudioFile(filePath: filePath.path)
            }
            
            // Free the result
            SherpaOnnxDestroyOfflineTtsGeneratedAudio(result)
            
            isGenerating = false
            
            return [
                "success": true,
                "filePath": filePath.path,
                "sampleRate": sampleRate,
                "numSamples": numSamples,
                "samplesLength": numSamples,
                "saved": saved,
                "error": NSNull()
            ]
        } catch {
            isGenerating = false
            NSLog("TTS generation failed: \(error.localizedDescription)")
            return [
                "success": false,
                "error": error.localizedDescription
            ]
        }
    }
    
    /**
     * Stop TTS generation and playback
     * 
     * @return Dictionary with stop result
     */
    @objc public func stopTts() -> NSDictionary {
        isGenerating = false
        
        if let player = audioPlayer, player.isPlaying {
            player.stop()
            audioPlayer = nil
        }
        
        return [
            "stopped": true,
            "message": "TTS stopped successfully"
        ]
    }
    
    /**
     * Release TTS resources
     * 
     * @return Dictionary with release result
     */
    @objc public func releaseTts() -> NSDictionary {
        cleanupTtsResources()
        return ["released": true]
    }
    
    // MARK: - Private Helper Methods
    
    /**
     * Release TTS resources
     */
    private func cleanupTtsResources() {
        isGenerating = false
        
        if let player = audioPlayer, player.isPlaying {
            player.stop()
            audioPlayer = nil
        }
        
        if let ttsPtr = tts {
            SherpaOnnxDestroyOfflineTts(ttsPtr)
            tts = nil
        }
        
        isInitialized = false
    }
    
    /**
     * Save audio to WAV file
     * 
     * @param samples Float array of audio samples
     * @param numSamples Number of samples
     * @param sampleRate Sample rate
     * @param filePath Output file path
     * @return Boolean indicating success
     */
    private func saveAudioToFile(_ samples: UnsafePointer<Float>?, numSamples: Int, sampleRate: Int, filePath: URL) -> Bool {
        guard let samples = samples else {
            NSLog("Error: samples pointer is nil")
            return false
        }
        
        do {
            // Create a WAV file
            let format = AVAudioFormat(standardFormatWithSampleRate: Double(sampleRate), channels: 1)
            let file = try AVAudioFile(forWriting: filePath, settings: format!.settings)
            
            // Create a buffer
            let buffer = AVAudioPCMBuffer(pcmFormat: format!, frameCapacity: AVAudioFrameCount(numSamples))
            buffer!.frameLength = AVAudioFrameCount(numSamples)
            
            // Copy samples to buffer
            let samplesPtr = UnsafeMutablePointer<Float>(mutating: samples)
            for i in 0..<numSamples {
                buffer!.floatChannelData![0][i] = samplesPtr[i]
            }
            
            // Write buffer to file
            try file.write(from: buffer!)
            
            NSLog("Saved audio file to: \(filePath.path)")
            return true
        } catch {
            NSLog("Error saving audio file: \(error.localizedDescription)")
            return false
        }
    }
    
    /**
     * Play audio file
     * 
     * @param filePath Path to audio file
     * @throws Error if playback fails
     */
    private func playAudioFile(filePath: String) throws {
        let url = URL(fileURLWithPath: filePath)
        audioPlayer = try AVAudioPlayer(contentsOf: url)
        audioPlayer?.prepareToPlay()
        audioPlayer?.play()
    }
}

// Add helper functions for model config creation following the pattern from SherpaOnnx.swift examples

func sherpaOnnxOfflineTtsVitsModelConfig(
    model: String = "",
    lexicon: String = "",
    tokens: String = "",
    dataDir: String = "",
    noiseScale: Float = 0.667,
    noiseScaleW: Float = 0.8,
    lengthScale: Float = 1.0,
    dictDir: String = ""
) -> SherpaOnnxOfflineTtsVitsModelConfig {
    return SherpaOnnxOfflineTtsVitsModelConfig(
        model: toCPointer(model),
        lexicon: toCPointer(lexicon),
        tokens: toCPointer(tokens),
        data_dir: toCPointer(dataDir),
        noise_scale: noiseScale,
        noise_scale_w: noiseScaleW,
        length_scale: lengthScale,
        dict_dir: toCPointer(dictDir)
    )
}

func sherpaOnnxOfflineTtsKokoroModelConfig(
    model: String = "",
    voices: String = "",
    tokens: String = "",
    dataDir: String = "",
    lengthScale: Float = 1.0,
    dictDir: String = "",
    lexicon: String = ""
) -> SherpaOnnxOfflineTtsKokoroModelConfig {
    return SherpaOnnxOfflineTtsKokoroModelConfig(
        model: toCPointer(model),
        voices: toCPointer(voices),
        tokens: toCPointer(tokens),
        data_dir: toCPointer(dataDir),
        length_scale: lengthScale,
        dict_dir: toCPointer(dictDir),
        lexicon: toCPointer(lexicon)
    )
}

func sherpaOnnxOfflineTtsMatchaModelConfig(
    acousticModel: String = "",
    vocoder: String = "",
    lexicon: String = "",
    tokens: String = "",
    dataDir: String = "",
    noiseScale: Float = 0.667,
    lengthScale: Float = 1.0,
    dictDir: String = ""
) -> SherpaOnnxOfflineTtsMatchaModelConfig {
    return SherpaOnnxOfflineTtsMatchaModelConfig(
        acoustic_model: toCPointer(acousticModel),
        vocoder: toCPointer(vocoder),
        lexicon: toCPointer(lexicon),
        tokens: toCPointer(tokens),
        data_dir: toCPointer(dataDir),
        noise_scale: noiseScale,
        length_scale: lengthScale,
        dict_dir: toCPointer(dictDir)
    )
}

func sherpaOnnxOfflineTtsModelConfig(
    vits: SherpaOnnxOfflineTtsVitsModelConfig = sherpaOnnxOfflineTtsVitsModelConfig(),
    matcha: SherpaOnnxOfflineTtsMatchaModelConfig = sherpaOnnxOfflineTtsMatchaModelConfig(),
    kokoro: SherpaOnnxOfflineTtsKokoroModelConfig = sherpaOnnxOfflineTtsKokoroModelConfig(),
    numThreads: Int = 1,
    debug: Int = 0,
    provider: String = "cpu"
) -> SherpaOnnxOfflineTtsModelConfig {
    return SherpaOnnxOfflineTtsModelConfig(
        vits: vits,
        num_threads: Int32(numThreads),
        debug: Int32(debug),
        provider: toCPointer(provider),
        matcha: matcha,
        kokoro: kokoro
    )
}

func sherpaOnnxOfflineTtsConfig(
    model: SherpaOnnxOfflineTtsModelConfig,
    ruleFsts: String = "",
    ruleFars: String = "",
    maxNumSentences: Int = 1,
    silenceScale: Float = 0.2
) -> SherpaOnnxOfflineTtsConfig {
    return SherpaOnnxOfflineTtsConfig(
        model: model,
        rule_fsts: toCPointer(ruleFsts),
        max_num_sentences: Int32(maxNumSentences),
        rule_fars: toCPointer(ruleFars),
        silence_scale: silenceScale
    )
} 