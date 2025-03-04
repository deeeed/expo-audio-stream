//
//  AudioAnalysisData.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation

public struct AudioAnalysisData {
    public let segmentDurationMs: Int
    public let durationMs: Int
    public let bitDepth: Int
    public let numberOfChannels: Int
    public let sampleRate: Int
    public let samples: Int
    public let dataPoints: [DataPoint]
    public let amplitudeRange: AmplitudeRange
    public let rmsRange: AmplitudeRange
    public let speechAnalysis: SpeechAnalysis?
    public let extractionTimeMs: Float
    
    public struct AmplitudeRange {
        public let min: Float
        public let max: Float
        
        func toDictionary() -> [String: Float] {
            return [
                "min": min,
                "max": max
            ]
        }
    }
    
    public struct SpeechAnalysis {
        public let speakerChanges: [SpeakerChange]
        
        func toDictionary() -> [String: Any] {
            return [
                "speakerChanges": speakerChanges.map { $0.toDictionary() }
            ]
        }
    }
    
    public struct SpeakerChange {
        public let timestamp: Int64
        public let speakerId: Int
        
        func toDictionary() -> [String: Any] {
            return [
                "timestamp": timestamp,
                "speakerId": speakerId
            ]
        }
    }
}

extension AudioAnalysisData {
    func toDictionary() -> [String: Any?] {
        return [
            "segmentDurationMs": segmentDurationMs,
            "durationMs": durationMs,
            "bitDepth": bitDepth,
            "numberOfChannels": numberOfChannels,
            "sampleRate": sampleRate,
            "samples": samples,
            "dataPoints": dataPoints.map { $0.toDictionary() },
            "amplitudeRange": amplitudeRange.toDictionary(),
            "rmsRange": rmsRange.toDictionary(),
            "speechAnalysis": speechAnalysis?.toDictionary(),
            "extractionTimeMs": extractionTimeMs
        ]
    }
}
