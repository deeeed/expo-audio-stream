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
    public var startTime: Float?
    public var endTime: Float?
    public var startPosition: Int?
    public var endPosition: Int?
    public var samples: Int?
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
            "startTime": startTime ?? 0,
            "endTime": endTime ?? 0,
            "startPosition": startPosition ?? 0,
            "endPosition": endPosition ?? 0,
            "samples": samples ?? 0
        ]
    }
}
