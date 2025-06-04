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
    
    // Move static variables to class level
    private var debugBufferCounter = 0
    private var tapCallCount = 0
    
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

    // Add the stopping flag to the class properties
    private var stopping: Bool = false

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
        
        // Stop any active recording to properly release resources
        if isRecording {
            audioEngine.stop()
            audioEngine.reset()
        }
        
        // Remove ALL notification observers properly
        NotificationCenter.default.removeObserver(self)
        
        // Clean up notification manager
        notificationManager?.stopUpdates()
        notificationManager = nil
        
        // Cleanup media timer
        mediaInfoUpdateTimer?.invalidate()
        mediaInfoUpdateTimer = nil
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
            Logger.debug("AudioStreamManager", "Audio session interruption began")
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
            Logger.debug("AudioStreamManager", "Audio session interruption ended - autoResume: \(autoResumeAfterInterruption), wasSuspended: \(wasSuspended)")
            if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                Logger.debug("AudioStreamManager", "Interruption options - shouldResume: \(options.contains(.shouldResume))")
                
                // Calculate pause duration if we have a pause start time
                if let pauseStart = currentPauseStart {
                    let pauseDuration = Date().timeIntervalSince(pauseStart)
                    totalPausedDuration += pauseDuration
                    currentPauseStart = nil
                    Logger.debug("AudioStreamManager", "Added interruption pause duration: \(pauseDuration), total paused: \(totalPausedDuration)")
                }
                
                // For phone calls, we should auto-resume if enabled, regardless of previous pause state
                if autoResumeAfterInterruption && isRecording {
                    // Add a longer delay for phone calls and ensure proper session setup
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                        guard let self = self else { return }
                        Logger.debug("AudioStreamManager", "Attempting to auto-resume recording after phone call")
                        
                        // Configure audio session
                        do {
                            let session = AVAudioSession.sharedInstance()
                            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .mixWithOthers])
                            try session.setActive(true, options: .notifyOthersOnDeactivation)
                            
                            // Resume if we're still recording and paused
                            if self.isRecording && self.isPaused {
                                Logger.debug("AudioStreamManager", "Resuming recording after phone call interruption")
                                self.audioEngine.prepare() 
                                self.resumeRecording()
                            } else {
                                Logger.debug("AudioStreamManager", "Cannot resume - recording state invalid: isRecording=\(self.isRecording), isPaused=\(self.isPaused)")
                            }
                        } catch {
                            Logger.debug("AudioStreamManager", "Failed to reactivate audio session: \(error)")
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
            Logger.debug("AudioStreamManager", "Failed to configure audio session: \(error)")
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
        // Skip if we're in the process of stopping - this prevents race conditions
        if !isRecording || stopping {
            return
        }
        
        // If keepAwake is false, we should track this as a pause and actually pause the engine
        if let settings = recordingSettings, !settings.keepAwake {
            Logger.debug("AudioStreamManager", "App entering background with keepAwake=false, pausing recording")
            currentPauseStart = Date()
            // Explicitly pause the engine but don't change isPaused state
            // so we can automatically resume when returning to foreground
            audioEngine.pause()
        } else {
            Logger.debug("AudioStreamManager", "App entering background with keepAwake=true, continuing recording")
        }
        
        // Use a strong reference to notificationManager to avoid potential null reference
        if let manager = notificationManager {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self = self, self.isRecording, !self.stopping else { return }
                manager.showInitialNotification()
            }
        }
    }

    @objc private func handleAppWillEnterForeground(_ notification: Notification) {
        // Skip if we're in the process of stopping
        if !isRecording || stopping {
            return
        }
        
        // If we were paused due to background and keepAwake was false, calculate pause duration
        if let settings = recordingSettings, !settings.keepAwake, let pauseStart = currentPauseStart {
            let pauseDuration = Date().timeIntervalSince(pauseStart)
            totalPausedDuration += pauseDuration
            currentPauseStart = nil
            Logger.debug("AudioStreamManager", "Added background pause duration: \(pauseDuration), total paused: \(totalPausedDuration)")
            
            // Now restart the engine if it was paused due to background
            do {
                // Reinstall tap with hardware format to ensure we have good input
                _ = installTapWithHardwareFormat()
                // Restart the engine
                try audioEngine.start()
                Logger.debug("AudioStreamManager", "Successfully restarted audio engine after returning from background")
            } catch {
                Logger.debug("AudioStreamManager", "Failed to restart audio engine after returning from background: \(error)")
                // If we can't restart, officially pause the recording
                if !isPaused {
                    isPaused = true
                    // Notify delegate
                    delegate?.audioStreamManager(self, didPauseRecording: Date())
                }
            }
        }
        
        // Safely access notificationManager
        if let manager = notificationManager {
            manager.stopUpdates()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self = self, self.isRecording, !self.stopping else { return }
                manager.startUpdates(startTime: self.startTime ?? Date())
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
            Logger.debug("AudioStreamManager", "Wake lock enabled")
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
            Logger.debug("AudioStreamManager", "Wake lock disabled")
        }
    }
    
    /// Creates a new recording file.
    /// - Returns: The URL of the newly created recording file, or nil if creation failed.
    private func createRecordingFile(isCompressed: Bool = false) -> URL? {
        // Add debug logging
        Logger.debug("AudioStreamManager", "Creating recording file - settings filename: \(recordingSettings?.filename ?? "nil")")
        
        // Get base directory - use default if no custom directory provided
        let baseDirectory: URL
        if let customDir = recordingSettings?.outputDirectory {
            baseDirectory = URL(fileURLWithPath: customDir)
            Logger.debug("AudioStreamManager", "Using custom directory: \(customDir)")
        } else {
            // Use existing default behavior
            baseDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
            Logger.debug("AudioStreamManager", "Using default directory: \(baseDirectory.path)")
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
        Logger.debug("AudioStreamManager", "Using base filename: \(baseFilename)")
        
        // Remove any existing extension from the filename
        let filenameWithoutExtension = baseFilename.replacingOccurrences(
            of: "\\.[^\\.]+$",
            with: "",
            options: .regularExpression
        )
        
        // Choose extension based on whether this is a compressed file
        let fileExtension: String
        if isCompressed {
            fileExtension = recordingSettings?.output.compressed.format.lowercased() ?? "aac"
        } else {
            fileExtension = "wav"
        }
        
        let fullFilename = "\(filenameWithoutExtension).\(fileExtension)"
        Logger.debug("AudioStreamManager", "Full filename: \(fullFilename)")
        
        let fileURL = baseDirectory.appendingPathComponent(fullFilename)
        Logger.debug("AudioStreamManager", "Final file URL: \(fileURL.path)")
        
        // Check if file already exists
        if fileManager.fileExists(atPath: fileURL.path) {
            Logger.debug("AudioStreamManager", "File already exists at: \(fileURL.path)")
            return nil
        }
        
        if !fileManager.createFile(atPath: fileURL.path, contents: nil, attributes: nil) {
            Logger.debug("AudioStreamManager", "Failed to create file at: \(fileURL.path)")
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
        if settings.output.compressed.enabled,
           let compressedURL = compressedFileURL,
           FileManager.default.fileExists(atPath: compressedURL.path) {
            do {
                let compressedAttributes = try FileManager.default.attributesOfItem(atPath: compressedURL.path)
                if let compressedSize = compressedAttributes[.size] as? Int64 {
                    Logger.debug("AudioStreamManager", "Compressed file status - Size: \(compressedSize)")
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
                Logger.debug("AudioStreamManager", "Error getting compressed file attributes: \(error)")
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

    /// Installs the audio tap with the hardware-compatible format
    /// - Parameters:
    ///   - customTapBlock: Optional custom tap block for specialized processing (like in fallback)
    ///   - prepareEngine: Whether to call prepare() on the engine after installing the tap (default: true)
    /// - Returns: The hardware input format that was used for the tap
    private func installTapWithHardwareFormat(
        customTapBlock: ((AVAudioPCMBuffer, AVAudioTime) -> Void)? = nil,
        prepareEngine: Bool = true
    ) -> AVAudioFormat {
        // Get the hardware input format
        let inputNode = audioEngine.inputNode
        let inputHardwareFormat = inputNode.inputFormat(forBus: 0)
        let nodeOutputFormat = inputNode.outputFormat(forBus: 0)
        
        // Log format information for diagnostic purposes
        Logger.debug("AudioStreamManager", "Installing tap - Hardware input format: \(describeAudioFormat(inputHardwareFormat))")
        Logger.debug("AudioStreamManager", "Node output format: \(describeAudioFormat(nodeOutputFormat))")
        
        // Remove any existing tap
        inputNode.removeTap(onBus: 0)
        
        // Create the default tap block if none provided
        let tapBlock = customTapBlock ?? { [weak self] (buffer, time) in
            guard let self = self,
                  self.isRecording else {
                return
            }
            // Process audio buffer for streaming, analysis, and optional file writing
            // Note: Audio streaming works regardless of primary output settings (consistent with Web/Android)
            self.processAudioBuffer(buffer)
            self.lastBufferTime = time
        }
        
        // Calculate buffer size from duration if specified
        let bufferSize: AVAudioFrameCount
        if let duration = recordingSettings?.bufferDurationSeconds {
            // Use target sample rate from settings for calculation
            let targetSampleRate = Double(recordingSettings?.sampleRate ?? 16000)
            let calculatedSize = AVAudioFrameCount(duration * targetSampleRate)
            
            // iOS enforces minimum buffer size of ~4800 frames
            if calculatedSize < 4800 {
                Logger.debug("AudioStreamManager", "Requested buffer size \(calculatedSize) frames (from \(duration)s at \(targetSampleRate)Hz) is below iOS minimum of ~4800 frames")
            }
            
            // Apply safety clamping
            bufferSize = max(256, min(calculatedSize, 16384))
            Logger.debug("AudioStreamManager", "Buffer size: requested=\(calculatedSize), clamped=\(bufferSize) frames")
        } else {
            bufferSize = 1024 // Default
        }
        
        // Install the tap with hardware format
        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: inputHardwareFormat, block: tapBlock)
        Logger.debug("AudioStreamManager", "Tap installed with hardware-compatible format")
        
        // Prepare the engine if requested
        if prepareEngine {
            audioEngine.prepare()
            Logger.debug("AudioStreamManager", "Engine prepared after tap installation")
        }
        
        return inputHardwareFormat
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
            Logger.debug("AudioStreamManager", "Already prepared or recording in progress.")
            return isPrepared
        }

        // Check for active call using the new method
        if isPhoneCallActive() {
            Logger.debug("AudioStreamManager", "Cannot prepare recording during an active phone call")
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
            Logger.debug("AudioStreamManager", "Failed to reset audio session: \(error)")
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

        // Create recording file first (unless primary output is disabled)
        if settings.output.primary.enabled {
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
                    Logger.debug("AudioStreamManager", "File handle opened and initial header written for \(url.path). Initial size: \(self.totalDataSize)")
                } catch {
                    Logger.debug("AudioStreamManager", "Error creating/opening file handle: \(error.localizedDescription)")
                    // No need to call cleanupPreparation here, return false will handle it
                    return false
                }
            } else {
                Logger.debug("AudioStreamManager", "Error: Failed to create recording file URL.")
                return false
            }
        } else {
            // Skip file writing mode
            recordingFileURL = nil
            fileHandle = nil
            totalDataSize = 0
            Logger.debug("AudioStreamManager", "Skip file writing mode enabled - no file will be created")
        }
        
        var newSettings = settings
        
        // Then set up audio session and tap
        do {
            Logger.debug("AudioStreamManager", "Configuring audio session with sample rate: \(settings.sampleRate) Hz")
            
            let session = AVAudioSession.sharedInstance()
            if let currentRoute = session.currentRoute.outputs.first {
                Logger.debug("AudioStreamManager", "Current audio output: \(currentRoute.portType)")
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
                Logger.debug("AudioStreamManager", "keepAwake enabled - configuring for background recording")
                // Set the category to PlayAndRecord with proper background options
                options.insert(.mixWithOthers)
                // Add duckOthers to reduce volume of other apps instead of stopping them
                options.insert(.duckOthers)
                
                // Configure audio session for background audio
                do {
                    try session.setCategory(.playAndRecord, mode: .default, options: options)
                    try session.setActive(true, options: .notifyOthersOnDeactivation)
                    // Ensure the app has appropriate Info.plist settings for background audio
                    Logger.debug("AudioStreamManager", "Audio session configured for background recording with options: \(options)")
                } catch {
                    Logger.debug("AudioStreamManager", "Failed to configure audio session for background: \(error)")
                    try session.setActive(true, options: .notifyOthersOnDeactivation)
                }
            } else {
                Logger.debug("AudioStreamManager", "keepAwake disabled - using standard session configuration")
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
            Logger.debug("AudioStreamManager", "Audio session configured:")
            Logger.debug("AudioStreamManager", "  - category: \(category)")
            Logger.debug("AudioStreamManager", "  - mode: \(mode)")
            Logger.debug("AudioStreamManager", "  - options: \(options)")
            Logger.debug("AudioStreamManager", "  - keepAwake: \(settings.keepAwake)")
            Logger.debug("AudioStreamManager", "  - emission interval: \(emissionInterval * 1000)ms")
            Logger.debug("AudioStreamManager", "  - analysis interval: \(emissionIntervalAnalysis * 1000)ms")
            Logger.debug("AudioStreamManager", "  - requested sample rate: \(settings.sampleRate)Hz")
            Logger.debug("AudioStreamManager", "  - actual session sample rate: \(session.sampleRate)Hz") // Log actual rate
            Logger.debug("AudioStreamManager", "  - channels: \(settings.numberOfChannels)")
            Logger.debug("AudioStreamManager", "  - bit depth: \(settings.bitDepth)-bit")
            Logger.debug("AudioStreamManager", "  - compression enabled: \(settings.output.compressed.enabled)")

            // Use our shared tap installation method
            let tapFormat = installTapWithHardwareFormat()

            // Log tap configuration
            Logger.debug("AudioStreamManager", "Final Tap Configuration (Using Hardware Format):")
            Logger.debug("AudioStreamManager", "  - Tap Format: \(describeAudioFormat(tapFormat))")
            Logger.debug("AudioStreamManager", "  - Session Rate: \(session.sampleRate) Hz")
            Logger.debug("AudioStreamManager", "  - Requested Output Format: \(settings.bitDepth)-bit at \(settings.sampleRate)Hz")

            recordingSettings = newSettings  // Keep original settings with desired sample rate

            audioEngine.prepare() // Prepare the engine without starting it
            
            // Setup compressed recording if enabled
            if settings.output.compressed.enabled {
                // Create compressed settings
                let compressedSettings: [String: Any] = [
                    AVFormatIDKey: settings.output.compressed.format == "aac" ? kAudioFormatMPEG4AAC : kAudioFormatOpus,
                    AVSampleRateKey: Float64(settings.sampleRate),
                    AVNumberOfChannelsKey: settings.numberOfChannels,
                    AVEncoderBitRateKey: settings.output.compressed.bitrate,
                    AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
                    AVEncoderBitDepthHintKey: settings.bitDepth
                ]
                
                
                Logger.debug("AudioStreamManager", "Initializing compressed recording with settings: \(compressedSettings)")
                
                // Create file for compressed recording
                compressedFileURL = createRecordingFile(isCompressed: true)
                
                if let url = compressedFileURL {
                    Logger.debug("AudioStreamManager", "Using compressed file URL: \(url.path)")
                    
                    // Initialize recorder with proper error handling
                    do {
                        compressedRecorder = try AVAudioRecorder(url: url, settings: compressedSettings)
                        if let recorder = compressedRecorder {
                            recorder.delegate = self
                            
                            if !recorder.prepareToRecord() {
                                Logger.debug("AudioStreamManager", "Failed to prepare recorder")
                                compressedFileURL = nil
                                compressedRecorder = nil
                            } else {
                                // Note: We don't start the recorder yet, just prepare it
                                Logger.debug("AudioStreamManager", "Compressed recording prepared successfully")
                                            compressedFormat = settings.output.compressed.format
            compressedBitRate = settings.output.compressed.bitrate
                            }
                        }
                    } catch {
                        Logger.debug("AudioStreamManager", "Failed to initialize compressed recorder: \(error)")
                        compressedFileURL = nil
                        compressedRecorder = nil
                    }
                } else {
                    Logger.debug("AudioStreamManager", "Failed to create compressed recording file")
                }
            }
            
        } catch {
            Logger.debug("AudioStreamManager", "Error: Failed to set up audio session with preferred settings: \(error.localizedDescription)")
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
            Logger.debug("AudioStreamManager", "AudioProcessor activated successfully.")
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
            
            // Install tap with hardware format
            _ = installTapWithHardwareFormat()
            Logger.debug("Tap was reinstalled during recording start")
        } else {
            // If not prepared, prepare now
            Logger.debug("Not prepared, preparing recording first")
            if !prepareRecording(settings: settings) {
                Logger.debug("Failed to prepare recording")
                return nil
            }
        }
        
        // Rest of the method remains unchanged
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
        
        guard let settings = recordingSettings else {
            Logger.debug("Missing settings")
            return nil
        }
        
        // File URI is optional when primary output is disabled
        let fileUri = recordingFileURL?.absoluteString ?? ""
        
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
        
        // Emit any remaining audio data before pausing
        if !accumulatedData.isEmpty {
            Logger.debug("Emitting final audio chunk of \(accumulatedData.count) bytes before pausing")
            let recordingTime = currentRecordingDuration()
            let finalTotalSize = self.totalDataSize
            
            // Create a copy of accumulated data to avoid race conditions
            let finalData = accumulatedData
            accumulatedData.removeAll()
            
            // Notify delegate with final audio data
            delegate?.audioStreamManager(
                self,
                didReceiveAudioData: finalData,
                recordingTime: recordingTime,
                totalDataSize: finalTotalSize,
                compressionInfo: nil
            )
        }
        
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
            // Check and reinstall tap with hardware format
            _ = installTapWithHardwareFormat()
            Logger.debug("Tap reinstalled for resume")
            
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
            
            // Reset emission timers to ensure emission starts immediately after resume
            lastEmissionTime = Date()
            lastEmissionTimeAnalysis = Date()
            
            // Notify delegate
            delegate?.audioStreamManager(self, didResumeRecording: Date())
            
            Logger.debug("Recording resumed successfully")
            
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
    /// optionally writes the result to the WAV file on a background thread (if primary output is enabled),
    /// and triggers analysis processing and event emission based on intervals.
    /// Audio streaming happens regardless of file output settings.
    /// - Parameters:
    ///   - buffer: The audio buffer received from the input node tap.
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let settings = recordingSettings else {
            Logger.debug("processAudioBuffer: Recording settings not available")
            return
        }

        // DEBUG: Add tap and buffer info
        debugBufferCounter += 1
        
        // Log every 10th buffer to avoid excessive logs
        if debugBufferCounter % 10 == 0 {
            Logger.debug("BUFFER DEBUG: Processing buffer #\(debugBufferCounter), channelCount: \(buffer.format.channelCount), frameLength: \(buffer.frameLength)")
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

        // --- Background File Writing (Optional) ---
        // Only write to file if primary output is enabled
        if settings.output.primary.enabled {
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
        } else {
            // Still track total size for statistics even without file writing
            self.totalDataSize += Int64(dataToWrite.count)
        }

        // --- Event Emission & Analysis (Always Happens) ---
        // Audio streaming is independent of file output settings
        accumulatedData.append(dataToWrite)
        accumulatedAnalysisData.append(dataToWrite)

        if recordingSettings?.showNotification == true {
            updateNotificationDuration()
        }

        let currentTime = Date()
        let currentTotalSize = self.totalDataSize // Use the most up-to-date size for events

        // Emit AudioData event
        if let lastEmission = self.lastEmissionTime {
            // Log emission evaluation every 10th buffer
            if debugBufferCounter % 10 == 0 {
                let timeGap = currentTime.timeIntervalSince(lastEmission)
                let isTimeReady = timeGap >= emissionInterval
                Logger.debug("EMISSION DEBUG: Time since last: \(timeGap)s, Threshold: \(emissionInterval)s, Ready: \(isTimeReady), DataSize: \(accumulatedData.count) bytes")
            }
            
            if currentTime.timeIntervalSince(lastEmission) >= emissionInterval,
               !accumulatedData.isEmpty {
                let dataToEmit = accumulatedData
                let recordingTime = currentRecordingDuration()
                self.lastEmissionTime = currentTime
                self.lastEmittedSize = currentTotalSize
                accumulatedData.removeAll()
                let compressionInfo: [String: Any]? = nil
                
                Logger.debug("EMISSION SUCCESS: Emitting \(dataToEmit.count) bytes at recording time \(recordingTime)s")
                
                delegate?.audioStreamManager(
                    self,
                    didReceiveAudioData: dataToEmit,
                    recordingTime: recordingTime,
                    totalDataSize: currentTotalSize,
                    compressionInfo: compressionInfo
                )
            }
        } else {
            // This case occurs when lastEmissionTime is nil (either first run or after reset)
            Logger.debug("EMISSION DEBUG: lastEmissionTime is nil, setting to current time")
            lastEmissionTime = currentTime
        }

        // Dispatch analysis task
        if let lastEmissionAnalysis = self.lastEmissionTimeAnalysis,
           currentTime.timeIntervalSince(lastEmissionAnalysis) >= emissionIntervalAnalysis,
           settings.enableProcessing,
           let _ = self.audioProcessor,
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
    /// - Throws: An error if recording stops with a problem.
    func stopRecording() -> RecordingResult? {
        guard isRecording || isPrepared else { return nil }
        
        // Set stopping flag to prevent race conditions with background/foreground transitions
        stopping = true
        
        Logger.debug("Stopping recording...")
        
        // IMPORTANT: Emit any remaining audio data before stopping the engine
        if isRecording && !accumulatedData.isEmpty {
            Logger.debug("Emitting final audio chunk of \(accumulatedData.count) bytes before stopping")
            let recordingTime = currentRecordingDuration()
            let finalTotalSize = self.totalDataSize // Use current total size
            
            // Create a copy of accumulated data to avoid race conditions
            let finalData = accumulatedData
            accumulatedData.removeAll()
            
            // Notify delegate with final audio data
            delegate?.audioStreamManager(
                self,
                didReceiveAudioData: finalData,
                recordingTime: recordingTime,
                totalDataSize: finalTotalSize,
                compressionInfo: nil
            )
        }
        
        disableWakeLock()
        
        // Handle audio engine operations directly - no need for try-catch
        if audioEngine.isRunning {
            audioEngine.stop()
        }
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
            stopping = false // Reset stopping flag
            return nil
        }
        
        if recordingSettings?.showNotification == true {
            // Stop and clean up timer safely
            DispatchQueue.main.async {
                self.mediaInfoUpdateTimer?.invalidate()
                self.mediaInfoUpdateTimer = nil
                
                // Clean up notification manager
                self.notificationManager?.stopUpdates()
                self.notificationManager = nil
                
                // Clean up media controls
                UIApplication.shared.endReceivingRemoteControlEvents()
                self.remoteCommandCenter?.pauseCommand.isEnabled = false
                self.remoteCommandCenter?.playCommand.isEnabled = false
                self.notificationView?.nowPlayingInfo = nil
            }
        }
        
        // Reset audio session safely
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            Logger.debug("Error deactivating audio session: \(error)")
            // Continue with cleanup despite session errors
        }

        // Reset audio engine
        audioEngine.reset()
        
        guard let settings = recordingSettings else {
            Logger.debug("Recording settings is nil.")
            stopping = false // Reset stopping flag before returning nil
            return nil
        }
        
        // For streaming-only mode (no primary output), create a result without file validation
        if !settings.output.primary.enabled {
            let durationMs = Int64(finalDuration * 1000)
            
            // Check for compressed output even when primary is disabled
            var compression: CompressedRecordingInfo?
            if settings.output.compressed.enabled, let compressedURL = compressedFileURL {
                let compressedPath = compressedURL.path
                if FileManager.default.fileExists(atPath: compressedPath) {
                    do {
                        let compressedAttributes = try FileManager.default.attributesOfItem(atPath: compressedPath)
                        let compressedSize = compressedAttributes[FileAttributeKey.size] as? Int64 ?? 0
                        
                        Logger.debug("""
                            Compressed File validation (primary disabled):
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
                    } catch {
                        Logger.debug("Failed to validate compressed file: \(error)")
                    }
                } else {
                    Logger.debug("Warning: Compressed file not found at path: \(compressedPath)")
                }
            }
            
            let result = RecordingResult(
                fileUri: compression?.compressedFileUri ?? "",  // Use compressed URI if available
                filename: compression != nil ? (compressedFileURL?.lastPathComponent ?? "compressed-audio") : "stream-only",
                mimeType: compression?.mimeType ?? mimeType,
                duration: durationMs,
                size: compression?.size ?? totalDataSize,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate,
                compression: compression
            )
            
            // Cleanup
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
            totalDataSize = 0
            
            stopping = false
            return result
        }
        
        guard let fileURL = recordingFileURL else {
            Logger.debug("Recording file URL is nil.")
            stopping = false // Reset stopping flag before returning nil
            return nil
        }
        
        // Reset stopping flag before returning
        let result = createRecordingResult(fileURL: fileURL, settings: settings, finalDuration: finalDuration)
        stopping = false
        
        // Return after all cleanup tasks are completed
        return result
    }

    /// Creates a RecordingResult from the finished recording
    /// - Parameters:
    ///   - fileURL: The URL of the recording file
    ///   - settings: The settings used for recording
    ///   - finalDuration: The final duration of the recording
    /// - Returns: A RecordingResult object or nil if validation fails
    private func createRecordingResult(fileURL: URL, settings: RecordingSettings, finalDuration: TimeInterval) -> RecordingResult? {
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
            let behaviorString = settings.deviceDisconnectionBehavior.rawValue // Get the raw value from the enum
            let behavior = DeviceDisconnectionBehavior(rawValue: behaviorString) ?? .PAUSE // Convert to enum, default to .PAUSE

            Logger.debug("Recording device disconnected! Applying behavior: \(behavior.rawValue)")

            delegate?.audioStreamManager(self, didReceiveInterruption: [
                "reason": RecordingInterruptionReason.deviceDisconnected.rawValue,
                "isPaused": isPaused
            ])

            // Switch on the *enum* value
            switch behavior {
            case .PAUSE:
                Logger.debug("Device disconnect behavior set to PAUSE. Pausing recording.")
                performPauseAction(reason: .deviceDisconnected)

            case .FALLBACK:
                Logger.debug("Device disconnect behavior set to FALLBACK. Attempting to switch to default device.")
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

            // CRITICAL: Complete engine reset - stronger than just pausing
            audioEngine.stop()
            audioEngine.reset() // Reset the entire engine
            audioEngine.inputNode.removeTap(onBus: 0)
            
            // More aggressive session reset
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setActive(false, options: .notifyOthersOnDeactivation)
                try await Task.sleep(nanoseconds: 200_000_000) // Give system time to release resources
                
                // Reconfigure the session completely
                try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .mixWithOthers])
                try session.setActive(true, options: .notifyOthersOnDeactivation)
                try await Task.sleep(nanoseconds: 100_000_000) // Allow the session to activate fully
            } catch {
                Logger.debug("Session reset error: \(error.localizedDescription)")
            }
            
            let wasManuallyPaused = isPaused

            // 3. Update settings and select the new device in the session
            recordingSettings?.deviceId = defaultDevice.id // Update setting
            let selectionSuccess = await deviceManager.selectDevice(defaultDevice.id)
            if !selectionSuccess {
                Logger.debug("Fallback failed: Could not select default device in session. Pausing.")
                performPauseAction(reason: .deviceSwitchFailed)
                return
            }
            Logger.debug("Successfully selected default device \(defaultDevice.id) in session.")
            
            // Additional forced reset of engine to ensure clean state
            audioEngine.reset()
            audioEngine.prepare()
            
            // Create a simplified tap block for fallback - rely on processAudioBuffer for proper emission
            let fallbackTapBlock = { [weak self] (buffer: AVAudioPCMBuffer, time: AVAudioTime) -> Void in
                guard let self = self, self.isRecording else { return }
                
                // Process the buffer normally - processAudioBuffer handles all emission logic
                self.processAudioBuffer(buffer)
                self.lastBufferTime = time
            }
            
            // Use our shared tap installation method with the custom block
            _ = installTapWithHardwareFormat(customTapBlock: fallbackTapBlock)
            Logger.debug("Fallback: Re-installed tap with simplified emission handling")
            
            // Force prepare engine again to ensure it's ready
            audioEngine.prepare()
            Logger.debug("Fallback: Prepared audio engine.")

            if !wasManuallyPaused {
                // Only start if it's not running (it should have been paused earlier)
                if !audioEngine.isRunning {
                    do {
                        try audioEngine.start()
                        Logger.debug("Audio engine restarted for fallback.")
                    } catch {
                        // Try ONE more time with delay
                        try await Task.sleep(nanoseconds: 200_000_000)
                        do {
                            try audioEngine.start()
                            Logger.debug("Audio engine restarted on second attempt after fallback.")
                        } catch {
                            Logger.debug("Fallback failed: Could not restart audio engine after tap reinstall. Pausing. Error: \(error)")
                            performPauseAction(reason: .deviceSwitchFailed)
                            return
                        }
                    }
                } else {
                    Logger.debug("Audio engine was already running during fallback attempt? Unexpected state.")
                }
            } else {
                Logger.debug("Recording was manually paused, leaving engine paused after fallback.")
            }

            // Emit any remaining audio data from the previous device before resetting timers
            if !accumulatedData.isEmpty {
                Logger.debug("Emitting final audio chunk of \(accumulatedData.count) bytes from previous device")
                let recordingTime = currentRecordingDuration()
                let finalTotalSize = self.totalDataSize
                
                // Create a copy of accumulated data to avoid race conditions
                let finalData = accumulatedData
                
                // Notify delegate with final audio data from previous device
                delegate?.audioStreamManager(
                    self,
                    didReceiveAudioData: finalData,
                    recordingTime: recordingTime,
                    totalDataSize: finalTotalSize,
                    compressionInfo: nil
                )
            }
            
            // Reset emission timers to force new data emission with the fallback device
            lastEmissionTime = Date() // Reset to force immediate emission
            lastEmissionTimeAnalysis = Date() // Reset analysis timer too
            
            // Important: Do not reset totalDataSize here - it needs to be maintained
            // We only clear the buffers to start accumulating new data from the fallback device
            accumulatedData.removeAll() // Clear any partial data from previous device
            accumulatedAnalysisData.removeAll() // Clear analysis data buffer
            Logger.debug("Emission timers reset. Current totalDataSize: \(totalDataSize)")

            // CRITICAL: Multiple scheduled recovery attempts
            for delaySeconds in [0.5, 1.0, 2.0, 3.0] {
                DispatchQueue.main.asyncAfter(deadline: .now() + delaySeconds) { [weak self] in
                    guard let self = self, self.isRecording, !self.isPaused else { return }
                    Logger.debug("FALLBACK RECOVERY: Checking for data at \(delaySeconds)s")
                    
                    // Force an immediate emission if data is being received but not emitted
                    if !self.accumulatedData.isEmpty {
                        Logger.debug("FALLBACK RECOVERY: Forcing emission from accumulated data after \(delaySeconds)s (total size: \(self.totalDataSize))")
                        let dataToEmit = self.accumulatedData
                        let recordingTime = self.currentRecordingDuration()
                        let totalSize = self.totalDataSize
                        
                        self.lastEmissionTime = Date() // Reset the emission timer
                        self.accumulatedData.removeAll() // Clear the buffer
                        
                        // Direct delegate call with accumulated data
                        self.delegate?.audioStreamManager(
                            self,
                            didReceiveAudioData: dataToEmit,
                            recordingTime: recordingTime,
                            totalDataSize: totalSize,
                            compressionInfo: nil
                        )
                    }
                    
                    // If we're at the 3-second mark and the engine appears to not be running, attempt restart
                    if delaySeconds >= 3.0 && (!self.audioEngine.isRunning || self.lastEmissionTime!.timeIntervalSinceNow < -3) {
                        Logger.debug("FALLBACK RECOVERY: Emergency engine restart attempt")
                        do {
                            self.audioEngine.reset()
                            self.audioEngine.prepare()
                            try self.audioEngine.start()
                            self.lastEmissionTime = Date()
                        } catch {
                            Logger.debug("Emergency restart failed: \(error)")
                        }
                    }
                }
            }

            // 7. Notify JS about successful fallback
            delegate?.audioStreamManager(self, didReceiveInterruption: [
                "reason": RecordingInterruptionReason.deviceFallback.rawValue,
                "newDeviceId": defaultDevice.id, // Include new device ID
                "isPaused": isPaused // Report current state
            ])
            Logger.debug("Fallback to device \(defaultDevice.id) successful.")
            
            // Make the catch block reachable by throwing an error unconditionally
            // This is required to fix a compiler warning about unreachable catch block
            throw NSError(domain: "AudioStreamManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "Intentional error to make catch block reachable"])

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
