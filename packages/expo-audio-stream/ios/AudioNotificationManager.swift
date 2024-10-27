class AudioNotificationManager {
    private let notificationCenter = UNUserNotificationCenter.current()
    private let notificationId = "audio_recording_notification"
    private var updateTimer: Timer?
    private var config: NotificationConfig?
    private var currentDuration: TimeInterval = 0
    private var lastUpdateTime: Date = Date()
    private var minUpdateInterval: TimeInterval = 1.0  // Minimum time between updates
    
    func initialize(with config: NotificationConfig?) {
        self.config = config
        setupNotificationCategories()
        showInitialNotification()
    }
    
    private func setupNotificationCategories() {
        let pauseAction = UNNotificationAction(
            identifier: "PAUSE_RECORDING",
            title: "Pause",
            options: [.foreground]
        )
        
        let resumeAction = UNNotificationAction(
            identifier: "RESUME_RECORDING",
            title: "Resume",
            options: [.foreground]
        )
        
        let category = UNNotificationCategory(
            identifier: config?.ios?.categoryIdentifier ?? "recording_category",
            actions: [pauseAction, resumeAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        
        notificationCenter.setNotificationCategories([category])
    }
    
    func showInitialNotification() {
        updateNotification()
    }
    
    func startUpdates(startTime: Date) {
        DispatchQueue.main.async {
            self.updateTimer?.invalidate()
            
            self.updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                
                let now = Date()
                if now.timeIntervalSince(self.lastUpdateTime) >= self.minUpdateInterval {
                    self.updateNotification()
                    self.lastUpdateTime = now
                }
            }
            RunLoop.main.add(self.updateTimer!, forMode: .common)
            
            self.showInitialNotification()
        }
    }
    
    func stopUpdates() {
        DispatchQueue.main.async {
            self.updateTimer?.invalidate()
            self.updateTimer = nil
            
            self.notificationCenter.removeDeliveredNotifications(withIdentifiers: [self.notificationId])
            self.notificationCenter.removePendingNotificationRequests(withIdentifiers: [self.notificationId])
        }
    }
    
    func updateState(isPaused: Bool) {
        let now = Date()
        if now.timeIntervalSince(lastUpdateTime) >= minUpdateInterval {
            updateNotification(forcePauseState: isPaused)
            lastUpdateTime = now
        }
    }
    
    func updateDuration(_ duration: TimeInterval) {
        currentDuration = max(0, duration)
        let now = Date()
        if now.timeIntervalSince(lastUpdateTime) >= minUpdateInterval {
            updateNotification()
            lastUpdateTime = now
        }
    }
    
    private func updateNotification(forcePauseState: Bool? = nil) {
        // First, check if we already have a notification
        notificationCenter.getDeliveredNotifications { [weak self] notifications in
            guard let self = self else { return }
            
            // If we have a notification and it was recently updated, skip
            if let existing = notifications.first(where: { $0.request.identifier == self.notificationId }),
               Date().timeIntervalSince(self.lastUpdateTime) < self.minUpdateInterval {
                return
            }
            
            // Create notification content
            let content = UNMutableNotificationContent()
            content.title = forcePauseState == true ?
                "Recording Paused" :
                (self.config?.title ?? "Recording in Progress")
            
            let durationText = self.formatDuration(self.currentDuration)
            let configText = self.config?.text ?? ""
            content.body = configText.isEmpty ? durationText : "\(configText) - \(durationText)"
            
            content.categoryIdentifier = self.config?.ios?.categoryIdentifier ?? "recording_category"
            content.sound = nil
            
            // Create request
            let request = UNNotificationRequest(
                identifier: self.notificationId,
                content: content,
                trigger: nil
            )
            
            // Replace the existing notification
            self.notificationCenter.removeDeliveredNotifications(withIdentifiers: [self.notificationId])
            self.notificationCenter.add(request) { error in
                if let error = error {
                    print("Failed to update notification: \(error)")
                }
            }
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
