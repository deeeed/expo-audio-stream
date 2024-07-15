//
//  DataPoint.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation


public struct DataPoint {
    public var id: Int
    public var amplitude: Float
    public var activeSpeech: Bool?
    public var dB: Float?
    public var silent: Bool?
    public var features: Features?
    public var startTime: Float?
    public var endTime: Float?
    public var speaker: Int?
}

extension DataPoint {
    func toDictionary() -> [String: Any] {
        return [
            "id": id,
            "amplitude": amplitude,
            "activeSpeech": activeSpeech ?? false,
            "dB": dB ?? 0,
            "silent": silent ?? false,
            "features": features?.toDictionary() ?? [:],
            "startTime": startTime ?? 0,
            "endTime": endTime ?? 0,
            "speaker": speaker ?? 0
        ]
    }
}
