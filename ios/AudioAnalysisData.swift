//
//  AudioAnalysisData.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation

struct AudioAnalysisData {
    var pointsPerSecond: Int
    var durationMs: Float
    var bitDepth: Int
    var numberOfChannels: Int
    var sampleRate: Float
    var dataPoints: [DataPoint]
    var amplitudeRange: (min: Float, max: Float)
    var speakerChanges: [(timestamp: Float, speaker: Int)]?
    var extractionTimeMs: Double
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
