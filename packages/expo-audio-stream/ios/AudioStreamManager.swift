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

class AudioStreamManager: NSObject {
    private let audioEngine = AVAudioEngine()
    private var inputNode: AVAudioInputNode {
        return audioEngine.inputNode
    }
    internal var recordingFileURL: URL?
    private var audioProcessor: AudioProcessor?
    private var startTime: Date?
    private var pauseStartTime: Date?
    
    // Wake lock related properties
    private var wasIdleTimerDisabled: Bool = false  // Track previous idle timer state
    private var isWakeLockEnabled: Bool = false     // Track current wake lock state

    internal var lastEmissionTime: Date?
    internal var lastEmittedSize: Int64 = 0
    private var emissionInterval: TimeInterval = 1.0 // Default to 1 second
    private var totalDataSize: Int64 = 0
    private var isRecording = false
    private var isPaused = false
    private var pausedDuration = 0
    private var fileManager = FileManager.default
    internal var recordingSettings: RecordingSettings?
    internal var recordingUUID: UUID?
    internal var mimeType: String = "audio/wav"
    private var lastBufferTime: AVAudioTime?
    private var accumulatedData = Data()
    private var recentData = [Float]() // This property stores the recent audio data
    private var notificationUpdateTimer: Timer?
    
    private var notificationManager: AudioNotificationManager?
    private var notificationView: MPNowPlayingInfoCenter?
    private var audioSession: AVAudioSession?
    private var notificationObserver: Any?
    private var mediaInfoUpdateTimer: Timer?
    private var remoteCommandCenter: MPRemoteCommandCenter?

    weak var delegate: AudioStreamManagerDelegate?  // Define the delegate here
        
