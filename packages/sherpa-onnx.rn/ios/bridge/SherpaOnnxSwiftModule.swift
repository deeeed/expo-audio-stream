//
//  SherpaOnnxSwiftModule.swift
//  sherpa-onnx-rn
//

import Foundation

@objc(SherpaOnnxSwiftModule)
class SherpaOnnxSwiftModule: NSObject {
    
    // MARK: - Properties
    
    // Feature handlers
    private let ttsHandler: TtsHandler
    private let audioTaggingHandler: AudioTaggingHandler
    private let asrHandler: ASRHandler
    private let speakerIdHandler: SpeakerIdHandler
    private let archiveHandler: ArchiveHandler
    
    // Flag indicating if sherpa-onnx library is loaded
    @objc public static var libraryLoaded: Bool = false
    
    // MARK: - Initialization
    
    override init() {
        // Initialize all handlers
        ttsHandler = TtsHandler()
        audioTaggingHandler = AudioTaggingHandler()
        asrHandler = ASRHandler()
        speakerIdHandler = SpeakerIdHandler()
        archiveHandler = ArchiveHandler()
        
        super.init()
        
        // Check if the library is loaded
        Self.checkLibraryLoaded()
    }
    
    // MARK: - Static methods
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    private static func checkLibraryLoaded() {
        // Try to access one of the symbols from the library to check if it's loaded
        let symbol = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "SherpaOnnxCreateOfflineTts")
        libraryLoaded = symbol != nil
        
