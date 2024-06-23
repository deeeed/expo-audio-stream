// ExtractAudioAnalysis.swift

import Foundation
import AVFoundation

func extractAudioAnalysis(fileUrl: URL, pointsPerSecond: Int, algorithm: String, featureOptions: [String: Bool]) -> AudioAnalysisData? {
    Logger.debug("Extracting audio analysis from \(fileUrl)")
    let startTime = CFAbsoluteTimeGetCurrent()
    
    let asset = AVURLAsset(url: fileUrl)
    guard let assetReader = try? AVAssetReader(asset: asset) else {
        Logger.debug("Failed to create AVAssetReader")
        return nil
    }
    guard let track = asset.tracks(withMediaType: .audio).first else {
        Logger.debug("Failed to find audio track in asset")
        return nil
    }
    
    let trackOutput = AVAssetReaderTrackOutput(track: track, outputSettings: [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsFloatKey: true,
        AVLinearPCMBitDepthKey: 32
    ])
    assetReader.add(trackOutput)
    assetReader.startReading()
    
    var channelData = [Float]()
    while let sampleBuffer = trackOutput.copyNextSampleBuffer(), CMSampleBufferIsValid(sampleBuffer) {
        if let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) {
            let length = CMBlockBufferGetDataLength(blockBuffer)
            var data = Data(count: length)
            _ = data.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
                CMBlockBufferCopyDataBytes(blockBuffer, atOffset: 0, dataLength: length, destination: bytes.baseAddress!)
            }
            let _ = length / MemoryLayout<Float>.size
            data.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
                channelData.append(contentsOf: bytes.bindMemory(to: Float.self))
            }
        }
    }
    
    Logger.debug("Extracted \(channelData.count) samples from audio track")
    if let result = processAudioData(channelData: channelData, sampleRate: Float(track.naturalTimeScale), pointsPerSecond: pointsPerSecond, algorithm: algorithm, featureOptions: featureOptions) {
        let endTime = CFAbsoluteTimeGetCurrent()
        let extractionTime = (endTime - startTime) * 1000 // Time in milliseconds
        var resultWithTime = result
        resultWithTime.extractionTimeMs = extractionTime
        return resultWithTime
    }
    return nil
}
