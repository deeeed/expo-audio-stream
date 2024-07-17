//
//  AudioAnalysisData.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation

public struct AudioAnalysisData {
    public var pointsPerSecond: Int
    public var durationMs: Float
    public var bitDepth: Int
    public var numberOfChannels: Int
    public var sampleRate: Float
    public var dataPoints: [DataPoint]
    public var amplitudeRange: (min: Float, max: Float)
    public var speakerChanges: [(timestamp: Float, speaker: Int)]?
    public var extractionTimeMs: Float
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
            "speakerChanges": speakerChanges?.map { ["timestamp": $0.timestamp, "speaker": $0.speaker] } ?? [],
            "extractionTimeMs": extractionTimeMs
        ]
    }
}
