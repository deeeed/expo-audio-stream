//
//  File.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 22/6/2024.
//

import Foundation
import AVFoundation
import Accelerate

struct DataPoint {
    var amplitude: Float
    var activeSpeech: Bool?
    var dB: Float?
    var silent: Bool?
    var features: Features?
    var timestamp: Float?
    var speaker: Int?
}


extension DataPoint {
    func toDictionary() -> [String: Any] {
        return [
            "amplitude": amplitude,
            "activeSpeech": activeSpeech ?? false,
            "dB": dB ?? 0,
            "silent": silent ?? false,
            "features": features?.toDictionary() ?? [:],
            "timestamp": timestamp ?? 0,
            "speaker": speaker ?? 0
        ]
    }
}


struct Features {
    var energy: Float
    var mfcc: [Float]
    var rms: Float
    var zcr: Float
    var spectralCentroid: Float
    var spectralFlatness: Float
}


extension Features {
    func toDictionary() -> [String: Any] {
        return [
            "energy": energy,
            "mfcc": mfcc,
            "rms": rms,
            "zcr": zcr,
            "spectralCentroid": spectralCentroid,
            "spectralFlatness": spectralFlatness
        ]
    }
}

struct AudioAnalysisData {
    var pointsPerSecond: Int
    var durationMs: Float
    var bitDepth: Int
    var numberOfChannels: Int
    var sampleRate: Float
    var dataPoints: [DataPoint]
    var amplitudeRange: (min: Float, max: Float)
    var speakerChanges: [(timestamp: Float, speaker: Int)]?
}


extension AudioAnalysisData {
    func toDictionary() -> [String: Any] {
        let dataPointsArray = dataPoints.map { $0.toDictionary() }
        return [
            "pointsPerSecond": pointsPerSecond,
            "durationMs": durationMs,
            "bitDepth": bitDepth,
            "numberOfChannels": numberOfChannels,
            "sampleRate": sampleRate,
            "dataPoints": dataPointsArray,
            "amplitudeRange": ["min": amplitudeRange.min, "max": amplitudeRange.max],
            "speakerChanges": speakerChanges?.map { ["timestamp": $0.timestamp, "speaker": $0.speaker] } ?? []
        ]
    }
}


func extractAudioAnalysis(fileUrl: URL, pointsPerSecond: Int, algorithm: String) -> AudioAnalysisData? {
    Logger.debug("Extracting audio analysis from \(fileUrl)")
    
    
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
            let count = length / MemoryLayout<Float>.size
            data.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
                channelData.append(contentsOf: bytes.bindMemory(to: Float.self))
            }
        }
    }
    
    Logger.debug("Extracted \(channelData.count) samples from audio track")
    return processAudioData(channelData: channelData, sampleRate: Float(track.naturalTimeScale), pointsPerSecond: pointsPerSecond, algorithm: algorithm)
}


func processAudioData(channelData: [Float], sampleRate: Float, pointsPerSecond: Int, algorithm: String) -> AudioAnalysisData? {
    Logger.debug("Processing audio data with sample rate: \(sampleRate), points per second: \(pointsPerSecond), algorithm: \(algorithm)")
    
    let length = channelData.count
    let pointInterval = Int(sampleRate) / pointsPerSecond
    var dataPoints = [DataPoint]()
    var minAmplitude: Float = .greatestFiniteMagnitude
    var maxAmplitude: Float = -.greatestFiniteMagnitude
    let durationMs = Float(length) / sampleRate * 1000
    
    var sumSquares: Float = 0
    var zeroCrossings = 0
    var prevValue: Float = 0
    var localMinAmplitude: Float = .greatestFiniteMagnitude
    var localMaxAmplitude: Float = -.greatestFiniteMagnitude
    var segmentData = [Float]()
    
    for i in 0..<length {
        let value = channelData[i]
        sumSquares += value * value
        if i > 0 && value * prevValue < 0 {
            zeroCrossings += 1
        }
        prevValue = value
        
        let absValue = abs(value)
        localMinAmplitude = min(localMinAmplitude, absValue)
        localMaxAmplitude = max(localMaxAmplitude, absValue)
        
        // Collect segment data for feature calculations
        segmentData.append(value)
        
        // If we've reached the end of a segment, calculate the features
        if (i + 1) % pointInterval == 0 || i == length - 1 {
            let segmentLength = (i % pointInterval) + 1
            let rms = sqrt(sumSquares / Float(segmentLength))
            let energy = sumSquares
            let zcr = Float(zeroCrossings) / Float(segmentLength)
            let silent = rms < 0.01
            let dB = 20 * log10(rms)
            
            minAmplitude = min(minAmplitude, rms)
            maxAmplitude = max(maxAmplitude, rms)
            
            let mfcc = extractMFCC(from: segmentData, sampleRate: sampleRate)
            let spectralCentroid = Float(0) // extractSpectralCentroid(from: segmentData, sampleRate: sampleRate)
            let spectralFlatness = Float(0) // extractSpectralFlatness(from: segmentData)
            
//            Logger.debug("Segment \(i / pointInterval): RMS = \(rms), Energy = \(energy), ZCR = \(zcr), dB = \(dB), Spectral Centroid = \(spectralCentroid), Spectral Flatness = \(spectralFlatness)")
  
            let features = Features(
                energy: energy,
                mfcc: mfcc,
                rms: rms,
                zcr: zcr,
                spectralCentroid: spectralCentroid,
                spectralFlatness: spectralFlatness
            )
            
            dataPoints.append(DataPoint(
                amplitude: algorithm == "peak" ? localMaxAmplitude : rms,
                activeSpeech: nil,
                dB: dB,
                silent: silent,
                features: features,
                timestamp: Float(i) / sampleRate,
                speaker: 0 // Placeholder for speaker detection
            ))
            
            // Reset segment calculations
            sumSquares = 0
            zeroCrossings = 0
            localMinAmplitude = .greatestFiniteMagnitude
            localMaxAmplitude = -.greatestFiniteMagnitude
            segmentData.removeAll()
        }
    }
    
    Logger.debug("Processed \(dataPoints.count) data points")
    
    return AudioAnalysisData(
        pointsPerSecond: pointsPerSecond,
        durationMs: durationMs,
        bitDepth: 32,
        numberOfChannels: 1,
        sampleRate: sampleRate,
        dataPoints: dataPoints,
        amplitudeRange: (min: minAmplitude, max: maxAmplitude),
        speakerChanges: [] // Placeholder for speaker changes
    )
}

