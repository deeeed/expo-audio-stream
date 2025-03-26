//
//  ASRHandler.swift
//  sherpa-onnx-rn
//

import Foundation

/// Handler for Automatic Speech Recognition functionality
@objc public class ASRHandler: NSObject {
    
    // MARK: - Properties
    
    /// Reference to the ASR recognizer
    private var asrPtr: SherpaOnnxRecognizer?
    
    // MARK: - Initialization
    
    @objc public override init() {
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Initialize ASR with the given configuration
    @objc public func `init`(_ modelConfig: [String: Any], promise: RCTPromiseResolveBlock) {
        DispatchQueue.main.async {
            let result: [String: Any] = [
                "success": false,
                "error": "ASR functionality is not yet implemented on iOS"
            ]
            promise(result)
        }
    }
    
    /// Recognize speech from audio samples
    @objc public func recognizeFromSamples(_ sampleRate: Int32, audioBuffer: [Double], promise: RCTPromiseResolveBlock) {
        DispatchQueue.main.async {
            let result: [String: Any] = [
                "success": false,
                "error": "ASR functionality is not yet implemented on iOS"
            ]
            promise(result)
        }
    }
    
    /// Recognize speech from an audio file
    @objc public func recognizeFromFile(_ filePath: String, promise: RCTPromiseResolveBlock) {
        DispatchQueue.main.async {
            let result: [String: Any] = [
                "success": false,
                "error": "ASR functionality is not yet implemented on iOS" 
            ]
            promise(result)
        }
    }
    
    /// Release ASR resources
    @objc public func release(_ promise: RCTPromiseResolveBlock) {
        DispatchQueue.main.async {
            let result: [String: Any] = [
                "success": true
            ]
            promise(result)
        }
    }
} 