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

struct NotificationConfig {
    var title: String?
    var text: String?
    var icon: String?
    var ios: IOSNotificationConfig?
}

struct IOSConfig {
    var audioSession: IOSAudioSessionConfig?
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
    
    static func fromDictionary(_ dict: [String: Any]) -> RecordingSettings {
        var settings = RecordingSettings(
            sampleRate: dict["sampleRate"] as? Double ?? 44100.0,
            desiredSampleRate: dict["desiredSampleRate"] as? Double ?? 44100.0
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
        
        return settings
    }
}
