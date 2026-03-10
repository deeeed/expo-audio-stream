import Foundation
import CSherpaOnnx

/// SherpaOnnxAudioTaggingHandler - Audio Tagging Handler
///
/// Manages audio tagging functionality using the sherpa-onnx C API directly.
/// Supports CED and Zipformer audio tagging models.
@objc public class SherpaOnnxAudioTaggingHandler: NSObject {
    // The C API uses opaque struct pointers. In Swift, these map to OpaquePointer
    // but the actual return types from the C functions vary. We store as Any to
    // avoid Swift type casting issues with opaque C struct pointers.
    private var taggerPtr: OpaquePointer?
    private var topK: Int32 = 3

    private static let TAG = "[SherpaOnnxAudioTagging]"

    @objc public override init() {
        super.init()
    }

    deinit {
        cleanupResources()
    }

    // MARK: - Init

    @objc public func initAudioTagging(_ config: NSDictionary) -> NSDictionary {
        NSLog("%@ initAudioTagging called", SherpaOnnxAudioTaggingHandler.TAG)

        guard let modelDir = config["modelDir"] as? String else {
            return ["success": false, "error": "modelDir is required"]
        }

        let modelFile = config["modelFile"] as? String ?? "model.onnx"
        let labelsFile = config["labelsFile"] as? String ?? "labels.txt"
        let numThreads = config["numThreads"] as? Int ?? 1
        let topKVal = config["topK"] as? Int ?? 3
        let modelType = config["modelType"] as? String ?? "ced"
        let debug = config["debug"] as? Bool ?? false

        let modelPath = (modelDir as NSString).appendingPathComponent(modelFile)
        let labelsPath = (modelDir as NSString).appendingPathComponent(labelsFile)

        // Validate files
        for (label, path) in [("model", modelPath), ("labels", labelsPath)] {
            if !FileManager.default.fileExists(atPath: path) {
                return ["success": false, "error": "File not found: \(label) at \(path)"]
            }
        }

        // Clean up previous resources
        cleanupResources()

        // Build config struct using toCPointer from upstream SherpaOnnx.swift
        let emptyStr = toCPointer("")
        let modelPathC = toCPointer(modelPath)
        let labelsPathC = toCPointer(labelsPath)
        let providerC = toCPointer("cpu")

        var zipformerModel = SherpaOnnxOfflineZipformerAudioTaggingModelConfig(model: emptyStr)
        var cedPath = emptyStr

        if modelType.lowercased() == "zipformer" {
            zipformerModel = SherpaOnnxOfflineZipformerAudioTaggingModelConfig(model: modelPathC)
        } else {
            cedPath = modelPathC
        }

        var tagConfig = SherpaOnnxAudioTaggingConfig(
            model: SherpaOnnxAudioTaggingModelConfig(
                zipformer: zipformerModel,
                ced: cedPath,
                num_threads: Int32(numThreads),
                debug: debug ? 1 : 0,
                provider: providerC
            ),
            labels: labelsPathC,
            top_k: Int32(topKVal)
        )

        self.topK = Int32(topKVal)

        let result = SherpaOnnxCreateAudioTagging(&tagConfig)

        guard result != nil else {
            return ["success": false, "error": "Failed to create audio tagger — check model files"]
        }

        taggerPtr = result

        NSLog("%@ Audio tagging initialized successfully", SherpaOnnxAudioTaggingHandler.TAG)
        return ["success": true, "sampleRate": 16000]
    }

    // MARK: - Process file and compute