private func extractMFCC(from segment: [Float], sampleRate: Float) -> [Float] {
    // Placeholder for MFCC extraction logic
    // Here you can implement MFCC extraction using Accelerate framework or any other method
    return []
}

private func extractSpectralCentroid(from segment: [Float], sampleRate: Float) -> Float {
    Logger.debug("Extracting Spectral Centroid from segment of length \(segment.count)")
    
    let length = segment.count
    let log2n = UInt(round(log2(Double(length))))
    
    guard let fftSetup = vDSP_create_fftsetup(log2n, Int32(kFFTRadix2)) else {
        Logger.debug("Failed to create FFT setup")
        return 0.0
    }
    
    // Initialize real and imaginary parts
    var realp = [Float](repeating: 0, count: length / 2)
    var imagp = [Float](repeating: 0, count: length / 2)
    
    // Initialize magnitudes array
    var magnitudes = [Float](repeating: 0.0, count: length / 2)
    var spectralCentroid: Float = 0.0
    
    segment.withUnsafeBufferPointer { bufferPointer in
        realp.withUnsafeMutableBufferPointer { realpPtr in
            imagp.withUnsafeMutableBufferPointer { imagpPtr in
                var splitComplex = DSPSplitComplex(realp: realpPtr.baseAddress!, imagp: imagpPtr.baseAddress!)
                
                // Convert input array to split complex form
                bufferPointer.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: length / 2) { typeConvertedTransferBuffer in
                    vDSP_ctoz(typeConvertedTransferBuffer, 2, &splitComplex, 1, vDSP_Length(length / 2))
                }
                
                // Perform the FFT
                vDSP_fft_zrip(fftSetup, &splitComplex, 1, log2n, Int32(FFT_FORWARD))
                
                // Calculate magnitudes
                vDSP_zvmags(&splitComplex, 1, &magnitudes, 1, vDSP_Length(length / 2))
                
                // Calculate the spectral centroid
                var totalMagnitude: Float = 0.0
                var weightedSum: Float = 0.0
                for i in 0..<magnitudes.count {
                    let magnitude = magnitudes[i]
                    totalMagnitude += magnitude
                    weightedSum += Float(i) * magnitude
                }
                
                spectralCentroid = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0.0
                Logger.debug("Spectral Centroid: \(spectralCentroid)")
            }
        }
    }
    
    vDSP_destroy_fftsetup(fftSetup)
    
    return spectralCentroid
}


private func extractSpectralFlatness(from segment: [Float]) -> Float {
    Logger.debug("Extracting Spectral Flatness from segment of length \(segment.count)")
    
    var mean: Float = 0.0
    var geometricMean: Float = 1.0
    let count = vDSP_Length(segment.count)
    
    vDSP_meamgv(segment, 1, &mean, count)
    
    var sumLogValues: Float = 0.0
    for value in segment {
        // Avoid log(0) by ensuring the value is greater than a small threshold
        let adjustedValue = max(value, 1e-10)
        sumLogValues += log(adjustedValue)
    }
    geometricMean = exp(sumLogValues / Float(count))
    
    let spectralFlatness = mean > 0 ? geometricMean / mean : 0.0
    Logger.debug("Spectral Flatness: \(spectralFlatness)")
    return spectralFlatness
}
