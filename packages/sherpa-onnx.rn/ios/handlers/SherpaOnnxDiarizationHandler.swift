import Foundation
import CSherpaOnnx

/// SherpaOnnxDiarizationHandler - Offline Speaker Diarization Handler
///
/// Wraps SherpaOnnxOfflineSpeakerDiarizationWrapper to segment audio by speaker.
@objc public class SherpaOnnxDiarizationHandler: NSObject {
    private var sd: SherpaOnnxOfflineSpeakerDiarizationWrapper?

    private static let TAG = "[SherpaOnnxDiarization]"

    @objc public override init() {
        super.init()
    }

    deinit {
        sd = nil
    }

    // MARK: - Init

    @objc public func initDiarization(_ config: NSDictionary) -> NSDictionary {
        NSLog("%@ initDiarization called", SherpaOnnxDiarizationHandler.TAG)

        guard let segModelDir = config["segmentationModelDir"] as? String else {
            return ["success": false, "sampleRate": 0, "error": "segmentationModelDir is required"]
        }
        guard let embModelFile = config["embeddingModelFile"] as? String else {
            return ["success": false, "sampleRate": 0, "error": "embeddingModelFile is required"]
        }

        let numThreads = config["numThreads"] as? Int ?? 1
        let debug = config["debug"] as? Bool ?? false
        let provider = config["provider"] as? String ?? "cpu"
        let minDurationOn = config["minDurationOn"] as? Float ?? 0.3
        let minDurationOff = config["minDurationOff"] as? Float ?? 0.5
        let numClusters = config["numClusters"] as? Int ?? -1
        let threshold = config["threshold"] as? Float ?? 0.5

        // Prefer int8 quantized model if available
        let int8Path = (segModelDir as NSString).appendingPathComponent("model.int8.onnx")
        let segModelPath = FileManager.default.fileExists(atPath: int8Path)
            ? int8Path
            : (segModelDir as NSString).appendingPathComponent("model.onnx")

        if !FileManager.default.fileExists(atPath: segModelPath) {
            return ["success": false, "sampleRate": 0, "error": "Segmentation model not found: \(segModelPath)"]
        }
        if !FileManager.default.fileExists(atPath: embModelFile) {
            return ["success": false, "sampleRate": 0, "error": "Embedding model not found: \(embModelFile)"]
        }

        // Release previous instance
        sd = nil

        let pyannoteConfig = sherpaOnnxOfflineSpeakerSegmentationPyannoteModelConfig(model: segModelPath)
        let segConfig = sherpaOnnxOfflineSpeakerSegmentationModelConfig(
            pyannote: pyannoteConfig,
            numThreads: numThreads,
            debug: debug ? 1 : 0,
            provider: provider
        )
        let embConfig = sherpaOnnxSpeakerEmbeddingExtractorConfig(
            model: embModelFile,
            numThreads: numThreads,
            debug: debug ? 1 : 0,
            provider: provider
        )
        let clusteringConfig = sherpaOnnxFastClusteringConfig(numClusters: numClusters, threshold: threshold)

        var cfg = sherpaOnnxOfflineSpeakerDiarizationConfig(
            segmentation: segConfig,
            embedding: embConfig,
            clustering: clusteringConfig,
            minDurationOn: minDurationOn,
            minDurationOff: minDurationOff
        )

        let wrapper = SherpaOnnxOfflineSpeakerDiarizationWrapper(config: &cfg)
        guard wrapper.impl != nil else {
            return ["success": false, "sampleRate": 0, "error": "Failed to create diarization instance"]
        }
        sd = wrapper

        let sampleRate = wrapper.sampleRate
        NSLog("%@ Diarization initialized, sampleRate=%d", SherpaOnnxDiarizationHandler.TAG, sampleRate)

        return ["success": true, "sampleRate": sampleRate]
    }

    // MARK: - Process file

    @objc public func processDiarizationFile(_ filePath: String, numClusters: Int, threshold: Float) -> NSDictionary {
        guard let sdWrapper = sd else {
            return ["success": false, "segments": [], "numSpeakers": 0, "durationMs": 0,
                    "error": "Diarization not initialized"]
        }

        // Read WAV file
        guard let wave = SherpaOnnxReadWave(filePath) else {
            return ["success": false, "segments": [], "numSpeakers": 0, "durationMs": 0,
                    "error": "Failed to read audio file: \(filePath)"]
        }

        let numSamples = Int(wave.pointee.num_samples)
        var floatSamples = [Float](repeating: 0, count: numSamples)
        for i in 0..<numSamples {
            floatSamples[i] = wave.pointee.samples[i]
        }
        SherpaOnnxFreeWave(wave)

        let startTime = CFAbsoluteTimeGetCurrent()
        let segments = sdWrapper.process(samples: floatSamples)
        let durationMs = Int((CFAbsoluteTimeGetCurrent() - startTime) * 1000)

        var speakerSet = Set<Int>()
        var segmentDicts = [[String: Any]]()
        for seg in segments {
            segmentDicts.append([
                "start": Double(seg.start),
                "end": Double(seg.end),
                "speaker": seg.speaker,
            ])
            speakerSet.insert(seg.speaker)
        }

        return [
            "success": true,
            "segments": segmentDicts,
            "numSpeakers": speakerSet.count,
            "durationMs": durationMs,
        ]
    }

    // MARK: - Release

    @objc public func releaseDiarization() -> NSDictionary {
        sd = nil
        return ["released": true]
    }
}
