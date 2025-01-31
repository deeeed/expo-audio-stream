// RecordingSettings.swift

import AVFoundation

struct NotificationAction {
    var title: String
    var identifier: String
}

struct IOSAudioSessionConfig {
    var category: AVAudioSession.Category
    var mode: AVAudioSession.Mode
    var categoryOptions: AVAudioSession.CategoryOptions
}

struct IOSNotificationConfig {
    var categoryIdentifier: String?
}

struct CompressedRecordingInfo {
    var fileUri: String
    var mimeType: String
    var bitrate: Int
    var format: String
    var size: Int64 = 0  // Add size with default value
    
    static func validate(format: String, bitrate: Int) -> Result<(String, Int), Error> {
        // Validate format
        guard ["aac", "opus"].contains(format.lowercased()) else {
            return .failure(RecordingError.unsupportedFormat(format))
        }
        
        // Adjust bitrate based on format
        let adjustedBitrate: Int
        if format.lowercased() == "aac" {
            // Standard AAC bitrates (bps)
            let standardAACBitrates = [32000, 48000, 64000, 96000, 128000, 160000, 192000, 256000, 320000]
            adjustedBitrate = standardAACBitrates.min(by: { abs($0 - bitrate) < abs($1 - bitrate) }) ?? 128000
        } else {
            // For Opus, allow lower bitrates (especially good for voice)
            // Typical Opus voice bitrates: 8-24 kbps, music: 32-128 kbps
            adjustedBitrate = min(max(bitrate, 8000), 320000)
        }
        
        return .success((format, adjustedBitrate))
    }
}

struct NotificationConfig {
    var title: String?
    var text: String?
    var icon: String?
    var ios: IOSNotificationConfig?
}

struct IOSConfig {
    var audioSession: IOSAudioSessionConfig?
}

enum RecordingError: Error {
    case unsupportedFormat(String)
    case invalidBitrate(Int)
    
    var localizedDescription: String {
        switch self {
        case .unsupportedFormat(let format):
            return "Unsupported compression format: \(format). iOS only supports AAC."
        case .invalidBitrate(let bitrate):
            return "Invalid bitrate: \(bitrate). Must be between 8000 and 960000 bps."
        }
    }
}

struct RecordingSettings {
    // Core recording settings
    var sampleRate: Double
    var desiredSampleRate: Double
    var numberOfChannels: Int = 1
    var bitDepth: Int = 16
    var interval: Int?
    
    // Feature flags
    var keepAwake: Bool = false
    var showNotification: Bool = false
    var enableProcessing: Bool = false
    
    // Analysis settings
    var pointsPerSecond: Int? = 1000
    var algorithm: String? = "rms"
    var featureOptions: [String: Bool]? = ["rms": true, "zcr": true]
    
    // iOS-specific configuration
    var ios: IOSConfig?
    
    // Notification configuration
    var notification: NotificationConfig?
    
    let enableCompressedOutput: Bool
    let compressedFormat: String // "aac" or "opus"
    let compressedBitRate: Int
    
    let autoResumeAfterInterruption: Bool
    