        if libraryLoaded {
            print("Sherpa ONNX library loaded successfully")
        } else {
            print("Failed to load Sherpa ONNX library")
        }
    }
    
    // MARK: - Common methods
    
    @objc(validateLibraryLoaded:withRejecter:)
    func validateLibraryLoaded(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        let result: [String: Any] = [
            "loaded": Self.libraryLoaded,
            "status": Self.libraryLoaded ? "Sherpa ONNX library loaded successfully" : "Failed to load Sherpa ONNX library"
        ]
        resolve(result)
    }
    
    // MARK: - TTS Methods
    
    @objc(initTts:withResolver:withRejecter:)
    func initTts(config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        ttsHandler.initializeTts(config, promise: resolve, reject: reject)
    }
    
    @objc(generateTts:withResolver:withRejecter:)
    func generateTts(config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let text = config["text"] as? String else {
            reject("ERR_INVALID_CONFIG", "Text is required", nil)
            return
        }
        
        let speakerId = (config["speakerId"] as? NSNumber)?.int32Value ?? 0
        let speakingRate = (config["speakingRate"] as? NSNumber)?.floatValue ?? 1.0
        let playAudio = (config["playAudio"] as? NSNumber)?.boolValue ?? false
        let fileNamePrefix = config["fileNamePrefix"] as? String
        let lengthScale = (config["lengthScale"] as? NSNumber)?.floatValue
        let noiseScale = (config["noiseScale"] as? NSNumber)?.floatValue
        let noiseScaleW = (config["noiseScaleW"] as? NSNumber)?.floatValue
        
        ttsHandler.generate(
            text,
            speakerId: speakerId,
            speakingRate: speakingRate,
            playAudio: playAudio,
            fileNamePrefix: fileNamePrefix,
            lengthScale: lengthScale,
            noiseScale: noiseScale,
            noiseScaleW: noiseScaleW,
            promise: resolve
        )
    }
    
    @objc(stopTts:withRejecter:)
    func stopTts(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        ttsHandler.stop(resolve)
    }
    
    @objc(releaseTts:withRejecter:)
    func releaseTts(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        ttsHandler.release(resolve)
    }
    
    // MARK: - ASR Methods
    
    @objc(initAsr:withResolver:withRejecter:)
    func initAsr(config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        asrHandler.init(config, promise: resolve)
    }
    
    @objc(recognizeFromSamples:audioBuffer:withResolver:withRejecter:)
    func recognizeFromSamples(sampleRate: Int32, audioBuffer: [Double], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        asrHandler.recognizeFromSamples(sampleRate, audioBuffer: audioBuffer, promise: resolve)
    }
    
    @objc(recognizeFromFile:withResolver:withRejecter:)
    func recognizeFromFile(filePath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        asrHandler.recognizeFromFile(filePath, promise: resolve)
    }
    
    @objc(releaseAsr:withRejecter:)
    func releaseAsr(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        asrHandler.release(resolve)
    }
    
    // MARK: - Audio Tagging Methods
    
    @objc(initAudioTagging:withResolver:withRejecter:)
    func initAudioTagging(config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        audioTaggingHandler.init(config, promise: resolve)
    }
    
    @objc(processAudioSamples:audioBuffer:withResolver:withRejecter:)
    func processAudioSamples(sampleRate: Int32, audioBuffer: [Double], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        audioTaggingHandler.processAudioSamples(sampleRate, audioBuffer: audioBuffer, promise: resolve)
    }
    
    @objc(computeAudioTagging:withRejecter:)
    func computeAudioTagging(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        audioTaggingHandler.computeAudioTagging(resolve)
    }
    
    @objc(processAndComputeAudioTagging:withResolver:withRejecter:)
    func processAndComputeAudioTagging(filePath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        audioTaggingHandler.processAndComputeAudioTagging(filePath, promise: resolve)
    }
    
    @objc(processAudioFile:withResolver:withRejecter:)
    func processAudioFile(filePath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        audioTaggingHandler.processAudioFile(filePath, promise: resolve)
    }
    
    @objc(releaseAudioTagging:withRejecter:)
    func releaseAudioTagging(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        audioTaggingHandler.release(resolve)
    }
    
    // MARK: - Speaker ID Methods
    
    @objc(initSpeakerId:withResolver:withRejecter:)
    func initSpeakerId(config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.init(config, promise: resolve)
    }
    
    @objc(processSpeakerIdSamples:audioBuffer:withResolver:withRejecter:)
    func processSpeakerIdSamples(sampleRate: Int32, audioBuffer: [Double], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.processAudioSamples(sampleRate, audioBuffer: audioBuffer, promise: resolve)
    }
    
    @objc(computeSpeakerEmbedding:withRejecter:)
    func computeSpeakerEmbedding(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.computeEmbedding(resolve)
    }
    
    @objc(registerSpeaker:embedding:withResolver:withRejecter:)
    func registerSpeaker(name: String, embedding: [Double], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.registerSpeaker(name, embedding: embedding, promise: resolve)
    }
    
    @objc(removeSpeaker:withResolver:withRejecter:)
    func removeSpeaker(name: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.removeSpeaker(name, promise: resolve)
    }
    
    @objc(getSpeakers:withRejecter:)
    func getSpeakers(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.getSpeakers(resolve)
    }
    
    @objc(identifySpeaker:threshold:withResolver:withRejecter:)
    func identifySpeaker(embedding: [Double], threshold: Float, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.identifySpeaker(embedding, threshold: threshold, promise: resolve)
    }
    
    @objc(verifySpeaker:embedding:threshold:withResolver:withRejecter:)
    func verifySpeaker(name: String, embedding: [Double], threshold: Float, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.verifySpeaker(name, embedding: embedding, threshold: threshold, promise: resolve)
    }
    
    @objc(processSpeakerIdFile:withResolver:withRejecter:)
    func processSpeakerIdFile(filePath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.processAudioFile(filePath, promise: resolve)
    }
    
    @objc(releaseSpeakerId:withRejecter:)
    func releaseSpeakerId(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        speakerIdHandler.release(resolve)
    }
    
    // MARK: - Archive Methods
    
    @objc(extractTarBz2:targetDir:withResolver:withRejecter:)
    func extractTarBz2(sourcePath: String, targetDir: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        archiveHandler.extractTarBz2(sourcePath, targetDir: targetDir, promise: resolve)
    }
} 