// RecordingSettings.swift

struct NotificationAction {
    var title: String
    var identifier: String
}

struct IOSNotificationConfig {
    var categoryIdentifier: String?
    var actions: [NotificationAction]?
}

struct NotificationConfig {
    var title: String?
    var text: String?
    var icon: String?
    var ios: IOSNotificationConfig?
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
        
        // Parse notification config
        if let notificationDict = dict["notification"] as? [String: Any] {
            var notificationConfig = NotificationConfig()
            notificationConfig.title = notificationDict["title"] as? String
            notificationConfig.text = notificationDict["text"] as? String
            notificationConfig.icon = notificationDict["icon"] as? String
            
            // Parse iOS-specific notification config
            if let iosDict = notificationDict["ios"] as? [String: Any] {
                var iosConfig = IOSNotificationConfig()
                iosConfig.categoryIdentifier = iosDict["categoryIdentifier"] as? String
                
                if let actionsArray = iosDict["actions"] as? [[String: Any]] {
                    iosConfig.actions = actionsArray.map { actionDict in
                        NotificationAction(
                            title: actionDict["title"] as? String ?? "",
                            identifier: actionDict["identifier"] as? String ?? ""
                        )
                    }
                }
                
                notificationConfig.ios = iosConfig
            }
            
            settings.notification = notificationConfig
        }
        
        return settings
    }
}
