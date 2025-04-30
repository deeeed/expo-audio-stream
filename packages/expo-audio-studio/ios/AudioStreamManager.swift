//
//  AudioStreamManager.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 21/4/2024.
//

import Foundation
import AVFoundation
import Accelerate
import UIKit
import MediaPlayer
import UserNotifications

// Constants
internal let WAV_HEADER_SIZE: Int64 = 44  // Standard WAV header is 44 bytes

// Helper to convert to little-endian byte array
extension UInt32 {
    var littleEndianBytes: [UInt8] {
        let value = self.littleEndian
        return [UInt8(value & 0xff), UInt8((value >> 8) & 0xff), UInt8((value >> 16) & 0xff), UInt8((value >> 24) & 0xff)]
    }
}

extension UInt16 {
    var littleEndianBytes: [UInt8] {
        let value = self.littleEndian
        return [UInt8(value & 0xff), UInt8((value >> 8) & 0xff)]
    }
}

// Define DeviceDisconnectionBehavior enum mirroring ExpoAudioStream.types.ts
enum DeviceDisconnectionBehavior: String {
    case PAUSE = "pause"
    case FALLBACK = "fallback"
}

class AudioStreamManager: NSObject, AudioDeviceManagerDelegate {
    private let audioEngine = AVAudioEngine()
    private var inputNode: AVAudioInputNode {
        return audioEngine.inputNode
    }
    internal var recordingFileURL: URL?
    private var audioProcessor: AudioProcessor?
    private var fileHandle: FileHandle?
    private var startTime: Date?
    private var totalPausedDuration: TimeInterval = 0  // Track total paused time
    private var currentPauseStart: Date?              // Track current pause start
    var isRecording = false
    var isPaused = false
    var isPrepared = false  // Add this new state flag
    
    // Wake lock related properties
    private var wasIdleTimerDisabled: Bool = false  // Track previous idle timer state
    private var isWakeLockEnabled: Bool = false     // Track current wake lock state


    // Data emission for onAudioStream
    internal var lastEmissionTime: Date?
    internal var lastEmittedSize: Int64 = 0
    internal var lastEmittedCompressedSize: Int64 = 0
    private var totalDataSize: Int64 = 0
    private var lastBufferTime: AVAudioTime?
    private var accumulatedData = Data()

    // Data emission for onAudioAnalysis
    internal var lastEmissionTimeAnalysis: Date?
    internal var lastEmittedSizeAnalysis: Int64 = 0
    internal var lastEmittedCompressedSizeAnalysis: Int64 = 0
    private var totalDataSizeAnalysis: Int64 = 0
    private var lastBufferTimeAnalysis: AVAudioTime?
    private var accumulatedAnalysisData = Data()



    private var fileManager = FileManager.default
    internal var recordingSettings: RecordingSettings?
    internal var recordingUUID: UUID?
    internal var mimeType: String = "audio/wav"
    private var recentData = [Float]() // This property stores the recent audio data
    private var notificationUpdateTimer: Timer?
    
    private var notificationManager: AudioNotificationManager?
    private var notificationView: MPNowPlayingInfoCenter?
    private var audioSession: AVAudioSession?
    private var notificationObserver: Any?
    private var mediaInfoUpdateTimer: Timer?
    private var remoteCommandCenter: MPRemoteCommandCenter?

    weak var delegate: AudioStreamManagerDelegate?  // Define the delegate here
        
    private var lastValidDuration: TimeInterval?  // Add this property
    
    private var compressedRecorder: AVAudioRecorder?
    private var compressedFileURL: URL?
    private var compressedFormat: String = "aac"
    private var compressedBitRate: Int = 128000
    
    // Add property to track auto-resume preference
    private var autoResumeAfterInterruption: Bool = false
    
    // Add these properties
    private var emissionInterval: TimeInterval = 1.0  // Default 1 second
    private var emissionIntervalAnalysis: TimeInterval = 0.5  // Default 0.5 seconds

    // ---> ADD BACK deviceManager PROPERTY <--- 
    private let deviceManager = AudioDeviceManager()

