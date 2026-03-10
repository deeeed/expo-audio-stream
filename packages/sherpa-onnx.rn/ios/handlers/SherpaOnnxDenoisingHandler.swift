import Foundation
import CSherpaOnnx

/// SherpaOnnxDenoisingHandler - Offline Speech Denoising Handler
///
/// Wraps SherpaOnnxOfflineSpeechDenoiserWrapper to remove background noise from audio.
@objc public class SherpaOnnxDenoisingHandler: NSObject {
    private var denoiser: SherpaOnnxOfflineSpeechDenoiserWrapper?

    private static let TAG = "[SherpaOnnxDenoising]"

    @objc public override init() {
        super.init()
    }

    deinit {
        denoiser = nil
    }

    // MARK: - Init

    @objc public func initDenoiser(_ config: NSDictionary) -> NSDictionary {
        NSLog("%@ initDenoiser called", SherpaOnnxDenoisingHandler.TAG)

        guard let modelFile = config["modelFile"] as? String else {
            return ["success": false, "sampleRate": 0, "error": "modelFile is required"]
        }

        let numThreads = config["numThreads"] as? Int ?? 1
        let provider = config["provider"] as? String ?? "cpu"
        let debug = config["debug"] as? Bool ?? false

        if !FileManager.default.fileExists(atPath: modelFile) {
            return ["success": false, "sampleRate": 0, "error": "Model file not found: \(modelFile)"]
        }

        // Release previous instance
        denoiser = nil

        let gtcrnCfg = sherpaOnnxOfflineSpeechDenoiserGtcrnModelConfig(model: modelFile)
        let modelCfg = sherpaOnnxOfflineSpeechDenoiserModelConfig(
            gtcrn: gtcrnCfg,
            numThreads: numThreads,
            provider: provider,
            debug: debug ? 1 : 0
        )
        var cfg = sherpaOnnxOfflineSpeechDenoiserConfig(model: modelCfg)

        let wrapper = SherpaOnnxOfflineSpeechDenoiserWrapper(config: &cfg)
        guard wrapper.impl != nil else {
            return ["success": false, "sampleRate": 0, "error": "Failed to create denoiser — check model file"]
        }

        denoiser = wrapper
        let sampleRate = wrapper.sampleRate

        NSLog("%@ Denoiser initialized, sampleRate=%d", SherpaOnnxDenoisingHandler.TAG, sampleRate)
        return ["success": true, "sampleRate": sampleRate]
    }

    // MARK: - Denoise File

    @objc public func denoiseFile(_ filePath: String) -> NSDictionary {
        guard let d = denoiser else {
            return ["success": false, "outputPath": "", "durationMs": 0, "error": "Denoiser not initialized"]
        }

        let startTime = CFAbsoluteTimeGetCurrent()

        // Read WAV file
        guard let wave = SherpaOnnxReadWave(filePath) else {
            return ["success": false, "outputPath": "", "durationMs": 0, "error": "Failed to read WAV file: \(filePath)"]
        }

        let sampleRate = Int(wave.pointee.sample_rate)
        let numSamples = Int(wave.pointee.num_samples)

        NSLog("%@ Read WAV: sampleRate=%d, numSamples=%d", SherpaOnnxDenoisingHandler.TAG, sampleRate, numSamples)

        // Copy samples to Swift array
        var samples = [Float](repeating: 0, count: numSamples)
        if let ptr = wave.pointee.samples {
            for i in 0..<numSamples {
                samples[i] = ptr[i]
            }
        }
        SherpaOnnxFreeWave(wave)

        // Run denoising
        let result: SherpaOnnxDenoisedAudioWrapper = d.run(samples: samples, sampleRate: sampleRate)

        // Write output WAV to temp directory
        let outputPath = NSTemporaryDirectory() + "denoised_\(Int(CFAbsoluteTimeGetCurrent() * 1000)).wav"
        let saved = result.save(filename: outputPath)

        let durationMs = Int((CFAbsoluteTimeGetCurrent() - startTime) * 1000.0)

        NSLog("%@ Denoising complete: %dms, saved=%d, output=%@",
              SherpaOnnxDenoisingHandler.TAG, durationMs, saved, outputPath)

        if saved == 0 {
            return ["success": false, "outputPath": "", "durationMs": durationMs, "error": "Failed to save denoised audio"]
        }

        return [
            "success": true,
            "outputPath": outputPath,
            "durationMs": durationMs
        ]
    }

    // MARK: - Release

    @objc public func releaseDenoiser() -> NSDictionary {
        denoiser = nil
        NSLog("%@ Denoiser released", SherpaOnnxDenoisingHandler.TAG)
        return ["released": true]
    }
}
