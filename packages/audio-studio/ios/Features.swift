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
    var minAmplitude: Float
    var maxAmplitude: Float
    var zcr: Float
    var spectralCentroid: Float
    var spectralFlatness: Float
    var spectralRollOff: Float?
    var spectralBandwidth: Float?
    var chromagram: [Float]?
    var tempo: Float?
    var hnr: Float?
    var melSpectrogram: [Float]?
    var spectralContrast: [Float]?
    var tonnetz: [Float]?
    var pitch: Float?
    var crc32: UInt32?
    
    init(
        energy: Float = 0,
        mfcc: [Float] = [],
        rms: Float = 0,
        minAmplitude: Float = 0,
        maxAmplitude: Float = 0,
        zcr: Float = 0,
        spectralCentroid: Float = 0,
        spectralFlatness: Float = 0,
        spectralRollOff: Float? = nil,
        spectralBandwidth: Float? = nil,
        chromagram: [Float]? = nil,
        tempo: Float? = nil,
        hnr: Float? = nil,
        melSpectrogram: [Float]? = nil,
        spectralContrast: [Float]? = nil,
        tonnetz: [Float]? = nil,
        pitch: Float? = nil,
        crc32: UInt32? = nil
    ) {
        self.energy = energy
        self.mfcc = mfcc
        self.rms = rms
        self.minAmplitude = minAmplitude
        self.maxAmplitude = maxAmplitude
        self.zcr = zcr
        self.spectralCentroid = spectralCentroid
        self.spectralFlatness = spectralFlatness
        self.spectralRollOff = spectralRollOff
        self.spectralBandwidth = spectralBandwidth
        self.chromagram = chromagram
        self.tempo = tempo
        self.hnr = hnr
        self.melSpectrogram = melSpectrogram
        self.spectralContrast = spectralContrast
        self.tonnetz = tonnetz
        self.pitch = pitch
        self.crc32 = crc32
    }
}

extension Features {
    func toDictionary() -> [String: Any] {
        let dict: [String: Any] = [
            "energy": energy,
            "mfcc": mfcc,
            "rms": rms,
            "minAmplitude": minAmplitude,
            "maxAmplitude": maxAmplitude,
            "zcr": zcr,
            "spectralCentroid": spectralCentroid,
            "spectralFlatness": spectralFlatness,
            "spectralRollOff": spectralRollOff ?? 0,
            "spectralBandwidth": spectralBandwidth ?? 0,
            "chromagram": chromagram ?? [],
            "tempo": tempo ?? 0,
            "hnr": hnr ?? 0,
            "melSpectrogram": melSpectrogram ?? [],
            "spectralContrast": spectralContrast ?? [],
            "tonnetz": tonnetz ?? [],
            "pitch": pitch ?? 0,
            "crc32": crc32 ?? 0
        ]
        return dict
    }
}
