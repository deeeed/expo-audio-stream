//
//  DataPoint.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation


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
