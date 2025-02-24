//
//  DecodingConfig.swift
//  Pods
//
//  Created by Arthur Breton on 24/2/2025.
//

import AVFoundation

public struct DecodingConfig {
    let targetSampleRate: Double?
    let targetChannels: Int?
    let targetBitDepth: Int?
    let normalizeAudio: Bool
    
    static func fromDictionary(_ dict: [String: Any]?) -> DecodingConfig {
        guard let dict = dict else {
            return DecodingConfig.default
        }
        
        return DecodingConfig(
            targetSampleRate: dict["targetSampleRate"] as? Double,
            targetChannels: dict["targetChannels"] as? Int,
            targetBitDepth: dict["targetBitDepth"] as? Int,
            normalizeAudio: dict["normalizeAudio"] as? Bool ?? false
        )
    }
    
    static var `default`: DecodingConfig {
        return DecodingConfig(
            targetSampleRate: nil,
            targetChannels: nil,
            targetBitDepth: nil,
            normalizeAudio: false
        )
    }
    
    func toAudioFormat(baseFormat: AVAudioFormat) -> AVAudioFormat {
        let sampleRate = targetSampleRate ?? baseFormat.sampleRate
        let channels = targetChannels ?? Int(baseFormat.channelCount)
        
        return AVAudioFormat(
            standardFormatWithSampleRate: sampleRate,
            channels: AVAudioChannelCount(channels)
        )!
    }
}