    static func fromDictionary(_ dict: [String: Any]) -> Result<RecordingSettings, Error> {
        // Extract compression settings
        let compression = dict["compression"] as? [String: Any]
        let enableCompressedOutput = compression?["enabled"] as? Bool ?? false
        let compressedFormat = (compression?["format"] as? String)?.lowercased() ?? "opus"
        let compressedBitRate = compression?["bitrate"] as? Int ?? 24000
        
        // Validate compression settings if enabled
        if enableCompressedOutput {
            // Validate format and bitrate
            if case .failure(let error) = CompressedRecordingInfo.validate(
                format: compressedFormat,
                bitrate: compressedBitRate
            ) {
                return .failure(error)
            }
        }
        
        // Create settings
        var settings = RecordingSettings(
            sampleRate: dict["sampleRate"] as? Double ?? 44100.0,
            desiredSampleRate: dict["desiredSampleRate"] as? Double ?? 44100.0,
            enableCompressedOutput: enableCompressedOutput,
            compressedFormat: compressedFormat,
            compressedBitRate: compressedBitRate,
            autoResumeAfterInterruption: dict["autoResumeAfterInterruption"] as? Bool ?? false
        )
        
        // Parse core settings
        settings.numberOfChannels = dict["channels"] as? Int ?? 1
        settings.bitDepth = dict["bitDepth"] as? Int ?? 16
        settings.interval = dict["interval"] as? Int
        
        // Parse feature flags
        settings.keepAwake = dict["keepAwake"] as? Bool ?? false
        settings.showNotification = dict["showNotification"] as? Bool ?? false
        settings.enableProcessing = dict["enableProcessing"] as? Bool ?? false
        
        // Parse analysis settings
        settings.pointsPerSecond = dict["pointsPerSecond"] as? Int
        settings.algorithm = dict["algorithm"] as? String
        settings.featureOptions = dict["features"] as? [String: Bool]
        
        // Parse iOS-specific config
        if let iosDict = dict["ios"] as? [String: Any],
           let audioSessionDict = iosDict["audioSession"] as? [String: Any] {
            
            // Map category
            let category: AVAudioSession.Category
            if let categoryStr = audioSessionDict["category"] as? String {
                switch categoryStr {
                    case "Ambient": category = .ambient
                    case "SoloAmbient": category = .soloAmbient
                    case "Playback": category = .playback
                    case "Record": category = .record
                    case "PlayAndRecord": category = .playAndRecord
                    case "MultiRoute": category = .multiRoute
                    default: category = .record
                }
            } else {
                category = .record
            }
            
            // Map mode
            let mode: AVAudioSession.Mode
            if let modeStr = audioSessionDict["mode"] as? String {
                switch modeStr {
                    case "Default": mode = .default
                    case "VoiceChat": mode = .voiceChat
                    case "VideoChat": mode = .videoChat
                    case "GameChat": mode = .gameChat
                    case "VideoRecording": mode = .videoRecording
                    case "Measurement": mode = .measurement
                    case "MoviePlayback": mode = .moviePlayback
                    case "SpokenAudio": mode = .spokenAudio
                    default: mode = .default
                }
            } else {
                mode = .default
            }
            
            // Map category options
            var categoryOptions: AVAudioSession.CategoryOptions = []
            if let optionsArray = audioSessionDict["categoryOptions"] as? [String] {
                for option in optionsArray {
                    switch option {
                        case "MixWithOthers": categoryOptions.insert(.mixWithOthers)
                        case "DuckOthers": categoryOptions.insert(.duckOthers)
                        case "InterruptSpokenAudioAndMixWithOthers": categoryOptions.insert(.interruptSpokenAudioAndMixWithOthers)
                        case "AllowBluetooth": categoryOptions.insert(.allowBluetooth)
                        case "AllowBluetoothA2DP": categoryOptions.insert(.allowBluetoothA2DP)
                        case "AllowAirPlay": categoryOptions.insert(.allowAirPlay)
                        case "DefaultToSpeaker": categoryOptions.insert(.defaultToSpeaker)
                        default: break
                    }
                }
            }
            
            settings.ios = IOSConfig(audioSession: IOSAudioSessionConfig(
                category: category,
                mode: mode,
                categoryOptions: categoryOptions
            ))
        }
        
        // Parse notification config
        if let notificationDict = dict["notification"] as? [String: Any] {
            var notificationConfig = NotificationConfig()
            notificationConfig.title = notificationDict["title"] as? String
            notificationConfig.text = notificationDict["text"] as? String
            notificationConfig.icon = notificationDict["icon"] as? String
            
            // Parse iOS-specific notification config
            if let iosNotificationDict = notificationDict["ios"] as? [String: Any] {
                notificationConfig.ios = IOSNotificationConfig(
                    categoryIdentifier: iosNotificationDict["categoryIdentifier"] as? String
                )
            }
            
            settings.notification = notificationConfig
        }
        
        return .success(settings)
    }
}
