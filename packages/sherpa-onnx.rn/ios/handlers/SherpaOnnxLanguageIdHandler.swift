import Foundation
import CSherpaOnnx

@objc public class SherpaOnnxLanguageIdHandler: NSObject {
    private var slidPtr: OpaquePointer?

    private static let TAG = "[SherpaOnnxLanguageId]"

    @objc public override init() {
        super.init()
    }

    deinit {
        cleanupResources()
    }

    // MARK: - Init

    @objc public func initLanguageId(_ config: NSDictionary) -> NSDictionary {
        NSLog("%@ initLanguageId called", SherpaOnnxLanguageIdHandler.TAG)

        guard let modelDir = config["modelDir"] as? String else {
            return ["success": false, "error": "modelDir is required"]
        }

        let encoderFile = config["encoderFile"] as? String ?? "tiny-encoder.int8.onnx"
        let decoderFile = config["decoderFile"] as? String ?? "tiny-decoder.int8.onnx"
        let numThreads = config["numThreads"] as? Int ?? 1
        let debug = config["debug"] as? Bool ?? false
        let provider = config["provider"] as? String ?? "cpu"

        // Find subdirectory (tar.bz2 extracts to subfolder)
        var actualModelDir = modelDir
        let fm = FileManager.default
        if let contents = try? fm.contentsOfDirectory(atPath: modelDir) {
            let subdirs = contents.filter { item in
                var isDir: ObjCBool = false
                fm.fileExists(atPath: (modelDir as NSString).appendingPathComponent(item), isDirectory: &isDir)
                return isDir.boolValue && !item.hasPrefix(".")
            }
            if subdirs.count == 1 {
                actualModelDir = (modelDir as NSString).appendingPathComponent(subdirs[0])
            }
        }

        let encoderPath = (actualModelDir as NSString).appendingPathComponent(encoderFile)
        let decoderPath = (actualModelDir as NSString).appendingPathComponent(decoderFile)

        if !fm.fileExists(atPath: encoderPath) {
            return ["success": false, "error": "Encoder file not found: \(encoderPath)"]
        }
        if !fm.fileExists(atPath: decoderPath) {
            return ["success": false, "error": "Decoder file not found: \(decoderPath)"]
        }

        cleanupResources()

        let encoderC = strdup(encoderPath)!
        let decoderC = strdup(decoderPath)!
        let providerC = strdup(provider)!

        var whisperConfig = SherpaOnnxSpokenLanguageIdentificationWhisperConfig(
            encoder: encoderC,
            decoder: decoderC,
            tail_paddings: -1
        )

        var slidConfig = SherpaOnnxSpokenLanguageIdentificationConfig(
            whisper: whisperConfig,
            num_threads: Int32(numThreads),
            debug: debug ? 1 : 0,
            provider: providerC
        )

        let ptr = SherpaOnnxCreateSpokenLanguageIdentification(&slidConfig)

        free(encoderC)
        free(decoderC)
        free(providerC)

        guard ptr != nil else {
            return ["success": false, "error": "Failed to create Language ID instance"]
        }

        slidPtr = ptr

        NSLog("%@ Language ID initialized successfully", SherpaOnnxLanguageIdHandler.TAG)
        return ["success": true]
    }

    // MARK: - Detect from samples

    @objc public func detectLanguage(_ sampleRate: Int, samples: NSArray) -> NSDictionary {
        guard let slid = slidPtr else {
            return ["success": false, "error": "Language ID not initialized"]
        }

        var floatSamples = [Float]()
        floatSamples.reserveCapacity(samples.count)
        for i in 0..<samples.count {
            if let val = samples[i] as? NSNumber {
                floatSamples.append(val.floatValue)
            }
        }

        let startTime = CFAbsoluteTimeGetCurrent()

        let streamPtr = SherpaOnnxSpokenLanguageIdentificationCreateOfflineStream(slid)
        guard streamPtr != nil else {
            return ["success": false, "error": "Failed to create offline stream"]
        }

        floatSamples.withUnsafeBufferPointer { bufferPtr in
            SherpaOnnxAcceptWaveformOffline(streamPtr, Int32(sampleRate), bufferPtr.baseAddress, Int32(floatSamples.count))
        }

        let resultPtr = SherpaOnnxSpokenLanguageIdentificationCompute(slid, streamPtr)
        let durationMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0

        var lang = ""
        if let resultPtr = resultPtr {
            lang = String(cString: resultPtr.pointee.lang)
            SherpaOnnxDestroySpokenLanguageIdentificationResult(resultPtr)
        }

        SherpaOnnxDestroyOfflineStream(streamPtr)

        NSLog("%@ Detected language: %@ in %.0fms", SherpaOnnxLanguageIdHandler.TAG, lang, durationMs)

        return [
            "success": true,
            "language": lang,
            "durationMs": Int(durationMs)
        ]
    }

    // MARK: - Detect from file

    @objc public func detectLanguageFromFile(_ filePath: String) -> NSDictionary {
        guard let slid = slidPtr else {
            return ["success": false, "error": "Language ID not initialized"]
        }

        guard FileManager.default.fileExists(atPath: filePath) else {
            return ["success": false, "error": "File not found: \(filePath)"]
        }

        guard let wave = SherpaOnnxReadWave(filePath) else {
            return ["success": false, "error": "Failed to read WAV file: \(filePath)"]
        }

        let sampleRate = Int(wave.pointee.sample_rate)
        let numSamples = Int(wave.pointee.num_samples)

        let startTime = CFAbsoluteTimeGetCurrent()

        let streamPtr = SherpaOnnxSpokenLanguageIdentificationCreateOfflineStream(slid)
        guard streamPtr != nil else {
            SherpaOnnxFreeWave(wave)
            return ["success": false, "error": "Failed to create offline stream"]
        }

        SherpaOnnxAcceptWaveformOffline(streamPtr, Int32(sampleRate), wave.pointee.samples, Int32(numSamples))
        SherpaOnnxFreeWave(wave)

        let resultPtr = SherpaOnnxSpokenLanguageIdentificationCompute(slid, streamPtr)
        let durationMs = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0

        var lang = ""
        if let resultPtr = resultPtr {
            lang = String(cString: resultPtr.pointee.lang)
            SherpaOnnxDestroySpokenLanguageIdentificationResult(resultPtr)
        }

        SherpaOnnxDestroyOfflineStream(streamPtr)

        NSLog("%@ Detected language from file: %@ in %.0fms", SherpaOnnxLanguageIdHandler.TAG, lang, durationMs)

        return [
            "success": true,
            "language": lang,
            "durationMs": Int(durationMs)
        ]
    }

    // MARK: - Release

    @objc public func releaseLanguageId() -> NSDictionary {
        cleanupResources()
        return ["released": true]
    }

    private func cleanupResources() {
        if let ptr = slidPtr {
            SherpaOnnxDestroySpokenLanguageIdentification(ptr)
            slidPtr = nil
        }
        NSLog("%@ Language ID resources released", SherpaOnnxLanguageIdHandler.TAG)
    }
}
