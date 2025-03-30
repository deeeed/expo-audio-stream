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
        NSLog("[SherpaOnnxTtsHandler.swift] initTts entered with config: %@", config)

        if tts != nil {
            cleanupTtsResources()
        }

        NSLog("===== TTS INITIALIZATION START =====")
        NSLog("Initializing TTS with config: %@", config)

        do {
            // Extract configuration parameters from the dictionary, matching TtsModelConfig structure
            guard let modelDirRaw = config["modelDir"] as? String, !modelDirRaw.isEmpty else {
                throw NSError(domain: "SherpaOnnx", code: 101, userInfo: [NSLocalizedDescriptionKey: "Missing or empty modelDir parameter"])
            }
            let modelDir = modelDirRaw.replacingOccurrences(of: "file://", with: "")
            
            let modelType = config["modelType"] as? String ?? "vits"
            let modelFile = config["modelFile"] as? String // Expect modelFile (relative)
            NSLog("[Swift] Extracted modelFile raw value: \(modelFile ?? "nil")")
            let tokensFile = config["tokensFile"] as? String ?? "tokens.txt" // Expect tokensFile (relative)
            let voicesFile = config["voices"] as? String // Optional relative path for Kokoro/Matcha
            let lexiconFile = config["lexicon"] as? String // Optional relative path for VITS/Matcha
            let acousticModelFile = config["acousticModelName"] as? String // Optional relative path for Matcha
            let vocoderFile = config["vocoder"] as? String // Optional relative path for Matcha
            
            // Extract dataDir (could be relative or absolute)
            let dataDirInput = config["dataDir"] as? String
            
            let numThreads = config["numThreads"] as? Int ?? 1
            let debug = config["debug"] as? Bool ?? false
            let provider = "cpu" // Typically CPU for mobile
            
            // VITS noise/length scales (use defaults from JS if not passed, but C struct has defaults too)
            let noiseScale = config["noiseScale"] as? Float ?? 0.667
            let noiseScaleW = config["noiseScaleW"] as? Float ?? 0.8
            let lengthScale = config["lengthScale"] as? Float ?? 1.0

            // Log extracted configuration for debugging
            NSLog("TTS Init - Model dir (cleaned): \(modelDir)")
            NSLog("TTS Init - Model type: \(modelType)")
            NSLog("TTS Init - Model file (relative): \(modelFile ?? "nil")")
            NSLog("TTS Init - Tokens file (relative): \(tokensFile)")
            NSLog("TTS Init - Voices file (relative): \(voicesFile ?? "nil")")
            NSLog("TTS Init - Lexicon file (relative): \(lexiconFile ?? "nil")")
            NSLog("TTS Init - Acoustic Model file (relative): \(acousticModelFile ?? "nil")")
            NSLog("TTS Init - Vocoder file (relative): \(vocoderFile ?? "nil")")
            // Log the input dataDir value
            NSLog("TTS Init - Data dir (input): \(dataDirInput ?? "nil")")
            NSLog("TTS Init - Num threads: \(numThreads)")
            NSLog("TTS Init - Debug: \(debug)")

            // --- Path Adjustment Logic --- 
            var assetBasePath = modelDir // Start assuming files are directly in modelDir
            let initialModelCheckPath = "\(assetBasePath)/\(modelFile)"
            NSLog("Initial check for model at: \(initialModelCheckPath)")
            
            if !FileManager.default.fileExists(atPath: initialModelCheckPath) {
                NSLog("Model not found directly in modelDir. Checking for single subdirectory...")
                do {
                    let contents = try FileManager.default.contentsOfDirectory(atPath: modelDir)
                    if contents.count == 1 {
                        let potentialSubdirPath = "\(modelDir)/\(contents[0])"
                        var isDir : ObjCBool = false
                        if FileManager.default.fileExists(atPath: potentialSubdirPath, isDirectory:&isDir) && isDir.boolValue {
                            assetBasePath = potentialSubdirPath // Update base path to the subdirectory
                            NSLog("Found single subdirectory, updated assetBasePath to: \(assetBasePath)")
                        } else {
                             NSLog("Single item found but it's not a directory: \(contents[0])")
                        }
                    } else {
                         NSLog("Did not find a single subdirectory. Contents: \(contents.joined(separator: ", "))")
                         // Stick with the original modelDir, the error will be thrown later if files truly missing
                    }
                } catch {
                     NSLog("Error checking subdirectory: \(error.localizedDescription)")
                     // Proceed with original modelDir, let the later checks fail if needed
                }
            }
            // --- End Path Adjustment Logic ---

            // Construct absolute paths needed for the C API by combining the final assetBasePath and relative filenames
            guard let modelFile = modelFile, !modelFile.isEmpty else {
                 throw NSError(domain: "SherpaOnnx", code: 102, userInfo: [NSLocalizedDescriptionKey: "Missing or empty modelFile parameter (checked after extraction)"])
            }
            let modelAbsPath = "\(assetBasePath)/\(modelFile)"
            let tokensAbsPath = "\(assetBasePath)/\(tokensFile)"
            let lexiconAbsPath = lexiconFile != nil ? "\(assetBasePath)/\(lexiconFile!)" : ""
            let voicesAbsPath = voicesFile != nil ? "\(assetBasePath)/\(voicesFile!)" : "" // Used by Kokoro, also vocoder for Matcha
            let acousticModelAbsPath = acousticModelFile != nil ? "\(assetBasePath)/\(acousticModelFile!)" : modelAbsPath // Fallback for Matcha if specific not given
            let vocoderAbsPath = vocoderFile != nil ? "\(assetBasePath)/\(vocoderFile!)" : voicesAbsPath // Fallback for Matcha
            // Determine absolute dataDir path based on input, relative to the final assetBasePath
            let dataDirAbsPath: String
            if let dataDir = dataDirInput, !dataDir.isEmpty {
                if dataDir.hasPrefix("/") || dataDir.hasPrefix("file://") {
                    // Input looks like an absolute path
                    dataDirAbsPath = dataDir.replacingOccurrences(of: "file://", with: "")
                    NSLog("TTS Init - Treating dataDir as absolute.")
                } else {
                    // Input looks like a relative path, join with final assetBasePath
                    dataDirAbsPath = "\(assetBasePath)/\(dataDir)"
                    NSLog("TTS Init - Treating dataDir as relative, joining with assetBasePath.")
                }
            } else {
                // No dataDir provided or empty, default to empty string
                dataDirAbsPath = ""
                NSLog("TTS Init - No dataDir provided or empty.")
            }

            // Log constructed paths using the potentially updated base path
            NSLog("TTS Init - Using Model path: \(modelAbsPath)")
            NSLog("TTS Init - Using Tokens path: \(tokensAbsPath)")
            NSLog("TTS Init - Using Lexicon path: \(lexiconAbsPath)")
            NSLog("TTS Init - Using Voices path: \(voicesAbsPath)")
            NSLog("TTS Init - Using Acoustic Model path: \(acousticModelAbsPath)")
            NSLog("TTS Init - Using Vocoder path: \(vocoderAbsPath)")
            NSLog("TTS Init - Using Data dir path: \(dataDirAbsPath)") 

            // --- Perform final file existence checks here using adjusted paths ---
            if !FileManager.default.fileExists(atPath: modelAbsPath) {
                 throw NSError(domain: "SherpaOnnx", code: 103, userInfo: [NSLocalizedDescriptionKey: "Model file not found at final path: \(modelAbsPath)"])
            }
            if !FileManager.default.fileExists(atPath: tokensAbsPath) {
                 throw NSError(domain: "SherpaOnnx", code: 104, userInfo: [NSLocalizedDescriptionKey: "Tokens file not found at final path: \(tokensAbsPath)"])
            }
            // Optional file checks (log warning if missing)
            if !lexiconAbsPath.isEmpty && !FileManager.default.fileExists(atPath: lexiconAbsPath) {
                NSLog("Warning: Optional lexicon file not found at: \(lexiconAbsPath)")
            }
             if !voicesAbsPath.isEmpty && !FileManager.default.fileExists(atPath: voicesAbsPath) {
                NSLog("Warning: Optional voices/vocoder file not found at: \(voicesAbsPath)")
            }
            if !dataDirAbsPath.isEmpty && !FileManager.default.fileExists(atPath: dataDirAbsPath) {
                 NSLog("Warning: Optional data directory not found at: \(dataDirAbsPath)")
            }
            // --- End Final File Checks ---

            // Create model configuration based on type
            var cModelConfig: SherpaOnnxOfflineTtsModelConfig // C struct

            if modelType == "vits" {
                NSLog("Configuring VITS model")
                let vitsConfig = sherpaOnnxOfflineTtsVitsModelConfig(
                    model: modelAbsPath,
                    lexicon: lexiconAbsPath,
                    tokens: tokensAbsPath,
                    dataDir: dataDirAbsPath,
                    noiseScale: noiseScale, 
                    noiseScaleW: noiseScaleW,
                    lengthScale: lengthScale
                )
                cModelConfig = sherpaOnnxOfflineTtsModelConfig(
                    vits: vitsConfig,
                    numThreads: numThreads,
                    debug: debug ? 1 : 0,
                    provider: provider
                )
            } else if modelType == "kokoro" {
                 NSLog("Configuring Kokoro model")
                 let kokoroConfig = sherpaOnnxOfflineTtsKokoroModelConfig(
                    model: modelAbsPath,
                    voices: voicesAbsPath, 
                    tokens: tokensAbsPath,
                    dataDir: dataDirAbsPath,
                    lengthScale: lengthScale,
                    lexicon: lexiconAbsPath // Pass lexicon if available
                 )
                 cModelConfig = sherpaOnnxOfflineTtsModelConfig(
                    kokoro: kokoroConfig,
                    numThreads: numThreads,
                    debug: debug ? 1 : 0,
                    provider: provider
                 )
            } else if modelType == "matcha" {
                NSLog("Configuring Matcha model")
                // Note: Matcha C API uses acoustic_model and vocoder fields
                let matchaConfig = sherpaOnnxOfflineTtsMatchaModelConfig(
                    acousticModel: acousticModelAbsPath, // Use the specific acoustic model path
                    vocoder: vocoderAbsPath,          // Use the specific vocoder path
                    lexicon: lexiconAbsPath,
                    tokens: tokensAbsPath,
                    dataDir: dataDirAbsPath,
                    noiseScale: noiseScale, // Pass scales if applicable
                    lengthScale: lengthScale
                )
                 cModelConfig = sherpaOnnxOfflineTtsModelConfig(
                    matcha: matchaConfig,
                    numThreads: numThreads,
                    debug: debug ? 1 : 0,
                    provider: provider
                 )
            } else {
                throw NSError(domain: "SherpaOnnx", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unsupported model type: \(modelType)"])
            }

            // Create the final TTS config for the C API
            var cTtsConfig = sherpaOnnxOfflineTtsConfig(model: cModelConfig)

            // Log and Create TTS instance
            NSLog("Final C TTS Config - numThreads: \(numThreads), debug: \(debug)")
            NSLog("--> Calling SherpaOnnxCreateOfflineTts...")
            tts = SherpaOnnxCreateOfflineTts(&cTtsConfig)
            NSLog("<-- SherpaOnnxCreateOfflineTts returned. Pointer: \(String(describing: tts))")

            if tts == nil {
                throw NSError(domain: "SherpaOnnx", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to initialize TTS engine (SherpaOnnxCreateOfflineTts returned nil)"])
            }

            NSLog("--> Calling SherpaOnnxOfflineTtsSampleRate...")
            sampleRate = Int(SherpaOnnxOfflineTtsSampleRate(tts))
            NSLog("<-- SherpaOnnxOfflineTtsSampleRate returned: \(sampleRate)")
            isInitialized = true

            NSLog("TTS initialized successfully! Sample rate: \(sampleRate)")
            NSLog("===== TTS INITIALIZATION COMPLETE =====")

            return [
                "success": true,
                "sampleRate": sampleRate,
                "error": NSNull()
            ]
        } catch {
            NSLog("TTS initialization failed: \(error.localizedDescription)")
             NSLog("===== TTS INITIALIZATION FAILED =====")
            // Ensure cleanup happens on failure
            cleanupTtsResources()
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