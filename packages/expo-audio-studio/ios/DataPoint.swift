//
//  DataPoint.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation

public struct SpeechFeatures {
    public var isActive: Bool
    public var speakerId: Int?
    
    func toDictionary() -> [String: Any] {
        return [
            "isActive": isActive,
            "speakerId": speakerId as Any
        ]
    }
}

public struct DataPoint {
    public var id: Int
    public var amplitude: Float
    public var rms: Float
    public var dB: Float
    public var silent: Bool
    public var features: Features?
    public var speech: SpeechFeatures?
    public let startTime: Float // in seconds
    public let endTime: Float   // in seconds
    public let startPosition: Int // byte position in audio file
    public let endPosition: Int   // byte position in audio file
    public let samples: Int       // number of samples in segment
}

extension DataPoint {
    func toDictionary() -> [String: Any] {
        return [
            "id": id,
            "amplitude": amplitude,
            "rms": rms,
            "dB": dB,
            "silent": silent,
            "features": features?.toDictionary() ?? [:],
            "speech": speech?.toDictionary() ?? [:],
            "startTime": startTime,
            "endTime": endTime,
            "startPosition": startPosition,
            "endPosition": endPosition,
            "samples": samples
        ]
    }
}
