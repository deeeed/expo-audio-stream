//
//  NotificationExtension.swift
//  Pods
//
//  Created by Arthur Breton on 27/10/2024.
//


import Foundation

extension Notification.Name {
    static let pauseRecording = Notification.Name("PAUSE_RECORDING")
    static let resumeRecording = Notification.Name("RESUME_RECORDING")
    static let notificationActionTriggered = Notification.Name("notificationActionTriggered")
}