    /// Initializes the AudioStreamManager
    override init() {
        super.init()
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
    
    /// Handles audio session interruptions.
    /// - Parameter notification: The notification object containing interruption information.
    @objc func handleAudioSessionInterruption(notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        Logger.debug("audio session interruption \(type)")
        if type == .began {
            disableWakeLock()  // Disable wake lock when audio is interrupted
        } else if type == .ended {
            if let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) {
                    // Resume your audio recording
                    Logger.debug("Resume audio recording \(recordingUUID!)")
                    try? AVAudioSession.sharedInstance().setActive(true)
                    enableWakeLock()  // Re-enable wake lock when audio resumes
                }
            }
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
    
    private func currentRecordingDuration() -> TimeInterval {
        guard let startTime = startTime else { return 0 }
        return Date().timeIntervalSince(startTime) - TimeInterval(pausedDuration)
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
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                self?.notificationManager?.showInitialNotification()
            }
        }
    }

    @objc private func handleAppWillEnterForeground(_ notification: Notification) {
        if isRecording {
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
            currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(pausedDuration)
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
        
        let currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(pausedDuration)
        
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
    private func createRecordingFile() -> URL? {
        let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        recordingUUID = UUID()
        let fileName = "\(recordingUUID!.uuidString).wav"
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        
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
        //        let currentTime = Date()
        //        let totalRecordedTime = startTime != nil ? Int(currentTime.timeIntervalSince(startTime!)) - pausedDuration : 0
        guard let settings = recordingSettings else {
            print("Recording settings are not available.")
            return [:]
        }
        
        let sampleRate = Double(settings.sampleRate)
        let channels = Double(settings.numberOfChannels)
        let bitDepth = Double(settings.bitDepth)
        
        // Calculate the duration in seconds
        let durationInSeconds = Double(totalDataSize) / (sampleRate * channels * (bitDepth / 8))
        let durationInMilliseconds = Int(durationInSeconds * 1000) - Int(pausedDuration * 1000)

        return [
            "durationMs": durationInMilliseconds,
            "isRecording": isRecording,
            "isPaused": isPaused,
            "mimeType": mimeType,
            "size": totalDataSize,
            "interval": emissionInterval
        ]
        
    }
    
    /// Starts a new audio recording with the specified settings and interval.
    /// - Parameters:
    ///   - settings: The recording settings to use.
    ///   - intervalMilliseconds: The interval in milliseconds for emitting audio data.
    /// - Returns: A StartRecordingResult object if recording starts successfully, or nil otherwise.
    func startRecording(settings: RecordingSettings, intervalMilliseconds: Int) -> StartRecordingResult? {
        guard !isRecording else {
            Logger.debug("Debug: Recording is already in progress.")
            return nil
        }
        
        guard !audioEngine.isRunning else {
            Logger.debug("Debug: Audio engine already running.")
            return nil
        }
        
        var newSettings = settings  // Make settings mutable
        let session = AVAudioSession.sharedInstance()
        
        // Determine the commonFormat based on bitDepth
        let commonFormat: AVAudioCommonFormat
        switch newSettings.bitDepth {
            case 16:
                commonFormat = .pcmFormatInt16
            case 32:
                commonFormat = .pcmFormatInt32
            default:
                Logger.debug("Unsupported bit depth. Defaulting to 16-bit PCM")
                commonFormat = .pcmFormatInt16
                newSettings.bitDepth = 16
        }
        
        emissionInterval = max(100.0, Double(intervalMilliseconds)) / 1000.0
        lastEmissionTime = Date()
        accumulatedData.removeAll()
        totalDataSize = 0
        pausedDuration = 0
        lastEmittedSize = 0
        isPaused = false
        
        do {
            Logger.debug("Debug: Configuring audio session with sample rate: \(settings.sampleRate) Hz")
            
            // Check if the input node supports the desired format
            let inputNode = audioEngine.inputNode
            let hardwareFormat = inputNode.inputFormat(forBus: 0)
            if hardwareFormat.sampleRate != newSettings.sampleRate {
                Logger.debug("Debug: Preferred sample rate not supported. Falling back to hardware sample rate \(session.sampleRate).")
                newSettings.sampleRate = session.sampleRate
            }
            
            // Configure audio session based on iOS settings if provided
            if let audioSessionConfig = settings.ios?.audioSession {
                try session.setCategory(audioSessionConfig.category, options: audioSessionConfig.categoryOptions)
                try session.setMode(audioSessionConfig.mode)
                Logger.debug("""
                        Audio Session Configuration (Custom):
                        - Category: \(audioSessionConfig.category)
                        - Mode: \(audioSessionConfig.mode)
                        - Options: \(audioSessionConfig.categoryOptions)
                        """)
            } else {
                let defaultCategory = AVAudioSession.Category.playAndRecord
                let defaultMode = AVAudioSession.Mode.default
                let defaultOptions: AVAudioSession.CategoryOptions = [
                    .allowBluetooth,
                    .defaultToSpeaker,
                    .mixWithOthers,
                    .allowBluetoothA2DP,
                    .allowAirPlay
                ]
                
                try session.setCategory(defaultCategory, mode: defaultMode, options: defaultOptions)
                Logger.debug("""
                    Audio Session Configuration (Default):
                    - Category: \(defaultCategory)
                    - Mode: \(defaultMode)
                    - Options: \(defaultOptions)
                    """)
            }
            
            try session.setPreferredSampleRate(settings.sampleRate)
            try session.setPreferredIOBufferDuration(1024 / settings.sampleRate)
            try session.setActive(true)
            Logger.debug("Debug: Audio session activated successfully.")

            
            let actualSampleRate = session.sampleRate
            if actualSampleRate != newSettings.sampleRate {
                Logger.debug("Debug: Preferred sample rate not set. Falling back to hardware sample rate: \(actualSampleRate) Hz")
                newSettings.sampleRate = actualSampleRate
            }
            
            recordingSettings = newSettings  // Update the class property with the new settings
            enableWakeLock() // Will only enable if keepAwake is true
        } catch {
            Logger.debug("Error: Failed to set up audio session with preferred settings: \(error.localizedDescription)")
            return nil
        }
        
        NotificationCenter.default.addObserver(self, selector: #selector(handleAudioSessionInterruption), name: AVAudioSession.interruptionNotification, object: nil)
        
        // Correct the format to use 16-bit integer (PCM)
        guard let audioFormat = AVAudioFormat(commonFormat: commonFormat, sampleRate: newSettings.sampleRate, channels: UInt32(newSettings.numberOfChannels), interleaved: true) else {
            Logger.debug("Error: Failed to create audio format with the specified bit depth.")
            return nil
        }
        
        if newSettings.enableProcessing == true {
            // Initialize the AudioProcessor for buffer-based processing
            self.audioProcessor = AudioProcessor(resolve: { result in
                // Handle the result here if needed
            }, reject: { code, message in
                // Handle the rejection here if needed
            })
            Logger.debug("AudioProcessor activated successfully.")
        }
        
        audioEngine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: audioFormat) { [weak self] (buffer, time) in
            guard let self = self, let fileURL = self.recordingFileURL else {
                Logger.debug("Error: File URL or self is nil during buffer processing.")
                return
            }
            let formatDescription = describeAudioFormat(buffer.format)
            Logger.debug("Debug: Buffer format - \(formatDescription)")
            
            // Processing the current buffer
            self.processAudioBuffer(buffer, fileURL: self.recordingFileURL!)
            self.lastBufferTime = time
        }
        
        recordingFileURL = createRecordingFile()
        if recordingFileURL == nil {
            Logger.debug("Error: Failed to create recording file.")
            return nil
        }
        
        if settings.showNotification {
            initializeNotifications()
        }
        
        do {
            startTime = Date()
            try audioEngine.start()
            isRecording = true
            isPaused = false
            Logger.debug("Debug: Recording started successfully.")
            return StartRecordingResult(
                fileUri: recordingFileURL!.path,
                mimeType: mimeType,
                channels: newSettings.numberOfChannels,
                bitDepth: newSettings.bitDepth,
                sampleRate: newSettings.sampleRate
            )
        } catch {
            Logger.debug("Error: Could not start the audio engine: \(error.localizedDescription)")
            isRecording = false
            return nil
        }
    }
    
    /// Pauses the current audio recording.
    func pauseRecording() {
        guard isRecording && !isPaused else { return }
        
        disableWakeLock()
        audioEngine.pause()
        isPaused = true
        pauseStartTime = Date()
        
        updateNowPlayingInfo(isPaused: true)
        notificationManager?.updateState(isPaused: true)
        delegate?.audioStreamManager(self, didPauseRecording: Date())
        delegate?.audioStreamManager(self, didUpdateNotificationState: true)
        
        Logger.debug("Recording paused.")
    }
    
    private func initializeNotifications() {
        guard recordingSettings?.showNotification == true else { return }
        
        // Setup notification manager if not already initialized
        if notificationManager == nil {
            UNUserNotificationCenter.current().delegate = self
            
            notificationManager = AudioNotificationManager()
            
            // Request permissions first
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                if granted {
                    DispatchQueue.main.async {
                        self.notificationManager?.initialize(with: self.recordingSettings?.notification)
                        self.setupNowPlayingInfo()
                        
                        // Start media info update timer
                        self.mediaInfoUpdateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                           self?.updateMediaInfo()
                        }
                        
                        // Setup notification observers
                        NotificationCenter.default.addObserver(
                            self,
                            selector: #selector(self.handlePauseNotification),
                            name: .pauseRecording,
                            object: nil
                        )
                        
                        NotificationCenter.default.addObserver(
                            self,
                            selector: #selector(self.handleResumeNotification),
                            name: .resumeRecording,
                            object: nil
                        )
                        
                        // Start updates if recording is already in progress
                        if let startTime = self.startTime {
                            self.notificationManager?.startUpdates(startTime: startTime)
                        }
                    }
                } else if let error = error {
                    Logger.debug("Failed to get notification permission: \(error.localizedDescription)")
                }
            }
        }
    }
    
    /// Resumes the current audio recording.
    func resumeRecording() {
        guard isRecording && isPaused else { return }
        
        enableWakeLock()
        audioEngine.prepare()
        do {
            try audioEngine.start()
            isPaused = false
            if let pauseStartTime = pauseStartTime {
                pausedDuration += Int(Date().timeIntervalSince(pauseStartTime))
            }
            
            updateNowPlayingInfo(isPaused: false)
            notificationManager?.updateState(isPaused: false)
            delegate?.audioStreamManager(self, didResumeRecording: Date())
            delegate?.audioStreamManager(self, didUpdateNotificationState: false)
            
            Logger.debug("Recording resumed.")
        } catch {
            Logger.debug("Error: Failed to resume recording: \(error.localizedDescription)")
        }
    }
    
    /// Describes the format of the given audio format.
    /// - Parameter format: The AVAudioFormat object to describe.
    /// - Returns: A string description of the audio format.
    func describeAudioFormat(_ format: AVAudioFormat) -> String {
        let sampleRate = format.sampleRate
        let channelCount = format.channelCount
        let bitDepth: String
        
        switch format.commonFormat {
        case .pcmFormatInt16:
            bitDepth = "16-bit Int"
        case .pcmFormatInt32:
            bitDepth = "32-bit Int"
        case .pcmFormatFloat32:
            bitDepth = "32-bit Float"
        case .pcmFormatFloat64:
            bitDepth = "64-bit Float"
        default:
            bitDepth = "Unknown Format"
        }
        
        return "Sample Rate: \(sampleRate), Channels: \(channelCount), Format: \(bitDepth)"
    }
    
    /// Stops the current audio recording.
    /// - Returns: A RecordingResult object if the recording stopped successfully, or nil otherwise.
    func stopRecording() -> RecordingResult? {
        disableWakeLock() // Will only disable if keepAwake is true
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        isRecording = false
        isPaused = false
        
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
            
            // Clean up audio session
            try? audioSession?.setActive(false)
        }
        
        guard let fileURL = recordingFileURL, let startTime = startTime, let settings = recordingSettings else {
            Logger.debug("Recording or file URL is nil.")
            return nil
        }
        
        // Emit any remaining accumulated data
        if !accumulatedData.isEmpty {
            let currentTime = Date()
            let recordingTime = currentTime.timeIntervalSince(startTime)
            delegate?.audioStreamManager(self, didReceiveAudioData: accumulatedData, recordingTime: recordingTime, totalDataSize: totalDataSize)
            accumulatedData.removeAll()
        }
        
        let endTime = Date()
        let duration = Int64(endTime.timeIntervalSince(startTime) * 1000) - Int64(pausedDuration * 1000)
        
        // Calculate the total size of audio data written to the file
        let filePath = fileURL.path
        do {
            let fileAttributes = try FileManager.default.attributesOfItem(atPath: filePath)
            let fileSize = fileAttributes[FileAttributeKey.size] as? Int64 ?? 0
            
            // Return nil if the file is too small (less than WAV header size)
            if fileSize <= 44 {
                Logger.debug("Recording file is too small (≤ 44 bytes), likely no audio data was recorded")
                return nil
            }
            
            // Update the WAV header with the correct file size
            updateWavHeader(fileURL: fileURL, totalDataSize: fileSize - 44)
            
            let result = RecordingResult(
                fileUri: fileURL.absoluteString,
                filename: fileURL.lastPathComponent,
                mimeType: mimeType,
                duration: duration,
                size: fileSize,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate
            )
            recordingFileURL = nil // Reset for next recording
            lastBufferTime = nil // Reset last buffer time
            
            return result
        } catch {
            Logger.debug("Failed to fetch file attributes: \(error)")
            return nil
        }
    }
    
    /// Resamples the audio buffer using vDSP. If it fails, falls back to manual resampling.
    /// - Parameters:
    ///   - buffer: The original audio buffer to be resampled.
    ///   - originalSampleRate: The sample rate of the original audio buffer.
    ///   - targetSampleRate: The desired sample rate to resample to.
    /// - Returns: A new audio buffer resampled to the target sample rate, or nil if resampling fails.
    private func resampleAudioBuffer(_ buffer: AVAudioPCMBuffer, from originalSampleRate: Double, to targetSampleRate: Double) -> AVAudioPCMBuffer? {
        guard let channelData = buffer.floatChannelData else { return nil }
        
        let sourceFrameCount = Int(buffer.frameLength)
        let sourceChannels = Int(buffer.format.channelCount)
        
        // Calculate the number of frames in the target buffer
        let targetFrameCount = Int(Double(sourceFrameCount) * targetSampleRate / originalSampleRate)
        
        // Create a new audio buffer for the resampled data
        guard let targetBuffer = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: AVAudioFrameCount(targetFrameCount)) else { return nil }
        targetBuffer.frameLength = AVAudioFrameCount(targetFrameCount)
        
        let resamplingFactor = Float(targetSampleRate / originalSampleRate) // Factor to resample the audio
        
        for channel in 0..<sourceChannels {
            let input = UnsafeBufferPointer(start: channelData[channel], count: sourceFrameCount) // Original channel data
            let output = UnsafeMutableBufferPointer(start: targetBuffer.floatChannelData![channel], count: targetFrameCount) // Buffer for resampled data
            
            var y: [Float] = Array(repeating: 0, count: targetFrameCount) // Temporary array for resampled data
            
            // Resample using vDSP_vgenp which performs interpolation
            vDSP_vgenp(input.baseAddress!, vDSP_Stride(1), [Float](stride(from: 0, to: Float(sourceFrameCount), by: resamplingFactor)), vDSP_Stride(1), &y, vDSP_Stride(1), vDSP_Length(targetFrameCount), vDSP_Length(sourceFrameCount))
            
            for i in 0..<targetFrameCount {
                output[i] = y[i]
            }
        }
        return targetBuffer
    }
    
    /// Manually resamples the audio buffer using linear interpolation.
    /// - Parameters:
    ///   - buffer: The original audio buffer to be resampled.
    ///   - originalSampleRate: The sample rate of the original audio buffer.
    ///   - targetSampleRate: The desired sample rate to resample to.
    /// - Returns: A new audio buffer resampled to the target sample rate, or nil if resampling fails.
    private func manualResampleAudioBuffer(_ buffer: AVAudioPCMBuffer, from originalSampleRate: Double, to targetSampleRate: Double) -> AVAudioPCMBuffer? {
        guard let channelData = buffer.floatChannelData else { return nil }
        
        let sourceFrameCount = Int(buffer.frameLength)
        let sourceChannels = Int(buffer.format.channelCount)
        let targetFrameCount = Int(Double(sourceFrameCount) * targetSampleRate / originalSampleRate)
        
        guard let targetBuffer = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: AVAudioFrameCount(targetFrameCount)) else { return nil }
        targetBuffer.frameLength = AVAudioFrameCount(targetFrameCount)
        
        let resamplingFactor = Float(targetSampleRate / originalSampleRate)
        
        for channel in 0..<sourceChannels {
            let input = UnsafeBufferPointer(start: channelData[channel], count: sourceFrameCount)
            let output = UnsafeMutableBufferPointer(start: targetBuffer.floatChannelData![channel], count: targetFrameCount)
            
            var y = Array(repeating: Float(0), count: targetFrameCount)
            for i in 0..<targetFrameCount {
                let index = Float(i) / resamplingFactor
                let low = Int(floor(index))
                let high = min(low + 1, sourceFrameCount - 1)
                let weight = index - Float(low)
                y[i] = (1 - weight) * input[low] + weight * input[high]
            }
            
            for i in 0..<targetFrameCount {
                output[i] = y[i]
            }
        }
        
        return targetBuffer
    }
    
    
    
    /// Updates the WAV header with the correct file size.
    /// - Parameters:
    ///   - fileURL: The URL of the WAV file.
    ///   - totalDataSize: The total size of the audio data.
    private func updateWavHeader(fileURL: URL, totalDataSize: Int64) {
        // Prevent negative values - minimum WAV file size should be at least the header size (44 bytes)
        guard totalDataSize >= 0 else {
            Logger.debug("Invalid file size: total data size is negative")
            return
        }

        do {
            let fileHandle = try FileHandle(forUpdating: fileURL)
            defer { fileHandle.closeFile() }

            // Calculate sizes
            let fileSize = totalDataSize + 44 - 8 // Total file size minus 8 bytes for 'RIFF' and size field itself
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
        
        let currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(pausedDuration)
        
        // Update both notification manager and media player
        notificationManager?.updateDuration(currentDuration)
        
        if let notificationView = notificationView {
            var nowPlayingInfo = notificationView.nowPlayingInfo ?? [:]
            nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentDuration
            notificationView.nowPlayingInfo = nowPlayingInfo
        }
    }
    
    /// Processes the audio buffer and writes data to the file. Also handles audio processing if enabled.
    /// - Parameters:
    ///   - buffer: The audio buffer to process.
    ///   - fileURL: The URL of the file to write the data to.
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, fileURL: URL) {
        guard let fileHandle = try? FileHandle(forWritingTo: fileURL) else {
            Logger.debug("Failed to open file handle for URL: \(fileURL)")
            return
        }
        
        let targetSampleRate = recordingSettings?.desiredSampleRate ?? buffer.format.sampleRate
        let finalBuffer: AVAudioPCMBuffer
        
        if buffer.format.sampleRate != targetSampleRate {
            // Resample the audio buffer if the target sample rate is different from the input sample rate
            if let resampledBuffer = resampleAudioBuffer(buffer, from: buffer.format.sampleRate, to: targetSampleRate) {
                finalBuffer = resampledBuffer
            } else {
                Logger.debug("Failed to resample audio buffer. Using original buffer.")
                finalBuffer = buffer
            }
        } else {
            // Use the original buffer if the sample rates are the same
            finalBuffer = buffer
        }
        
        let audioData = finalBuffer.audioBufferList.pointee.mBuffers
        guard let bufferData = audioData.mData else {
            Logger.debug("Buffer data is nil.")
            return
        }
        var data = Data(bytes: bufferData, count: Int(audioData.mDataByteSize))
        
        // Check if this is the first buffer to process and totalDataSize is 0
        if totalDataSize == 0 {
            // Since it's the first buffer, prepend the WAV header
            let header = createWavHeader(dataSize: 0)  // Set initial dataSize to 0, update later
            data.insert(contentsOf: header, at: 0)
        }
        
        // Accumulate new data
        accumulatedData.append(data)
        
        //        print("Writing data size: \(data.count) bytes")  // Debug: Check the size of data being written
        fileHandle.seekToEndOfFile()
        fileHandle.write(data)
        fileHandle.closeFile()
        
        totalDataSize += Int64(data.count)
        //        print("Total data size written: \(totalDataSize) bytes")  // Debug: Check total data written
        
        if recordingSettings?.showNotification == true {
            updateNotificationDuration()
        }
        
        let currentTime = Date()
        if let lastEmissionTime = lastEmissionTime, currentTime.timeIntervalSince(lastEmissionTime) >= emissionInterval {
            if let startTime = startTime {
                let recordingTime = currentTime.timeIntervalSince(startTime)
                // Copy accumulated data for processing
                let dataToProcess = accumulatedData
                
                // Emit the processed audio data
                self.delegate?.audioStreamManager(self, didReceiveAudioData: dataToProcess, recordingTime: recordingTime, totalDataSize: totalDataSize)
                
                if recordingSettings?.enableProcessing == true {
                    // Process the copied data and emit result
                    DispatchQueue.global().async {
                        if let processor = self.audioProcessor, let settings = self.recordingSettings {
                            Logger.debug("processAudioBuffer with dataToProcess size --> \(dataToProcess.count)")
                            
                            let processingResult = processor.processAudioBuffer(
                                data: dataToProcess,
                                sampleRate: Float(settings.sampleRate),
                                pointsPerSecond: settings.pointsPerSecond ?? 10,
                                algorithm: settings.algorithm ?? "rms",
                                featureOptions: settings.featureOptions ?? ["rms": true, "zcr": true],
                                bitDepth: settings.bitDepth,
                                numberOfChannels: settings.numberOfChannels
                            )
                            Logger.debug("processingResult \(String(describing: processingResult))")
                            
                            DispatchQueue.main.async {
                                if let result = processingResult {
                                    self.delegate?.audioStreamManager(self, didReceiveProcessingResult: result)
                                } else {
                                    Logger.debug("Processing failed or returned nil.")
                                }
                            }
                        }
                    }
                }
                
                self.lastEmissionTime = currentTime // Update last emission time
                self.lastEmittedSize = totalDataSize
                accumulatedData.removeAll() // Reset accumulated data after emission
            }
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
