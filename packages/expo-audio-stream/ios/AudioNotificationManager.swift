//
//  AudioNotificationManager.swift
//  Pods
//
//  Created by Arthur Breton on 27/10/2024.
//
import Foundation
import UserNotifications
import AVFoundation

class AudioNotificationManager {
    private let notificationCenter = UNUserNotificationCenter.current()
    private let notificationId = "audio_recording_notification"
    private var updateTimer: Timer?
    private var config: NotificationConfig?
    private var currentDuration: TimeInterval = 0

    func initialize(with config: NotificationConfig?) {
        self.config = config
        setupNotificationCategories()
    }
    
    private func setupNotificationCategories() {
        let pauseAction = UNNotificationAction(
            identifier: "PAUSE_RECORDING",
            title: "Pause",
            options: .foreground
        )
        
        let resumeAction = UNNotificationAction(
            identifier: "RESUME_RECORDING",
            title: "Resume",
            options: .foreground
        )
        
        // Add custom actions from config
        var actions = [pauseAction, resumeAction]
        if let customActions = config?.ios?.actions {
            actions.append(contentsOf: customActions.map { action in
                UNNotificationAction(
                    identifier: action.identifier,
                    title: action.title,
                    options: .foreground
                )
            })
        }
        
        let category = UNNotificationCategory(
            identifier: config?.ios?.categoryIdentifier ?? "recording_category",
            actions: actions,
            intentIdentifiers: [],
            options: []
        )
        
        notificationCenter.setNotificationCategories([category])
    }
    
    func startUpdates(startTime: Date) {
        updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateNotification()
        }
    }
    
    func stopUpdates() {
        updateTimer?.invalidate()
        updateTimer = nil
        notificationCenter.removeDeliveredNotifications(withIdentifiers: [notificationId])
    }
    
    func updateState(isPaused: Bool) {
        updateNotification(forcePauseState: isPaused)
    }
    
    func updateDuration(_ duration: TimeInterval) {
        currentDuration = duration
        updateNotification()
    }
    
    private func updateNotification(forcePauseState: Bool? = nil) {
        let content = UNMutableNotificationContent()
        content.title = config?.title ?? "Recording in progress"
        
        // Combine configured text with duration
        let durationText = formatDuration(currentDuration)
        let configText = config?.text ?? ""
        content.body = configText.isEmpty ? durationText : "\(configText) - \(durationText)"
        
        content.categoryIdentifier = config?.ios?.categoryIdentifier ?? "recording_category"
        
        let request = UNNotificationRequest(
            identifier: notificationId,
            content: content,
            trigger: nil
        )
        
        Task {
            do {
                try await notificationCenter.add(request)
            } catch {
                print("Failed to update notification: \(error)")
            }
        }
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