    @objc public func processAndComputeFile(_ filePath: String) -> NSDictionary {
        guard let tagger = taggerPtr else {
            return ["success": false, "error": "Audio tagging not initialized"]
        }

        // Read WAV
        guard let wave = SherpaOnnxReadWave(filePath) else {
            return ["success": false, "error": "Failed to read WAV file: \(filePath)"]
        }

        let sampleRate = Int(wave.pointee.sample_rate)
        let numSamples = Int(wave.pointee.num_samples)

        NSLog("%@ Read WAV: sampleRate=%d, numSamples=%d", SherpaOnnxAudioTaggingHandler.TAG, sampleRate, numSamples)

        // Create offline stream
        let streamPtr = SherpaOnnxAudioTaggingCreateOfflineStream(tagger)
        guard streamPtr != nil else {
            SherpaOnnxFreeWave(wave)
            return ["success": false, "error": "Failed to create offline stream"]
        }

        // Feed audio
        SherpaOnnxAcceptWaveformOffline(streamPtr, Int32(sampleRate), wave.pointee.samples, Int32(numSamples))
        SherpaOnnxFreeWave(wave)

        // Compute
        let startTime = CFAbsoluteTimeGetCurrent()
        let eventsPtr = SherpaOnnxAudioTaggingCompute(tagger, streamPtr, topK)
        let durationMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0

        var events: [[String: Any]] = []
        if let eventsPtr = eventsPtr {
            var i = 0
            while let eventPtr = eventsPtr[i] {
                let name = String(cString: eventPtr.pointee.name)
                let prob = Double(eventPtr.pointee.prob)
                let index = Int(eventPtr.pointee.index)
                events.append([
                    "name": name,
                    "label": name,
                    "prob": prob,
                    "confidence": prob,
                    "probability": prob,
                    "index": index
                ])
                i += 1
            }
            SherpaOnnxAudioTaggingFreeResults(eventsPtr)
        }

        SherpaOnnxDestroyOfflineStream(streamPtr)

        NSLog("%@ Computed %d events in %.0fms", SherpaOnnxAudioTaggingHandler.TAG, events.count, durationMs)

        return [
            "success": true,
            "events": events,
            "durationMs": Int(durationMs)
        ]
    }

    // MARK: - Process samples and compute

    @objc public func processAndComputeSamples(_ sampleRate: Int, samples: NSArray) -> NSDictionary {
        guard let tagger = taggerPtr else {
            return ["success": false, "error": "Audio tagging not initialized"]
        }

        // Convert NSArray to [Float]
        var floatSamples = [Float]()
        floatSamples.reserveCapacity(samples.count)
        for i in 0..<samples.count {
            if let val = samples[i] as? NSNumber {
                floatSamples.append(val.floatValue)
            }
        }

        // Create offline stream
        let streamPtr = SherpaOnnxAudioTaggingCreateOfflineStream(tagger)
        guard streamPtr != nil else {
            return ["success": false, "error": "Failed to create offline stream"]
        }

        // Feed audio
        SherpaOnnxAcceptWaveformOffline(streamPtr, Int32(sampleRate), floatSamples, Int32(floatSamples.count))

        // Compute
        let startTime = CFAbsoluteTimeGetCurrent()
        let eventsPtr = SherpaOnnxAudioTaggingCompute(tagger, streamPtr, topK)
        let durationMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0

        var events: [[String: Any]] = []
        if let eventsPtr = eventsPtr {
            var i = 0
            while let eventPtr = eventsPtr[i] {
                let name = String(cString: eventPtr.pointee.name)
                let prob = Double(eventPtr.pointee.prob)
                let index = Int(eventPtr.pointee.index)
                events.append([
                    "name": name,
                    "label": name,
                    "prob": prob,
                    "confidence": prob,
                    "probability": prob,
                    "index": index
                ])
                i += 1
            }
            SherpaOnnxAudioTaggingFreeResults(eventsPtr)
        }

        SherpaOnnxDestroyOfflineStream(streamPtr)

        return [
            "success": true,
            "events": events,
            "durationMs": Int(durationMs)
        ]
    }

    // MARK: - Release

    @objc public func releaseResources() -> NSDictionary {
        cleanupResources()
        return ["released": true]
    }

    private func cleanupResources() {
        if let t = taggerPtr {
            SherpaOnnxDestroyAudioTagging(t)
            taggerPtr = nil
        }
    }
}
