// AudioProcessing.swift

import Foundation
import Accelerate

func processAudioData(channelData: [Float], sampleRate: Float, pointsPerSecond: Int, algorithm: String, featureOptions: [String: Bool]) -> AudioAnalysisData? {
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
        updateSegmentData(channelData: channelData, index: i, sumSquares: &sumSquares, zeroCrossings: &zeroCrossings, prevValue: &prevValue, localMinAmplitude: &localMinAmplitude, localMaxAmplitude: &localMaxAmplitude, segmentData: &segmentData)

        if (i + 1) % pointInterval == 0 || i == length - 1 {
            let features = computeFeatures(segmentData: segmentData, sampleRate: sampleRate, sumSquares: sumSquares, zeroCrossings: zeroCrossings, segmentLength: (i % pointInterval) + 1, featureOptions: featureOptions)
            let rms = features.rms
            let silent = rms < 0.01
            let dB = featureOptions["dB"] == true ? 20 * log10(rms) : 0
            minAmplitude = min(minAmplitude, rms)
            maxAmplitude = max(maxAmplitude, rms)

            dataPoints.append(DataPoint(
                amplitude: algorithm == "peak" ? localMaxAmplitude : rms,
                activeSpeech: nil,
                dB: dB,
                silent: silent,
                features: features,
                timestamp: Float(i) / sampleRate,
                speaker: 0
            ))

            resetSegmentData(&sumSquares, &zeroCrossings, &localMinAmplitude, &localMaxAmplitude, &segmentData)
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
        speakerChanges: [],
        extractionTimeMs: 0
    )
}

func updateSegmentData(channelData: [Float], index: Int, sumSquares: inout Float, zeroCrossings: inout Int, prevValue: inout Float, localMinAmplitude: inout Float, localMaxAmplitude: inout Float, segmentData: inout [Float]) {
    let value = channelData[index]
    sumSquares += value * value
    if index > 0 && value * prevValue < 0 {
        zeroCrossings += 1
    }
    prevValue = value

    let absValue = abs(value)
    localMinAmplitude = min(localMinAmplitude, absValue)
    localMaxAmplitude = max(localMaxAmplitude, absValue)

    segmentData.append(value)
}

func computeFeatures(segmentData: [Float], sampleRate: Float, sumSquares: Float, zeroCrossings: Int, segmentLength: Int, featureOptions: [String: Bool]) -> Features {
    let rms = sqrt(sumSquares / Float(segmentLength))
    let energy = featureOptions["energy"] == true ? sumSquares : 0
    let zcr = featureOptions["zcr"] == true ? Float(zeroCrossings) / Float(segmentLength) : 0
    let mfcc = featureOptions["mfcc"] == true ? extractMFCC(from: segmentData, sampleRate: sampleRate) : []
    let spectralCentroid = featureOptions["spectralCentroid"] == true ? extractSpectralCentroid(from: segmentData, sampleRate: sampleRate) : 0
    let spectralFlatness = featureOptions["spectralFlatness"] == true ? extractSpectralFlatness(from: segmentData) : 0
    let spectralRollOff = featureOptions["spectralRollOff"] == true ? extractSpectralRollOff(from: segmentData, sampleRate: sampleRate) : 0
    let spectralBandwidth = featureOptions["spectralBandwidth"] == true ? extractSpectralBandwidth(from: segmentData, sampleRate: sampleRate) : 0
    let chromagram = featureOptions["chromagram"] == true ? extractChromagram(from: segmentData, sampleRate: sampleRate) : []
    let tempo = featureOptions["tempo"] == true ? extractTempo(from: segmentData, sampleRate: sampleRate) : 0
    let hnr = featureOptions["hnr"] == true ? extractHNR(from: segmentData) : 0

    return Features(
        energy: energy,
        mfcc: mfcc,
        rms: rms,
        zcr: zcr,
        spectralCentroid: spectralCentroid,
        spectralFlatness: spectralFlatness,
        spectralRollOff: spectralRollOff,
        spectralBandwidth: spectralBandwidth,
        chromagram: chromagram,
        tempo: tempo,
        hnr: hnr
    )
}

func resetSegmentData(_ sumSquares: inout Float, _ zeroCrossings: inout Int, _ localMinAmplitude: inout Float, _ localMaxAmplitude: inout Float, _ segmentData: inout [Float]) {
    sumSquares = 0
    zeroCrossings = 0
    localMinAmplitude = .greatestFiniteMagnitude
    localMaxAmplitude = -.greatestFiniteMagnitude
    segmentData.removeAll()
}

