//
//  TtsHandler.swift
//  sherpa-onnx-rn
//

import Foundation
import AVFoundation

/// A handler for Text-to-Speech functionality using Sherpa ONNX
@objc public class TtsHandler: NSObject {
    // MARK: - Properties
    
    /// The TTS engine instance using the official sherpa-onnx Swift API
    private var tts: SherpaOnnxOfflineTtsWrapper?
    
    /// Flag indicating if TTS generation is in progress
    private var isGenerating: Bool = false
    
    /// Audio player for playing generated speech
    private var audioPlayer: AVAudioPlayer?
    
    /// Audio engine for more complex audio playback
    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    
    // MARK: - Initialization
    
    @objc public override init() {
        super.init()
        setupAudioEngine()
    }
    
    deinit {
        releaseResources()
    }
    
    // MARK: - TTS Methods
    
    /// Initialize the TTS engine with configuration
    /// This matches the Android implementation's init method
    @objc public func initializeTts(_ modelConfig: [String: Any], promise: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard SherpaOnnxSwiftModule.libraryLoaded else {
            reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded", nil)
            return
        }
        
        // Execute asynchronously
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                // Extract model parameters from the config
                let modelDir = modelConfig["modelDir"] as? String ?? ""
                let modelFile = modelConfig["modelFile"] as? String ?? "model.onnx"
                let tokensFile = modelConfig["tokensFile"] as? String ?? "tokens.txt"
                let voicesFile = modelConfig["voicesFile"] as? String
                let lexiconFile = modelConfig["lexiconFile"] as? String
                let dataDir = modelConfig["dataDir"] as? String ?? modelDir
                let modelType = modelConfig["modelType"] as? String ?? "vits"
                let sampleRate = modelConfig["sampleRate"] as? Int32 ?? 16000
                let numThreads = modelConfig["numThreads"] as? Int32 ?? 1
                let debug = modelConfig["debug"] as? Bool ?? false
                
                // Build file paths
                let modelPath = (modelDir as NSString).appendingPathComponent(modelFile)
                let tokensPath = (modelDir as NSString).appendingPathComponent(tokensFile)
                let voicesPath = voicesFile != nil ? (modelDir as NSString).appendingPathComponent(voicesFile!) : nil
                let lexiconPath = lexiconFile != nil ? (modelDir as NSString).appendingPathComponent(lexiconFile!) : nil
                
                print("Initializing TTS with paths:")
                print("Model path: \(modelPath)")
                print("Tokens path: \(tokensPath)")
                print("Voices path: \(voicesPath ?? "N/A")")
                print("Lexicon path: \(lexiconPath ?? "N/A")")
                print("Data directory: \(dataDir)")
                
                // Verify file existence
                if !FileManager.default.fileExists(atPath: modelPath) {
                    DispatchQueue.main.async {
                        reject("ERR_FILE_NOT_FOUND", "Model file not found: \(modelPath)", nil)
                    }
                    return
                }
                
                if !FileManager.default.fileExists(atPath: tokensPath) {
                    DispatchQueue.main.async {
                        reject("ERR_FILE_NOT_FOUND", "Tokens file not found: \(tokensPath)", nil)
                    }
                    return
                }
                
                // Create model configuration based on the model type
                var ttsModelConfig: SherpaOnnxOfflineTtsModelConfig
                
                switch modelType.lowercased() {
                case "vits":
                    // Create VITS model config
                    let vitsConfig = sherpaOnnxOfflineTtsVitsModelConfig(
                        model: modelPath,
                        lexicon: lexiconPath ?? "",
                        tokens: tokensPath,
                        dataDir: dataDir,
                        dictDir: ""
                    )
                    
                    ttsModelConfig = sherpaOnnxOfflineTtsModelConfig(
                        vits: vitsConfig,
                        numThreads: numThreads,
                        debug: debug
                    )
                    
                case "kokoro":
                    // Create Kokoro model config
                    let kokoroConfig = sherpaOnnxOfflineTtsKokoroModelConfig(
                        model: modelPath,
                        voices: voicesPath ?? "",
                        tokens: tokensPath,
                        dataDir: dataDir
                    )
                    
                    ttsModelConfig = sherpaOnnxOfflineTtsModelConfig(
                        kokoro: kokoroConfig,
                        numThreads: numThreads,
                        debug: debug
                    )
                    
                case "matcha":
                    // Create Matcha model config
                    let matchaConfig = sherpaOnnxOfflineTtsMatchaModelConfig(
                        acousticModel: modelPath,
                        vocoder: voicesPath ?? "",
                        tokens: tokensPath,
                        dataDir: dataDir
                    )
                    
                    ttsModelConfig = sherpaOnnxOfflineTtsModelConfig(
                        matcha: matchaConfig,
                        numThreads: numThreads,
                        debug: debug
                    )
                    
                default:
                    DispatchQueue.main.async {
                        reject("ERR_INVALID_MODEL_TYPE", "Unsupported model type: \(modelType)", nil)
                    }
                    return
                }
                
                // Create the TTS config
                var ttsConfig = sherpaOnnxOfflineTtsConfig(model: ttsModelConfig)
                
                // Clean up any previous instances
                self.releaseResources()
                
                // Create the TTS wrapper using the official API
                self.tts = SherpaOnnxOfflineTtsWrapper(config: &ttsConfig)
                
                // Check if initialization was successful
                if self.tts == nil {
                    DispatchQueue.main.async {
                        reject("ERR_INIT_FAILED", "Failed to initialize TTS engine", nil)
                    }
                    return
                }
                
                let response: [String: Any] = [
                    "success": true,
                    "sampleRate": sampleRate
                ]
                
                DispatchQueue.main.async {
                    promise(response)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("ERR_TTS_INIT", "Exception during TTS initialization: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    /// Generate speech from text
    /// This matches the Android implementation's generate method
    @objc public func generate(
        _ text: String,
        speakerId: Int32,
        speakingRate: Float,
        playAudio: Bool,
        fileNamePrefix: String?,
        lengthScale: Float?,
        noiseScale: Float?,
        noiseScaleW: Float?,
        promise: RCTPromiseResolveBlock
    ) {
        guard SherpaOnnxSwiftModule.libraryLoaded else {
            promise(["success": false, "error": "Sherpa ONNX library is not loaded"])
            return
        }
        
        guard let tts = self.tts else {
            promise(["success": false, "error": "TTS not initialized"])
            return
        }
        
        // Execute asynchronously
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                if self.isGenerating {
                    let result: [String: Any] = [
                        "success": false,
                        "error": "TTS is already generating speech"
                    ]
                    DispatchQueue.main.async {
                        promise(result)
                    }
                    return
                }
                
                self.isGenerating = true
                
                // Generate speech using the official API
                let audioWrapper = tts.generate(
                    text: text,
                    sid: Int(speakerId),
                    speed: speakingRate
                )
                
                // Get the generated audio data
                let samples = audioWrapper.samples
                let sampleRate = audioWrapper.sampleRate
                
                // Save to file
                let prefix = fileNamePrefix ?? "generated_audio_"
                let timeStamp = Int64(Date().timeIntervalSince1970)
                let fileName = "\(prefix)\(timeStamp).wav"
                let filePath = (NSTemporaryDirectory() as NSString).appendingPathComponent(fileName)
                
                let saved = audioWrapper.save(filename: filePath)
                
                if saved == 0 {
                    self.isGenerating = false
                    let result: [String: Any] = [
                        "success": false,
                        "error": "Failed to save audio file"
                    ]
                    DispatchQueue.main.async {
                        promise(result)
                    }
                    return
                }
                
                // Play audio if requested
                if playAudio {
                    self.playAudioFile(filePath: filePath)
                }
                
                // Return result
                let result: [String: Any] = [
                    "success": true,
                    "sampleRate": Int(sampleRate),
                    "numSamples": samples.count,
                    "filePath": "file://\(filePath)"
                ]
                
                self.isGenerating = false
                
                DispatchQueue.main.async {
                    promise(result)
                }
            } catch {
                self.isGenerating = false
                
                let result: [String: Any] = [
                    "success": false,
                    "error": error.localizedDescription
                ]
                
                DispatchQueue.main.async {
                    promise(result)
                }
            }
        }
    }
    
    /// Stop TTS generation
    /// This matches the Android implementation's stop method
    @objc public func stop(_ promise: RCTPromiseResolveBlock) {
        DispatchQueue.global(qos: .userInitiated).async {
            self.isGenerating = false
            
            if self.playerNode.isPlaying {
                self.playerNode.stop()
            }
            
            if let player = self.audioPlayer, player.isPlaying {
                player.stop()
            }
            
            DispatchQueue.main.async {
                promise(["success": true])
            }
        }
    }
    
    /// Release TTS resources
    /// This matches the Android implementation's release method
    @objc public func release(_ promise: RCTPromiseResolveBlock) {
        DispatchQueue.global(qos: .userInitiated).async {
            let success = self.releaseResources()
            
            DispatchQueue.main.async {
                promise(["success": success])
            }
        }
    }
    
    // MARK: - Helper Methods
    
    /// Release TTS resources
    private func releaseResources() -> Bool {
        isGenerating = false
        
        // Release TTS instance
        tts = nil
        
        // Stop audio playback
        if playerNode.isPlaying {
            playerNode.stop()
        }
        
        if let player = audioPlayer, player.isPlaying {
            player.stop()
        }
        
        return true
    }
    
    // MARK: - Audio Playback Methods
    
    private func setupAudioEngine() {
        audioEngine.attach(playerNode)
        audioEngine.connect(playerNode, to: audioEngine.mainMixerNode, format: nil)
        do {
            try audioEngine.start()
        } catch {
            print("Error starting audio engine: \(error)")
        }
    }
    
    private func playAudioFile(filePath: String) {
        // Try AVAudioPlayer first
        do {
            let url = URL(fileURLWithPath: filePath)
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.play()
            return
        } catch {
            print("Error creating AVAudioPlayer: \(error). Falling back to AVAudioEngine.")
        }
        
        // Fall back to AVAudioEngine
        do {
            let url = URL(fileURLWithPath: filePath)
            let file = try AVAudioFile(forReading: url)
            let format = file.processingFormat
            let frameCount = AVAudioFrameCount(file.length)
            
            let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)
            try file.read(into: buffer!)
            
            playerNode.stop()
            playerNode.scheduleBuffer(buffer!, at: nil, options: .interrupts, completionHandler: nil)
            playerNode.play()
        } catch {
            print("Error playing audio file with AVAudioEngine: \(error)")
        }
    }
} 