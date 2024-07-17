//
//  Features.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 23/6/2024.
//

import Foundation

public struct Features {
    var energy: Float
    var mfcc: [Float]
    var rms: Float
    var zcr: Float
    var spectralCentroid: Float
    var spectralFlatness: Float
    var spectralRollOff: Float?
    var spectralBandwidth: Float?
    var chromagram: [Float]?
    var tempo: Float?
    var hnr: Float?
}

extension Features {
    func toDictionary() -> [String: Any] {
        return [
            "energy": energy,
            "mfcc": mfcc,
            "rms": rms,
            "zcr": zcr,
            "spectralCentroid": spectralCentroid,
            "spectralFlatness": spectralFlatness,
            "spectralRollOff": spectralRollOff ?? 0,
            "spectralBandwidth": spectralBandwidth ?? 0,
            "chromagram": chromagram ?? [],
            "tempo": tempo ?? 0,
            "hnr": hnr ?? 0
        ]
    }
}