    /// Initializes the AudioStreamManager
    override init() {
        super.init()
        deviceManager.delegate = self // Set the delegate
        // Only keep audio session interruption observer here
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionInterruption),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )

    }
    
    deinit {
       // Ensure wake lock is disabled when the manager is deallocated
       disableWakeLock()
        if let observer = notificationObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
    
    /// Handles an audio session interruption.
    @objc private func handleAudioSessionInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        let wasSuspended = isPaused
        
        switch type {
        case .began:
            Logger.debug("Audio session interruption began")
            // Store the pause start time if not already paused
            if !wasSuspended {
                currentPauseStart = Date()
                pauseRecording()
            }
            
            // Always notify delegate of interruption
            delegate?.audioStreamManager(
                self,
                didReceiveInterruption: [
                    "type": "began",
                    "wasSuspended": wasSuspended
                ]
            )
            
        case .ended:
            Logger.debug("Audio session interruption ended - autoResume: \(autoResumeAfterInterruption), wasSuspended: \(wasSuspended)")
            if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                Logger.debug("Interruption options - shouldResume: \(options.contains(.shouldResume))")
                
                // Calculate pause duration if we have a pause start time
                if let pauseStart = currentPauseStart {
                    let pauseDuration = Date().timeIntervalSince(pauseStart)
                    totalPausedDuration += pauseDuration
                    currentPauseStart = nil
                    Logger.debug("Added interruption pause duration: \(pauseDuration), total paused: \(totalPausedDuration)")
                }
                
                // For phone calls, we should auto-resume if enabled, regardless of previous pause state
                if autoResumeAfterInterruption && isRecording {
                    // Add a longer delay for phone calls and ensure proper session setup
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                        guard let self = self else { return }
                        Logger.debug("Attempting to auto-resume recording after phone call")
                        
                        // Configure audio session
                        do {
                            let session = AVAudioSession.sharedInstance()
                            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .mixWithOthers])
                            try session.setActive(true, options: .notifyOthersOnDeactivation)
                            
                            // Resume if we're still recording and paused
                            if self.isRecording && self.isPaused {
                                Logger.debug("Resuming recording after phone call interruption")
                                self.audioEngine.prepare() 
                                self.resumeRecording()
                            } else {
                                Logger.debug("Cannot resume - recording state invalid: isRecording=\(self.isRecording), isPaused=\(self.isPaused)")
                            }
                        } catch {
                            Logger.debug("Failed to reactivate audio session: \(error)")
                            self.delegate?.audioStreamManager(self, didFailWithError: "Failed to auto-resume: \(error.localizedDescription)")
                        }
                    }
                }
                
                // Always notify delegate of interruption end
                delegate?.audioStreamManager(
                    self,
                    didReceiveInterruption: [
                        "type": "ended",
                        "wasSuspended": wasSuspended,
                        "shouldResume": options.contains(.shouldResume)
                    ]
                )
            }
        @unknown default:
            break
        }
    }
    
    private func setupNowPlayingInfo() {
        // Configure audio session for background audio
        audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession?.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .mixWithOthers])
            try audioSession?.setActive(true)
        } catch {
            Logger.debug("Failed to configure audio session: \(error)")
        }
        
        // Setup Now Playing info
        notificationView = MPNowPlayingInfoCenter.default()
        updateNowPlayingInfo(isPaused: false)
        
        // Configure Remote Command Center
        setupRemoteCommandCenter()
        
        // Enable remote control events on main thread
        DispatchQueue.main.async {
            UIApplication.shared.beginReceivingRemoteControlEvents()
        }
    }
    
    private func setupRemoteCommandCenter() {
        remoteCommandCenter = MPRemoteCommandCenter.shared()
        
        // Remove any existing handlers
        remoteCommandCenter?.pauseCommand.removeTarget(nil)
        remoteCommandCenter?.playCommand.removeTarget(nil)
        
        // Add pause command handler
        remoteCommandCenter?.pauseCommand.addTarget { [weak self] _ in
            guard let self = self, self.isRecording && !self.isPaused else {
                return .commandFailed
            }
            self.pauseRecording()
            return .success
        }
        
        // Add play/resume command handler
        remoteCommandCenter?.playCommand.addTarget { [weak self] _ in
            guard let self = self, self.isRecording && self.isPaused else {
                return .commandFailed
            }
            self.resumeRecording()
            return .success
        }
        
        // Enable the commands
        remoteCommandCenter?.pauseCommand.isEnabled = true
        remoteCommandCenter?.playCommand.isEnabled = true
        
        // Disable unused commands
        remoteCommandCenter?.nextTrackCommand.isEnabled = false
        remoteCommandCenter?.previousTrackCommand.isEnabled = false
        remoteCommandCenter?.changePlaybackRateCommand.isEnabled = false
        remoteCommandCenter?.seekBackwardCommand.isEnabled = false
        remoteCommandCenter?.seekForwardCommand.isEnabled = false
    }
    
    private func updateNowPlayingInfo(isPaused: Bool) {
        var nowPlayingInfo = [String: Any]()
        
        // Set media title and artist
        nowPlayingInfo[MPMediaItemPropertyTitle] = recordingSettings?.notification?.title ?? "Recording in Progress"
        nowPlayingInfo[MPMediaItemPropertyArtist] = "Audio Stream"
        
        // Set playback state
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPaused ? 0.0 : 1.0
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentRecordingDuration()
        
        // Add placeholder image if available
        if let image = UIImage(named: "recording_icon") {
            nowPlayingInfo[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { size in
                return image
            }
        }
        
        // Update the info on main thread
        DispatchQueue.main.async {
            self.notificationView?.nowPlayingInfo = nowPlayingInfo
        }
    }
    
    func currentRecordingDuration() -> TimeInterval {
        // If we're paused, return the last valid duration
        if isPaused, let lastDuration = lastValidDuration {
            return lastDuration
        }
        
        guard let startTime = self.startTime else { return 0 }
        
        let now = Date()
        var duration = now.timeIntervalSince(startTime)
        
        // Subtract total paused duration
        duration -= TimeInterval(totalPausedDuration)
        
        // If we're currently in a pause (including background pause for !keepAwake), subtract that too
        if let pauseStart = currentPauseStart {
            duration -= now.timeIntervalSince(pauseStart)
        }
        
        return duration
    }
    
    private func cleanupNotificationObservers() {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func handlePauseNotification(_ notification: Notification) {
        // Only handle if recording and notifications are enabled
        guard isRecording, recordingSettings?.showNotification == true else { return }
        pauseRecording()
    }
    
    @objc private func handleResumeNotification(_ notification: Notification) {
        // Only handle if recording and notifications are enabled
        guard isRecording, recordingSettings?.showNotification == true else { return }
        resumeRecording()
    }
    
    @objc private func handlePauseAction() {
        pauseRecording()
        updateNotificationState(isPaused: true)
    }

    @objc private func handleResumeAction() {
        resumeRecording()
        updateNotificationState(isPaused: false)
    }
    
    @objc private func handleAppDidEnterBackground(_ notification: Notification) {
        if isRecording {
            // If keepAwake is false, we should track this as a pause
            if let settings = recordingSettings, !settings.keepAwake {
                currentPauseStart = Date()
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                self?.notificationManager?.showInitialNotification()
            }
        }
    }

    @objc private func handleAppWillEnterForeground(_ notification: Notification) {
        if isRecording {
            // If we were paused due to background and keepAwake was false, calculate pause duration
            if let settings = recordingSettings, !settings.keepAwake, let pauseStart = currentPauseStart {
                let pauseDuration = Date().timeIntervalSince(pauseStart)
                totalPausedDuration += pauseDuration
                currentPauseStart = nil
                Logger.debug("Added background pause duration: \(pauseDuration), total paused: \(totalPausedDuration)")
            }
            
            notificationManager?.stopUpdates()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self = self else { return }
                self.notificationManager?.startUpdates(startTime: self.startTime ?? Date())
            }
        }
    }
    
    private func updateNotificationState(isPaused: Bool) {
        // Calculate current duration
        let currentDuration: TimeInterval
        if let startTime = startTime {
            currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(totalPausedDuration)
        } else {
            currentDuration = 0
        }

        // Update Now Playing info
        var nowPlayingInfo = notificationView?.nowPlayingInfo ?? [:]
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPaused ? 0.0 : 1.0
        nowPlayingInfo[MPMediaItemPropertyTitle] = isPaused ?
            "Recording Paused" :
            (recordingSettings?.notification?.title ?? "Recording in Progress")
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentDuration
        notificationView?.nowPlayingInfo = nowPlayingInfo

        // Delegate notification update to AudioNotificationManager
        notificationManager?.updateState(isPaused: isPaused)
    }
    
    private func updateMediaInfo() {
        guard let startTime = startTime else { return }
        
        let currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(totalPausedDuration)
        
        var nowPlayingInfo = notificationView?.nowPlayingInfo ?? [:]
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentDuration
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPaused ? 0.0 : 1.0
        notificationView?.nowPlayingInfo = nowPlayingInfo
    }
    
    /// Enables the wake lock to prevent screen dimming
    private func enableWakeLock() {
        guard let settings = recordingSettings,
              settings.keepAwake, // Only proceed if keepAwake is true
              !isWakeLockEnabled // Only proceed if wake lock isn't already enabled
        else { return }
        
        DispatchQueue.main.async {
            self.wasIdleTimerDisabled = UIApplication.shared.isIdleTimerDisabled
            UIApplication.shared.isIdleTimerDisabled = true
            self.isWakeLockEnabled = true
            Logger.debug("Wake lock enabled")
        }
    }
    
    /// Disables the wake lock and restores previous screen dimming state
    private func disableWakeLock() {
        guard let settings = recordingSettings,
              settings.keepAwake, // Only proceed if keepAwake is true
              isWakeLockEnabled  // Only proceed if wake lock is currently enabled
        else { return }
        
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = self.wasIdleTimerDisabled
            self.isWakeLockEnabled = false
            Logger.debug("Wake lock disabled")
        }
    }
    
    /// Creates a new recording file.
    /// - Returns: The URL of the newly created recording file, or nil if creation failed.
    private func createRecordingFile(isCompressed: Bool = false) -> URL? {
        // Add debug logging
        Logger.debug("Creating recording file - settings filename: \(recordingSettings?.filename ?? "nil")")
        
        // Get base directory - use default if no custom directory provided
        let baseDirectory: URL
        if let customDir = recordingSettings?.outputDirectory {
            baseDirectory = URL(fileURLWithPath: customDir)
            Logger.debug("Using custom directory: \(customDir)")
        } else {
            // Use existing default behavior
            baseDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
            Logger.debug("Using default directory: \(baseDirectory.path)")
        }
        
        // Generate or reuse UUID for filename
        let baseFilename: String
        if let existingFilename = recordingSettings?.filename {
            baseFilename = existingFilename
        } else {
            // Always create a new UUID for recording unless a filename is provided
            let newUUID = UUID()
            recordingUUID = newUUID
            baseFilename = newUUID.uuidString
        }
        Logger.debug("Using base filename: \(baseFilename)")
        
        // Remove any existing extension from the filename
        let filenameWithoutExtension = baseFilename.replacingOccurrences(
            of: "\\.[^\\.]+$",
            with: "",
            options: .regularExpression
        )
        
        // Choose extension based on whether this is a compressed file
        let fileExtension: String
        if isCompressed {
            fileExtension = recordingSettings?.compressedFormat.lowercased() ?? "aac"
        } else {
            fileExtension = "wav"
        }
        
        let fullFilename = "\(filenameWithoutExtension).\(fileExtension)"
        Logger.debug("Full filename: \(fullFilename)")
        
        let fileURL = baseDirectory.appendingPathComponent(fullFilename)
        Logger.debug("Final file URL: \(fileURL.path)")
        
        // Check if file already exists
        if fileManager.fileExists(atPath: fileURL.path) {
            Logger.debug("File already exists at: \(fileURL.path)")
            return nil
        }
        
        if !fileManager.createFile(atPath: fileURL.path, contents: nil, attributes: nil) {
            Logger.debug("Failed to create file at: \(fileURL.path)")
            return nil
        }
        return fileURL
    }
    
    /// Creates a WAV header for the given data size.
    /// - Parameter dataSize: The size of the audio data.
    /// - Returns: A Data object containing the WAV header.
    private func createWavHeader(dataSize: Int) -> Data {
        var header = Data()
        
        let sampleRate = UInt32(recordingSettings!.sampleRate)
        let channels = UInt32(recordingSettings!.numberOfChannels)
        let bitDepth = UInt32(recordingSettings!.bitDepth)
        
        let blockAlign = channels * (bitDepth / 8)
        let byteRate = sampleRate * blockAlign
        
        // "RIFF" chunk descriptor
        header.append(contentsOf: "RIFF".utf8)
        header.append(contentsOf: UInt32(36 + dataSize).littleEndianBytes)
        header.append(contentsOf: "WAVE".utf8)
        
        // "fmt " sub-chunk
        header.append(contentsOf: "fmt ".utf8)
        header.append(contentsOf: UInt32(16).littleEndianBytes)  // PCM format requires 16 bytes for the fmt sub-chunk
        header.append(contentsOf: UInt16(1).littleEndianBytes)   // Audio format 1 for PCM
        header.append(contentsOf: UInt16(channels).littleEndianBytes)
        header.append(contentsOf: sampleRate.littleEndianBytes)
        header.append(contentsOf: byteRate.littleEndianBytes)    // byteRate
        header.append(contentsOf: UInt16(blockAlign).littleEndianBytes)  // blockAlign
        header.append(contentsOf: UInt16(bitDepth).littleEndianBytes)  // bits per sample
        
        // "data" sub-chunk
        header.append(contentsOf: "data".utf8)
        header.append(contentsOf: UInt32(dataSize).littleEndianBytes)  // Sub-chunk data size
        
        return header
    }
    
    /// Gets the current status of the recording.
    /// - Returns: A dictionary containing the recording status information.
    func getStatus() -> [String: Any] {
        guard let settings = recordingSettings else {
            print("Recording settings are not available.")
            return [:]
        }
        
        let durationInSeconds = currentRecordingDuration()
        let durationInMilliseconds = Int(durationInSeconds * 1000)
        
        var status: [String: Any] = [
            "durationMs": durationInMilliseconds,
            "isRecording": isRecording,
            "isPaused": isPaused,
            "mimeType": mimeType,
            "size": totalDataSize
        ]
        
        // Safely handle optional interval values
        if let interval = settings.interval {
            status["interval"] = interval
        } else {
            status["interval"] = 1000 // Default value
        }
        
        if let intervalAnalysis = settings.intervalAnalysis {
            status["intervalAnalysis"] = intervalAnalysis
        } else {
            status["intervalAnalysis"] = 500 // Default value
        }
        
        // Add compression info if enabled
        if settings.enableCompressedOutput,
           let compressedURL = compressedFileURL,
           FileManager.default.fileExists(atPath: compressedURL.path) {
            do {
                let compressedAttributes = try FileManager.default.attributesOfItem(atPath: compressedURL.path)
                if let compressedSize = compressedAttributes[.size] as? Int64 {
                    Logger.debug("Compressed file status - Size: \(compressedSize)")
                    let compressionBundle: [String: Any] = [
                        "fileUri": compressedURL.absoluteString,
                        "mimeType": compressedFormat == "aac" ? "audio/aac" : "audio/opus",
                        "size": compressedSize,
                        "format": compressedFormat,
                        "bitrate": compressedBitRate
                    ]
                    status["compression"] = compressionBundle
                }
            } catch {
                Logger.debug("Error getting compressed file attributes: \(error)")
            }
        }
        
        return status
    }
    
    /// Detects if a phone call is active without using CallKit.
    /// We avoid CallKit because its usage prevents apps from being available in China's App Store.
    /// This is a workaround that uses AVAudioSession to detect phone calls instead.
    private func isPhoneCallActive() -> Bool {
        let audioSession = AVAudioSession.sharedInstance()
        return audioSession.isOtherAudioPlaying && 
               audioSession.secondaryAudioShouldBeSilencedHint && 
               audioSession.currentRoute.outputs.contains { $0.portType == .builtInReceiver }
    }

    /// Prepares the audio recording with the specified settings without starting it.
    /// This reduces latency when startRecording is called later.
    /// - Parameters:
    ///   - settings: The recording settings to use.
    /// - Returns: A boolean indicating if preparation was successful.
    func prepareRecording(settings: RecordingSettings) -> Bool {
        // Store settings first before doing anything else
        recordingSettings = settings
        
        // Skip if already prepared or recording
        guard !isPrepared && !isRecording else {
            Logger.debug("Already prepared or recording in progress.")
            return isPrepared
        }

        // Check for active call using the new method
        if isPhoneCallActive() {
            Logger.debug("Cannot prepare recording during an active phone call")
            delegate?.audioStreamManager(self, didFailWithError: "Cannot prepare recording during an active phone call")
            return false
        }

        // Reset audio session before preparing new recording
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(false, options: .notifyOthersOnDeactivation)
            Thread.sleep(forTimeInterval: 0.1) // Brief pause to ensure clean state
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            Logger.debug("Failed to reset audio session: \(error)")
            delegate?.audioStreamManager(self, didFailWithError: "Failed to reset audio session: \(error.localizedDescription)")
            return false
        }

        // Update auto-resume preference from settings
        autoResumeAfterInterruption = settings.autoResumeAfterInterruption
        
        emissionInterval = max(100.0, Double(settings.interval ?? 1000)) / 1000.0
        emissionIntervalAnalysis = max(100.0, Double(settings.intervalAnalysis ?? 500)) / 1000.0
        lastEmissionTime = nil // Will be set when recording starts
        lastEmissionTimeAnalysis = nil // Will be set when recording starts
        accumulatedData.removeAll()
        accumulatedAnalysisData.removeAll()
        totalDataSize = 0
        totalDataSizeAnalysis = 0
        totalPausedDuration = 0
        lastEmittedSize = 0
        lastEmittedCompressedSizeAnalysis = 0
        isPaused = false

        // Create recording file first
        recordingFileURL = createRecordingFile()
        if let url = recordingFileURL {
            do {
                // Ensure directory exists if needed (createRecordingFile should handle this, but belt-and-suspenders)
                try fileManager.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: nil)
                // Create the file if it doesn't exist (createRecordingFile should also handle this)
                if !fileManager.fileExists(atPath: url.path) {
                    fileManager.createFile(atPath: url.path, contents: nil, attributes: nil)
                }
                // Open the handle for writing
                self.fileHandle = try FileHandle(forWritingTo: url)
                // Write initial dummy header immediately
                let header = createWavHeader(dataSize: 0)
                self.fileHandle?.write(header)
                self.totalDataSize = Int64(WAV_HEADER_SIZE) // Initialize size with header size
                Logger.debug("File handle opened and initial header written for \(url.path). Initial size: \(self.totalDataSize)")
            } catch {
                Logger.debug("Error creating/opening file handle: \(error.localizedDescription)")
                // No need to call cleanupPreparation here, return false will handle it
                return false
            }
        } else {
            Logger.debug("Error: Failed to create recording file URL.")
            return false
        }
        
        var newSettings = settings
        
        // Then set up audio session and tap
        do {
            Logger.debug("Configuring audio session with sample rate: \(settings.sampleRate) Hz")
            
            let session = AVAudioSession.sharedInstance()
            if let currentRoute = session.currentRoute.outputs.first {
                Logger.debug("Current audio output: \(currentRoute.portType)")
                newSettings.sampleRate = settings.sampleRate  // Keep original sample rate
            }
            
            // Get base configuration from user settings or defaults
            var category: AVAudioSession.Category = .playAndRecord
            var mode: AVAudioSession.Mode = .default
            var options: AVAudioSession.CategoryOptions = [.allowBluetooth, .mixWithOthers]
            
            if let audioSessionConfig = settings.ios?.audioSession {
                category = audioSessionConfig.category
                mode = audioSessionConfig.mode
                options = audioSessionConfig.categoryOptions
            }
            
            // Append necessary options for background recording if keepAwake is enabled
            if settings.keepAwake {
                Logger.debug("keepAwake enabled - configuring for background recording")
                // Add background audio option
                options.insert(.mixWithOthers)
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } else {
                Logger.debug("keepAwake disabled - using standard session configuration")
                // If keepAwake is false, don't add background audio options
                try session.setActive(true)
            }
            
            // Apply the final configuration
            try session.setCategory(category, mode: mode, options: options)
            // NOTE: We intentionally DO NOT call session.setPreferredSampleRate().
            // Trying to force a sample rate different from the hardware's actual rate
            // often prevents the input node's tap from receiving any buffers.
            // Instead, we let the session negotiate the rate.
            // Resampling to the desired settings.sampleRate happens later in processAudioBuffer.
            try session.setPreferredIOBufferDuration(1024 / Double(settings.sampleRate)) // Use desired rate for buffer duration hint
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            // Log session config details as single lines for clarity
            Logger.debug("Audio session configured:")
            Logger.debug("  - category: \(category)")
            Logger.debug("  - mode: \(mode)")
            Logger.debug("  - options: \(options)")
            Logger.debug("  - keepAwake: \(settings.keepAwake)")
            Logger.debug("  - emission interval: \(emissionInterval * 1000)ms")
            Logger.debug("  - analysis interval: \(emissionIntervalAnalysis * 1000)ms")
            Logger.debug("  - requested sample rate: \(settings.sampleRate)Hz")
            Logger.debug("  - actual session sample rate: \(session.sampleRate)Hz") // Log actual rate
            Logger.debug("  - channels: \(settings.numberOfChannels)")
            Logger.debug("  - bit depth: \(settings.bitDepth)-bit")
            Logger.debug("  - compression enabled: \(settings.enableCompressedOutput)")

            // --- Revised Tap Format Logic ---
            // Get the input node's format primarily for channel count and data type.
            let nodeFormat = audioEngine.inputNode.outputFormat(forBus: 0)
            let actualSessionRate = session.sampleRate // Use the session's negotiated rate.

            Logger.debug("Node format suggests: \(describeAudioFormat(nodeFormat))")
            Logger.debug("Session reports actual rate: \(actualSessionRate) Hz")

            // Create the tap format using the ACTUAL session sample rate, but node's channel count/type.
            // This aims to match the hardware stream (like 16kHz HFP) more reliably.
            guard let tapFormat = AVAudioFormat(
                commonFormat: nodeFormat.commonFormat, // Keep node's format (e.g., Float32)
                sampleRate: actualSessionRate,         // Use ACTUAL session rate
                channels: nodeFormat.channelCount,     // Use node's channel count
                interleaved: nodeFormat.isInterleaved  // Use node's interleaving
            ) else {
                Logger.debug("Failed to create tap format with session rate \(actualSessionRate) and node details.")
                // Throw an error to prevent proceeding with invalid setup
                throw NSError(domain: "AudioStreamManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create tap format for installation."])
            }

            // Log tap config details as single lines
            Logger.debug("Final Tap Configuration (Using Session Rate):")
            Logger.debug("  - Tap Format: \(describeAudioFormat(tapFormat))")
            Logger.debug("  - Node Format Was: \(describeAudioFormat(nodeFormat))")
            Logger.debug("  - Requested Output Format: \(settings.bitDepth)-bit at \(settings.sampleRate)Hz")

            recordingSettings = newSettings  // Keep original settings with desired sample rate

            // Install tap with the format derived from session sample rate
            audioEngine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: tapFormat) { [weak self] (buffer, time) in // Use newly constructed tapFormat
                guard let self = self,
                      let fileURL = self.recordingFileURL,
                      self.isRecording else { // Only process buffer if actually recording
                    // Logger.debug("Tap received buffer but self, fileURL, or isRecording is invalid. Ignoring.")
                    return
                }
                // processAudioBuffer will handle resampling if tapFormat.sampleRate != settings.sampleRate
                self.processAudioBuffer(buffer, fileURL: fileURL)
                self.lastBufferTime = time
            }

            audioEngine.prepare() // Prepare the engine without starting it
            
            // Setup compressed recording if enabled
            if settings.enableCompressedOutput {
                // Create compressed settings
                let compressedSettings: [String: Any] = [
                    AVFormatIDKey: settings.compressedFormat == "aac" ? kAudioFormatMPEG4AAC : kAudioFormatOpus,
                    AVSampleRateKey: Float64(settings.sampleRate),
                    AVNumberOfChannelsKey: settings.numberOfChannels,
                    AVEncoderBitRateKey: settings.compressedBitRate,
                    AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
                    AVEncoderBitDepthHintKey: settings.bitDepth
                ]
                
                Logger.debug("Initializing compressed recording with settings: \(compressedSettings)")
                
                // Create file for compressed recording
                compressedFileURL = createRecordingFile(isCompressed: true)
                
                if let url = compressedFileURL {
                    Logger.debug("Using compressed file URL: \(url.path)")
                    
                    // Initialize recorder with proper error handling
                    do {
                        compressedRecorder = try AVAudioRecorder(url: url, settings: compressedSettings)
                        if let recorder = compressedRecorder {
                            recorder.delegate = self
                            
                            if !recorder.prepareToRecord() {
                                Logger.debug("Failed to prepare recorder")
                                compressedFileURL = nil
                                compressedRecorder = nil
                            } else {
                                // Note: We don't start the recorder yet, just prepare it
                                Logger.debug("Compressed recording prepared successfully")
                                compressedFormat = settings.compressedFormat
                                compressedBitRate = settings.compressedBitRate
                            }
                        }
                    } catch {
                        Logger.debug("Failed to initialize compressed recorder: \(error)")
                        compressedFileURL = nil
                        compressedRecorder = nil
                    }
                } else {
                    Logger.debug("Failed to create compressed recording file")
                }
            }
            
        } catch {
            Logger.debug("Error: Failed to set up audio session with preferred settings: \(error.localizedDescription)")
            return false
        }
        
        NotificationCenter.default.addObserver(self, selector: #selector(handleAudioSessionInterruption), name: AVAudioSession.interruptionNotification, object: nil)
        
        if settings.enableProcessing == true {
            // Initialize the AudioProcessor for buffer-based processing
            self.audioProcessor = AudioProcessor(resolve: { result in
                // Handle the result here if needed
            }, reject: { code, message in
                // Handle the rejection here if needed
            })
            Logger.debug("AudioProcessor activated successfully.")
        }
        
        // Prepare notifications if enabled but don't show yet
        if settings.showNotification {
            initializeNotifications()
        }
        
        // Mark preparation as complete
        isPrepared = true
        Logger.debug("Recording prepared successfully. Ready to start.")
        
        return true
    }

    /// Starts a new audio recording with the specified settings.
    /// - Parameters:
    ///   - settings: The recording settings to use.
    /// - Returns: A StartRecordingResult object if recording starts successfully, or nil otherwise.
    func startRecording(settings: RecordingSettings) -> StartRecordingResult? {
        // If already prepared, use the prepared state
        if isPrepared {
            Logger.debug("Using prepared recording state")
        } else {
            // If not prepared, prepare now
            Logger.debug("Not prepared, preparing recording first")
            if !prepareRecording(settings: settings) {
                Logger.debug("Failed to prepare recording")
                return nil
            }
        }
        
        // Check for active phone call again, in case one started after preparation
        if isPhoneCallActive() {
            Logger.debug("Cannot start recording during an active phone call")
            delegate?.audioStreamManager(self, didFailWithError: "Cannot start recording during an active phone call")
            cleanupPreparation()
            return nil
        }
        
        guard !isRecording else {
            Logger.debug("Recording already in progress")
            return nil
        }
        
        guard let settings = recordingSettings, 
              let fileUri = recordingFileURL?.absoluteString else {
            Logger.debug("Missing settings or file URI")
            return nil
        }
        
        do {
            enableWakeLock()
            
            // Set recording state *before* starting engine to avoid race condition
            startTime = Date()
            totalPausedDuration = 0
            currentPauseStart = nil
            lastEmissionTime = Date()
            lastEmissionTimeAnalysis = Date()
            isRecording = true
            isPaused = false
            
            // Start the audio engine
            try audioEngine.start()
            
            // Start the compressed recorder if prepared
            compressedRecorder?.record()
            
            // Show notifications if enabled
            if settings.showNotification {
                notificationManager?.startUpdates(startTime: startTime ?? Date())
                updateNowPlayingInfo(isPaused: false)
            }
            
            Logger.debug("Recording started successfully")
            
            var compression = compressedRecorder != nil ? CompressedRecordingInfo(
                compressedFileUri: compressedFileURL?.absoluteString ?? "",
                mimeType: compressedFormat == "aac" ? "audio/aac" : "audio/opus",
                bitrate: compressedBitRate,
                format: compressedFormat
            ) : nil

            // Get the size separately since it's not part of the initializer
            if let compressedPath = compressedFileURL?.path,
               let attributes = try? FileManager.default.attributesOfItem(atPath: compressedPath),
               let fileSize = attributes[.size] as? Int64 {
                compression?.size = fileSize
            }

            return StartRecordingResult(
                fileUri: fileUri,
                mimeType: mimeType,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate,
                compression: compression
            )
            
        } catch {
            Logger.debug("Error starting audio engine: \(error.localizedDescription)")
            isRecording = false
            cleanupPreparation()
            return nil
        }
    }

    /// Cleans up resources if preparation was done but recording didn't start.
    private func cleanupPreparation() {
        // Only run if prepared but not recording
        guard isPrepared && !isRecording else { return }
        
        Logger.debug("Cleaning up prepared resources that weren't used")
        
        // Remove input tap
        audioEngine.inputNode.removeTap(onBus: 0)
        
        // Stop compressed recorder if created but not started
        compressedRecorder?.stop()
        compressedRecorder = nil
        
        // Delete created files that weren't used
        if let fileURL = recordingFileURL, FileManager.default.fileExists(atPath: fileURL.path) {
            try? FileManager.default.removeItem(at: fileURL)
        }
        
        if let compressedURL = compressedFileURL, FileManager.default.fileExists(atPath: compressedURL.path) {
            try? FileManager.default.removeItem(at: compressedURL)
        }
        
        // Reset audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            Logger.debug("Error deactivating audio session: \(error)")
        }
        
        // Clear notification setup if it was initialized
        notificationManager?.stopUpdates()
        notificationManager = nil
        
        // --- Restore missing cleanup lines and remove log ---
        // Logger.debug("cleanupPreparation: Clearing recordingSettings. Current deviceId: \(recordingSettings?.deviceId ?? \"nil\")")
        recordingFileURL = nil // Restore
        compressedFileURL = nil // Restore
        audioProcessor = nil // Restore
        recordingSettings = nil
        isPrepared = false // Restore
        // --- End restored lines and removed log ---
        
        Logger.debug("Preparation cleanup completed")
    }

    /// Pauses the current audio recording.
    func pauseRecording() {
        guard isRecording, !isPaused else { return }
        
        Logger.debug("Pausing recording...")
        
        // Store when we paused
        currentPauseStart = Date()
        
        // Update state
        isPaused = true
        
        // Stop the engine but don't remove the tap
        audioEngine.pause()
        
        // Pause the compressed recorder if active
        compressedRecorder?.pause()
        
        // Update notification state if enabled
        if recordingSettings?.showNotification == true {
            updateNotificationState(isPaused: true)
        }
        
        // Store valid duration for notifications
        lastValidDuration = currentRecordingDuration()
        
        // Notify delegate
        delegate?.audioStreamManager(self, didPauseRecording: Date())
        
        Logger.debug("Recording paused")
    }
    
    /// Resumes a paused recording.
    func resumeRecording() {
        guard isRecording, isPaused else { return }
        
        Logger.debug("Resuming recording...")
        
        // Calculate and add the pause duration if we have a pause start time
        if let pauseStart = currentPauseStart {
            let pauseDuration = Date().timeIntervalSince(pauseStart)
            totalPausedDuration += pauseDuration
            currentPauseStart = nil // Reset pause start time
            Logger.debug("Added pause duration: \(pauseDuration), total paused: \(totalPausedDuration)")
        }
        
        do {
            // Try to restart the engine
            try audioEngine.start()
            
            // Resume the compressed recorder if active
            compressedRecorder?.record()
            
            // Update state
            isPaused = false
            
            // Update notification state if enabled
            if recordingSettings?.showNotification == true {
                updateNotificationState(isPaused: false)
            }
            
            // Clear the stored valid duration
            lastValidDuration = nil
            
            // Notify delegate
            delegate?.audioStreamManager(self, didResumeRecording: Date())
            
            Logger.debug("Recording resumed")
            
        } catch {
            Logger.debug("Failed to resume recording: \(error.localizedDescription)")
            delegate?.audioStreamManager(self, didFailWithError: "Failed to resume recording: \(error.localizedDescription)")
        }
    }
    
    /// Initializes the notification manager to show recording notifications.
    private func initializeNotifications() {
        guard let settings = recordingSettings else { return }
        
        // Create notification manager
        notificationManager = AudioNotificationManager()
        notificationManager?.initialize(with: settings.notification)
        
        // Add pause/resume handlers via notification observers
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePauseNotification),
            name: Notification.Name("PAUSE_RECORDING"),
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleResumeNotification),
            name: Notification.Name("RESUME_RECORDING"),
            object: nil
        )
        
        // Setup media controls (iOS control center) if enabled
        setupNowPlayingInfo()
        
        // Set up timer to update media info
        mediaInfoUpdateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.updateMediaInfo()
        }
    }
    
    /// Resample an audio buffer to a different sample rate.
    /// - Parameters:
    ///   - buffer: The source audio buffer.
    ///   - sourceRate: The source sample rate.
    ///   - targetRate: The target sample rate.
    /// - Returns: The resampled audio buffer or nil if resampling failed.
    private func resampleAudioBuffer(_ buffer: AVAudioPCMBuffer, from sourceRate: Double, to targetRate: Double) -> AVAudioPCMBuffer? {
        // If the rates are the same, no need to resample
        if sourceRate == targetRate {
            return buffer
        }
        
        // Create source and target formats
        guard let outputFormat = AVAudioFormat(
            commonFormat: buffer.format.commonFormat,
            sampleRate: targetRate,
            channels: buffer.format.channelCount,
            interleaved: buffer.format.isInterleaved
        ) else {
            Logger.debug("Failed to create output format for resampling")
            return nil
        }
        
        // Create a converter
        guard let converter = AVAudioConverter(from: buffer.format, to: outputFormat) else {
            Logger.debug("Failed to create audio converter")
            return nil
        }
        
        // Calculate new buffer size
        let ratio = targetRate / sourceRate
        let estimatedFrames = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
        
        // Create output buffer
        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: outputFormat,
            frameCapacity: estimatedFrames
        ) else {
            Logger.debug("Failed to create output buffer")
            return nil
        }
        
        // Perform conversion
        var error: NSError?
        converter.convert(to: outputBuffer, error: &error) { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }
        
        if let error = error {
            Logger.debug("Error resampling audio: \(error.localizedDescription)")
            return nil
        }
        
        return outputBuffer
    }

    /// Describes the format of the given audio format.
    /// - Parameter format: The AVAudioFormat object to describe.
    /// - Returns: A string description of the audio format.
    func describeAudioFormat(_ format: AVAudioFormat) -> String {
        let formatDescription = """
            - Sample rate: \(format.sampleRate)Hz
            - Channels: \(format.channelCount)
            - Interleaved: \(format.isInterleaved)
            - Common format: \(describeCommonFormat(format.commonFormat))
            """
        return formatDescription
    }
    
    func describeCommonFormat(_ format: AVAudioCommonFormat) -> String {
        switch format {
        case .pcmFormatFloat32:
            return "32-bit float"
        case .pcmFormatFloat64:
            return "64-bit float"
        case .pcmFormatInt16:
            return "16-bit int"
        case .pcmFormatInt32:
            return "32-bit int"
        default:
            return "Unknown format"
        }
    }
    
    /// Updates the WAV header with the correct file size.
    /// - Parameters:
    ///   - fileURL: The URL of the WAV file.
    ///   - totalDataSize: The total size of the audio data.
    private func updateWavHeader(fileURL: URL, totalDataSize: Int64) {
        // Prevent negative values - minimum WAV file size should be at least the header size (WAV_HEADER_SIZE bytes)
        guard totalDataSize >= 0 else {
            Logger.debug("Invalid file size: total data size is negative")
            return
        }

        do {
            let fileHandle = try FileHandle(forUpdating: fileURL)
            defer { fileHandle.closeFile() }

            // Calculate sizes
            let fileSize = totalDataSize + WAV_HEADER_SIZE - 8 // Total file size minus 8 bytes for 'RIFF' and size field itself
            let dataSize = totalDataSize // Size of the 'data' sub-chunk

            // Update RIFF chunk size at offset 4
            fileHandle.seek(toFileOffset: 4)
            let fileSizeBytes = UInt32(fileSize).littleEndianBytes
            fileHandle.write(Data(fileSizeBytes))

            // Update data chunk size at offset 40
            fileHandle.seek(toFileOffset: 40)
            let dataSizeBytes = UInt32(dataSize).littleEndianBytes
            fileHandle.write(Data(dataSizeBytes))

        } catch let error {
            Logger.debug("Error updating WAV header: \(error)")
        }
    }
    
    private func updateNotificationDuration() {
        guard let startTime = startTime,
              recordingSettings?.showNotification == true else { return }
        
        let currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(totalPausedDuration)
        
        // Update both notification manager and media player
        notificationManager?.updateDuration(currentDuration)
        
        if let notificationView = notificationView {
            var nowPlayingInfo = notificationView.nowPlayingInfo ?? [:]
            nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentDuration
            notificationView.nowPlayingInfo = nowPlayingInfo
        }
    }
    
    /// Processes the audio buffer: handles resampling/format conversion if necessary,
    /// writes the result to the WAV file on a background thread, and triggers
    /// analysis processing and event emission based on intervals.
    /// - Parameters:
    ///   - buffer: The audio buffer received from the input node tap.
    ///   - fileURL: The URL of the file to write the data to (ignored, uses self.fileHandle).
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, fileURL: URL) {
        guard let settings = recordingSettings else {
            Logger.debug("processAudioBuffer: Recording settings not available")
            return
        }

        // targetSampleRate and targetFormat remain the user's requested final format
        let targetSampleRate = Double(settings.sampleRate)
        let targetFormat: AVAudioCommonFormat = settings.bitDepth == 32 ? .pcmFormatFloat32 : .pcmFormatInt16

        // Buffer to be processed - initially the input buffer
        var bufferToProcess: AVAudioPCMBuffer = buffer

        // 1. Resample if the buffer's sample rate doesn't match the target
        if buffer.format.sampleRate != targetSampleRate {
            if let resampled = resampleAudioBuffer(buffer, from: buffer.format.sampleRate, to: targetSampleRate) {
                bufferToProcess = resampled
            } else {
                Logger.debug("processAudioBuffer: Resampling FAILED")
                return
            }
        }

        // 2. Convert format if the (potentially resampled) buffer's format doesn't match the target
        if bufferToProcess.format.commonFormat != targetFormat {
            guard let targetAVFormat = AVAudioFormat(
                commonFormat: targetFormat,
                sampleRate: targetSampleRate, // Use target rate for final format
                channels: AVAudioChannelCount(settings.numberOfChannels),
                interleaved: bufferToProcess.format.isInterleaved // Match interleaving of current buffer
            ) else {
                Logger.debug("processAudioBuffer: Failed to create target AVAudioFormat for conversion.")
                return
            }
            if let converted = convertBufferFormat(bufferToProcess, to: targetAVFormat) {
                bufferToProcess = converted
            } else {
                Logger.debug("processAudioBuffer: Format conversion FAILED")
                return
            }
        }

        // Now bufferToProcess contains the audio data in the desired sample rate and format
        let audioData = bufferToProcess.audioBufferList.pointee.mBuffers
        guard let bufferData = audioData.mData else {
            Logger.debug("Buffer data is nil after processing.")
            return
        }

        // Create an immutable copy for background/event emission
        let dataToWrite = Data(bytes: bufferData, count: Int(audioData.mDataByteSize))

        // --- Background File Writing ---
        // Use the persistent fileHandle opened during preparation.
        DispatchQueue.global(qos: .utility).async { [weak self] in
            guard let self = self, let handle = self.fileHandle else {
                Logger.debug("BG Write Error: File handle is nil.")
                return
            }
            do {
                try handle.seekToEnd()
                try handle.write(contentsOf: dataToWrite)
                // Update total size state
                self.totalDataSize += Int64(dataToWrite.count)
            } catch {
                 Logger.debug("BG Write Error: Failed to seek/write: \(error.localizedDescription)")
            }
        }

        // --- Event Emission & Analysis ---
        accumulatedData.append(dataToWrite)
        accumulatedAnalysisData.append(dataToWrite)

        if recordingSettings?.showNotification == true {
            updateNotificationDuration()
        }

        let currentTime = Date()
        let currentTotalSize = self.totalDataSize // Use the most up-to-date size for events

        // Emit AudioData event
        if let lastEmission = self.lastEmissionTime,
           currentTime.timeIntervalSince(lastEmission) >= emissionInterval,
           !accumulatedData.isEmpty {
            let dataToEmit = accumulatedData
            let recordingTime = currentRecordingDuration()
            self.lastEmissionTime = currentTime
            self.lastEmittedSize = currentTotalSize
            accumulatedData.removeAll()
            var compressionInfo: [String: Any]? = nil
            // TODO: Get actual compressed file size if needed for this event
            delegate?.audioStreamManager(
                self,
                didReceiveAudioData: dataToEmit,
                recordingTime: recordingTime,
                totalDataSize: currentTotalSize,
                compressionInfo: compressionInfo
            )
            // Logger.debug("Emitted didReceiveAudioData event.") // Optional: Re-enable if needed
        }

        // Dispatch analysis task
        if let lastEmissionAnalysis = self.lastEmissionTimeAnalysis,
           currentTime.timeIntervalSince(lastEmissionAnalysis) >= emissionIntervalAnalysis,
           settings.enableProcessing,
           let processor = self.audioProcessor,
           !accumulatedAnalysisData.isEmpty {
            let dataToAnalyze = accumulatedAnalysisData
            self.lastEmissionTimeAnalysis = currentTime
            accumulatedAnalysisData.removeAll()

            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                guard let self = self, let processor = self.audioProcessor, let settings = self.recordingSettings else {
                    // Logger.debug("Analysis Dispatch SKIP: self, processor, or settings nil")
                    return
                }
                guard !dataToAnalyze.isEmpty else {
                    // Logger.debug("Analysis Dispatch SKIP: dataToAnalyze is empty")
                    return
                }

                // Logger.debug("Analysis Dispatch: Processing \(dataToAnalyze.count) bytes...")
                let processingResult = processor.processAudioBuffer(
                    data: dataToAnalyze,
                    sampleRate: Float(settings.sampleRate),
                    segmentDurationMs: settings.segmentDurationMs,
                    featureOptions: settings.featureOptions ?? [:],
                    bitDepth: settings.bitDepth,
                    numberOfChannels: settings.numberOfChannels
                )

                // Dispatch result back to main thread
                DispatchQueue.main.async {
                    if let result = processingResult {
                         // Logger.debug("Analysis Dispatch: Success, calling delegate.")
                        self.delegate?.audioStreamManager(self, didReceiveProcessingResult: result)
                    } else {
                         Logger.debug("Analysis Dispatch FAIL: processor.processAudioBuffer returned nil")
                    }
                }
            }
            // Logger.debug("Dispatched analysis task.") // Optional: Re-enable if needed
        }
    }

    // Add helper function to calculate average amplitude
    private func calculateAverageAmplitude(_ data: UnsafePointer<Float>, count: Int) -> Float {
        var sum: Float = 0
        vDSP_meanv(data, 1, &sum, vDSP_Length(count))
        return sum
    }

    // Add helper function to calculate RMS
    private func calculateRMS(_ data: UnsafePointer<Float>, count: Int) -> Float {
        var sum: Float = 0
        var squaredSum: Float = 0
        for i in 0..<count {
            let value = data[i]
            sum += value
            squaredSum += value * value
        }
        let average = sum / Float(count)
        let variance = squaredSum / Float(count) - average * average
        return sqrt(variance)
    }

    // Helper function for format conversion
    private func convertBufferFormat(_ buffer: AVAudioPCMBuffer, to targetFormat: AVAudioFormat) -> AVAudioPCMBuffer? {
        guard let converter = AVAudioConverter(from: buffer.format, to: targetFormat),
              let outputBuffer = AVAudioPCMBuffer(
                pcmFormat: targetFormat,
                frameCapacity: buffer.frameLength
        ) else {
            return nil
        }
        
        outputBuffer.frameLength = buffer.frameLength
        var error: NSError?
        
        converter.convert(to: outputBuffer, error: &error) { inNumPackets, outStatus in
            outStatus.pointee = AVAudioConverterInputStatus.haveData
            return buffer
        }
        
        if let error = error {
            Logger.debug("Format conversion failed: \(error.localizedDescription)")
            return nil
        }
        
        return outputBuffer
    }

    /// Attempts to update the audio session with the preferred input device from current settings.
    /// Called externally when the device selection changes.
    /// Note: Avoids changing sample rate or buffer duration while engine might be running.
    public func updateAudioSessionWithCurrentSettings() {
        guard let settings = self.recordingSettings, let deviceId = settings.deviceId else {
            Logger.debug("Cannot update audio session preference, settings or deviceId missing")
            return
        }
        
        let session = AVAudioSession.sharedInstance()
        
        // Find the requested device port
        let selectedPort = session.availableInputs?.first { port in
            // Normalize IDs for comparison, especially for Bluetooth
            let portNormalizedId = deviceManager.normalizeBluetoothDeviceId(port.uid)
            let requestedNormalizedId = deviceManager.normalizeBluetoothDeviceId(deviceId)
            return portNormalizedId == requestedNormalizedId
        }
        
        if let portToSet = selectedPort {
            do {
                try session.setPreferredInput(portToSet)
                Logger.debug("Attempted to set preferred input to: \(portToSet.portName) (ID: \(portToSet.uid))")
                 // We add a small delay hoping the system applies the change before potential next operations
                Thread.sleep(forTimeInterval: 0.1)
            } catch {
                Logger.debug("Failed to set preferred input device \(portToSet.portName): \(error.localizedDescription)")
            }
        } else {
            Logger.debug("Could not find device with ID \(deviceId) to set as preferred input.")
        }
    }

    /// Stops the current audio recording.
    /// - Returns: A RecordingResult object if the recording stopped successfully, or nil otherwise.
    func stopRecording() -> RecordingResult? {
        guard isRecording || isPrepared else { return nil }
        
        Logger.debug("Stopping recording...")
        
        disableWakeLock()
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        // Stop compressed recording if active
        compressedRecorder?.stop()
        
        // Get the final duration before changing state
        let finalDuration = currentRecordingDuration()
        
        let wasRecording = isRecording
        isRecording = false
        isPaused = false
        isPrepared = false // Reset preparation state
        
        // If we were only prepared but never started recording, clean up and return nil
        if !wasRecording {
            cleanupPreparation()
            return nil
        }
        
        if recordingSettings?.showNotification == true {
            // Stop and clean up timer
            mediaInfoUpdateTimer?.invalidate()
            mediaInfoUpdateTimer = nil
            
            // Clean up notification manager
            notificationManager?.stopUpdates()
            notificationManager = nil
            
            // Clean up media controls
            DispatchQueue.main.async {
                UIApplication.shared.endReceivingRemoteControlEvents()
                self.remoteCommandCenter?.pauseCommand.isEnabled = false
                self.remoteCommandCenter?.playCommand.isEnabled = false
                self.notificationView?.nowPlayingInfo = nil
            }
        }
        
        // Reset audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            Logger.debug("Error deactivating audio session: \(error)")
        }

        // Reset audio engine
        audioEngine.reset()
        
        guard let fileURL = recordingFileURL,
              let settings = recordingSettings else {
            Logger.debug("Recording or file URL is nil.")
            return nil
        }
        
        // Validate WAV file
        let wavPath = fileURL.path
        do {
            // Check if WAV file exists
            let wavFileAttributes = try FileManager.default.attributesOfItem(atPath: wavPath)
            let wavFileSize = wavFileAttributes[FileAttributeKey.size] as? Int64 ?? 0
            
            Logger.debug("""
                WAV File validation:
                - Path: \(wavPath)
                - Exists: true
                - Size: \(wavFileSize) bytes
                - Duration: \(finalDuration) seconds
                - Expected minimum size: \(WAV_HEADER_SIZE) bytes (WAV header)
                """)
            
            // Use the final totalDataSize tracked by the background queue
            let finalDataChunkSize = self.totalDataSize - Int64(WAV_HEADER_SIZE)
            if finalDataChunkSize <= 0 {
                Logger.debug("Recording file data chunk size is zero or negative (\(finalDataChunkSize) bytes), likely no audio data was recorded successfully after header")
                // Optionally delete the empty file?
                // try? FileManager.default.removeItem(at: fileURL)
                return nil
            }

            // Update the WAV header with the correct final file size
            updateWavHeader(fileURL: fileURL, totalDataSize: finalDataChunkSize)
            Logger.debug("Final WAV header updated. Data chunk size: \(finalDataChunkSize)")
            
            // Validate compressed file if enabled
            var compression: CompressedRecordingInfo?
            if let compressedURL = compressedFileURL {
                let compressedPath = compressedURL.path
                if FileManager.default.fileExists(atPath: compressedPath) {
                    let compressedAttributes = try FileManager.default.attributesOfItem(atPath: compressedPath)
                    let compressedSize = compressedAttributes[FileAttributeKey.size] as? Int64 ?? 0
                    
                    Logger.debug("""
                        Compressed File validation:
                        - Path: \(compressedPath)
                        - Format: \(compressedFormat)
                        - Size: \(compressedSize) bytes
                        - Bitrate: \(compressedBitRate) bps
                        """)
                    
                    if compressedSize > 0 {
                        compression = CompressedRecordingInfo(
                            compressedFileUri: compressedURL.absoluteString,
                            mimeType: compressedFormat == "aac" ? "audio/aac" : "audio/opus",
                            bitrate: compressedBitRate,
                            format: compressedFormat,
                            size: compressedSize
                        )
                    } else {
                        Logger.debug("Warning: Compressed file exists but is empty")
                    }
                } else {
                    Logger.debug("Warning: Compressed file not found at path: \(compressedPath)")
                }
            }
            
            let durationMs = Int64(finalDuration * 1000)
            
            let result = RecordingResult(
                fileUri: fileURL.absoluteString,
                filename: fileURL.lastPathComponent,
                mimeType: mimeType,
                duration: durationMs,
                size: wavFileSize,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate,
                compression: compression
            )
            
            Logger.debug("""
                Recording completed successfully:
                - WAV file: \(fileURL.lastPathComponent)
                - Size: \(wavFileSize) bytes
                - Duration: \(durationMs)ms
                - Sample rate: \(settings.sampleRate)Hz
                - Bit depth: \(settings.bitDepth)-bit
                - Channels: \(settings.numberOfChannels)
                - Compressed: \(compression != nil ? "yes" : "no")
                """)
            
            // Additional cleanup
            recordingFileURL = nil
            lastBufferTime = nil
            lastValidDuration = nil
            compressedRecorder = nil
            compressedFileURL = nil
            recordingSettings = nil
            startTime = nil
            totalPausedDuration = 0
            currentPauseStart = nil
            lastEmissionTime = nil
            lastEmissionTimeAnalysis = nil
            lastEmittedSize = 0
            lastEmittedSizeAnalysis = 0
            lastEmittedCompressedSize = 0
            accumulatedData.removeAll()
            accumulatedAnalysisData.removeAll()
            recordingUUID = nil
            
            return result
            
        } catch {
            Logger.debug("Failed to validate recording files: \(error)")
            return nil
        }
    }

    // MARK: - AudioDeviceManagerDelegate Implementation

    func audioDeviceManager(_ manager: AudioDeviceManager, didDetectDisconnectionOfDevice disconnectedDeviceId: String) {
        // This method will be called by AudioDeviceManager when a disconnection occurs
        // Run on main thread to safely interact with AVAudioEngine and state
        DispatchQueue.main.async {
            self.handleDeviceDisconnection(disconnectedDeviceId: disconnectedDeviceId)
        }
    }

    // MARK: - Device Disconnection Handling

    // Define interruption reasons matching ExpoAudioStream.types.ts
    enum RecordingInterruptionReason: String {
        case deviceDisconnected = "deviceDisconnected"
        case deviceFallback = "deviceFallback"
        case deviceSwitchFailed = "deviceSwitchFailed"
        // Add other reasons if needed (e.g., from handleAudioSessionInterruption)
        case audioFocusLoss = "audioFocusLoss"
        case audioFocusGain = "audioFocusGain"
        case phoneCall = "phoneCall"
        case phoneCallEnded = "phoneCallEnded"
        case recordingStopped = "recordingStopped"
        case deviceConnected = "deviceConnected"
    }

    private func handleDeviceDisconnection(disconnectedDeviceId: String) {
        Logger.debug("handleDeviceDisconnection entered. isRecording: \(isRecording), settingsExist: \(recordingSettings != nil), deviceIdExists: \(recordingSettings?.deviceId != nil), currentDeviceId: \(recordingSettings?.deviceId ?? "nil")")

        // --- Modify Guard: Only require settings object, handle nil deviceId later ---
        guard let settings = recordingSettings else {
             // If settings are nil, we truly can't determine behavior, so pause.
             Logger.debug("Device disconnected (\(disconnectedDeviceId)), but recordingSettings object is missing. Pausing.")
             performPauseAction(reason: .deviceDisconnected)
             return
        }
        // We now have settings, proceed even if deviceId might be nil inside it.
        let currentRecordingDeviceId = settings.deviceId // This might be nil, handle below
        // --- End Modify Guard ---

        // Normalize BOTH IDs for reliable comparison
        // Use "nil" if currentRecordingDeviceId is actually nil
        let normalizedCurrentId = deviceManager.normalizeBluetoothDeviceId(currentRecordingDeviceId ?? "nil") 
        let normalizedDisconnectedId = deviceManager.normalizeBluetoothDeviceId(disconnectedDeviceId)

        Logger.debug("Handling disconnection. Current device: \(normalizedCurrentId), Disconnected device: \(normalizedDisconnectedId)")

        // Check if the disconnected device is the one we *thought* we were recording from
        if normalizedCurrentId == normalizedDisconnectedId || currentRecordingDeviceId == nil {
            // If the IDs match OR if the stored deviceId was nil (meaning we lost track),
            // assume this disconnection applies to our current recording session.
            
            Logger.debug("Disconnection event matches current recording session (or session deviceId was lost). Applying behavior...")

            // Get the string value from settings using the correct property name
            // The property in RecordingSettings likely matches the TS interface: deviceDisconnectionBehavior
            let behaviorString = settings.deviceDisconnectionBehavior ?? "pause" // Use the correct property name
            let behavior = DeviceDisconnectionBehavior(rawValue: behaviorString) ?? .PAUSE // Convert to enum, default to .PAUSE

            Logger.debug("Recording device disconnected! Applying behavior: \(behavior.rawValue)")

            delegate?.audioStreamManager(self, didReceiveInterruption: [
                "reason": RecordingInterruptionReason.deviceDisconnected.rawValue,
                "isPaused": isPaused
            ])

            // Switch on the *enum* value
            switch behavior {
            case .PAUSE:
                performPauseAction(reason: .deviceDisconnected)

            case .FALLBACK:
                 Task { 
                    await performFallbackAction()
                 }
            }
        } else {
             Logger.debug("A different device disconnected (\(normalizedDisconnectedId)). Current recording device (\(normalizedCurrentId)) is still active. Ignoring.")
        }
    }

    private func performPauseAction(reason: RecordingInterruptionReason) {
        if !isPaused { // Only pause if not already paused
            Logger.debug("Pausing recording due to \(reason.rawValue)")
            pauseRecording() // Use existing pause function
        } else {
            Logger.debug("Recording was already paused when \(reason.rawValue) occurred.")
        }
        // Note: pauseRecording already notifies the delegate about the pause state change.
        // Send an additional interruption notification specifically for the reason
         delegate?.audioStreamManager(self, didReceiveInterruption: [
             "reason": reason.rawValue,
             "isPaused": true // Since we are pausing or were already paused
         ])
    }

    private func performFallbackAction() async {
        Logger.debug("Attempting to fallback to default device...")

        do {
            // 1. Get the new default device (using the async version)
            guard let defaultDevice = await deviceManager.getDefaultInputDevice() else {
                 Logger.debug("Fallback failed: Could not get default input device. Pausing.")
                 performPauseAction(reason: .deviceSwitchFailed) // Fallback to pause if no default
                 return
            }
            Logger.debug("Found default device for fallback: \(defaultDevice.name) (ID: \(defaultDevice.id))")

            // 2. Stop engine temporarily & Remove existing tap
            let wasManuallyPaused = isPaused
            if audioEngine.isRunning {
                audioEngine.pause()
            }
            audioEngine.inputNode.removeTap(onBus: 0)
            Logger.debug("Fallback: Paused engine and removed existing tap.")

            // 3. Update settings and select the new device in the session
            recordingSettings?.deviceId = defaultDevice.id // Update setting
            let selectionSuccess = await deviceManager.selectDevice(defaultDevice.id)
            if !selectionSuccess {
                Logger.debug("Fallback failed: Could not select default device in session. Pausing.")
                performPauseAction(reason: .deviceSwitchFailed)
                return
            }
            Logger.debug("Successfully selected default device \(defaultDevice.id) in session.")

            // --- Reinstall Tap --- 
            // 4. Get the tap format for the *new* device
            let session = AVAudioSession.sharedInstance()
            let nodeFormat = audioEngine.inputNode.outputFormat(forBus: 0)
            let actualSessionRate = session.sampleRate
            Logger.debug("Fallback: New device node format: \(describeAudioFormat(nodeFormat))")
            Logger.debug("Fallback: New device session rate: \(actualSessionRate) Hz")
            
            guard let newTapFormat = AVAudioFormat(
                commonFormat: nodeFormat.commonFormat,
                sampleRate: actualSessionRate,
                channels: nodeFormat.channelCount,
                interleaved: nodeFormat.isInterleaved
            ) else {
                Logger.debug("Fallback failed: Could not create tap format for new device.")
                performPauseAction(reason: .deviceSwitchFailed)
                return
            }
            Logger.debug("Fallback: Determined new tap format: \(describeAudioFormat(newTapFormat))")

            // 5. Install the new tap
            audioEngine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: newTapFormat) { [weak self] (buffer, time) in
                guard let self = self, self.isRecording else { return }
                self.processAudioBuffer(buffer, fileURL: self.recordingFileURL!)
                self.lastBufferTime = time
            }
            Logger.debug("Fallback: Re-installed tap with new format.")
            
            // 6. Prepare and Restart engine if it wasn't manually paused before
            audioEngine.prepare()
            Logger.debug("Fallback: Prepared audio engine.")

            if !wasManuallyPaused {
                 // Only start if it's not running (it should have been paused earlier)
                 if !audioEngine.isRunning {
                     do {
                         try audioEngine.start()
                         Logger.debug("Audio engine restarted for fallback.")
                     } catch {
                         Logger.debug("Fallback failed: Could not restart audio engine after tap reinstall. Pausing. Error: \(error)")
                         performPauseAction(reason: .deviceSwitchFailed)
                         return
                     }
                 } else {
                    Logger.debug("Audio engine was already running during fallback attempt? Unexpected state.")
                 }
             } else {
                 Logger.debug("Recording was manually paused, leaving engine paused after fallback.")
             }

            // 7. Notify JS about successful fallback
            delegate?.audioStreamManager(self, didReceiveInterruption: [
                "reason": RecordingInterruptionReason.deviceFallback.rawValue,
                "newDeviceId": defaultDevice.id, // Include new device ID
                "isPaused": isPaused // Report current state
            ])
            Logger.debug("Fallback to device \(defaultDevice.id) successful.")

        } catch {
             Logger.debug("Fallback failed with error: \(error). Pausing.")
             performPauseAction(reason: .deviceSwitchFailed)
        }
    }

}

extension AudioStreamManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        switch response.actionIdentifier {
        case "PAUSE_RECORDING":
            pauseRecording()
        case "RESUME_RECORDING":
            resumeRecording()
        default:
            break
        }
        completionHandler()
    }

    // This is needed to show notifications when app is in foreground
    func userNotificationCenter(
            _ center: UNUserNotificationCenter,
            willPresent notification: UNNotification,
            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
        ) {
            if #available(iOS 14.0, *) {
                completionHandler([.banner, .sound])
            } else {
                // For iOS 13 and earlier
                completionHandler([.alert, .sound])
            }
        }
}

// Add AVAudioRecorderDelegate conformance
extension AudioStreamManager: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        Logger.debug("Compressed recording finished - success: \(flag)")
        if !flag {
            delegate?.audioStreamManager(self, didFailWithError: "Compressed recording failed to complete")
        }
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        if let error = error {
            Logger.debug("Compressed recording encode error: \(error)")
            delegate?.audioStreamManager(self, didFailWithError: "Compressed recording encode error: \(error.localizedDescription)")
        }
    }
}
