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
    private var totalPausedDuration: TimeInterval = 0  // Track total paused time
    private var currentPauseStart: Date?              // Track current pause start
    private var isRecording = false
    private var isPaused = false
    
    // Wake lock related properties
    private var wasIdleTimerDisabled: Bool = false  // Track previous idle timer state
    private var isWakeLockEnabled: Bool = false     // Track current wake lock state

    internal var lastEmissionTime: Date?
    internal var lastEmittedSize: Int64 = 0
    internal var lastEmittedCompressedSize: Int64 = 0
    private var emissionInterval: TimeInterval = 1.0 // Default to 1 second
    private var totalDataSize: Int64 = 0
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
        
    private var lastValidDuration: TimeInterval?  // Add this property
    
    private var compressedRecorder: AVAudioRecorder?
    private var compressedFileURL: URL?
    private var compressedFormat: String = "aac"
    private var compressedBitRate: Int = 128000
    
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
    
    func currentRecordingDuration() -> TimeInterval {
        // If we're paused, return the last valid duration
        if isPaused, let lastDuration = lastValidDuration {
            return lastDuration
        }
        
        guard let settings = recordingSettings else { return 0 }
        
        // Normal duration calculation from data
        let sampleRate = Double(settings.sampleRate)
        let channels = Double(settings.numberOfChannels)
        let bytesPerSample = Double(settings.bitDepth) / 8.0
        
        let durationFromData = Double(totalDataSize) / (sampleRate * channels * bytesPerSample)
        
        return durationFromData
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
            "size": totalDataSize,
            "interval": emissionInterval
        ]
        
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
        
        let session = AVAudioSession.sharedInstance()
        var newSettings = settings
        
        // Add these initializations back
        emissionInterval = max(100.0, Double(intervalMilliseconds)) / 1000.0
        lastEmissionTime = Date()
        accumulatedData.removeAll()
        totalDataSize = 0
        totalPausedDuration = 0
        lastEmittedSize = 0
        isPaused = false
        
        // Create recording file first
        recordingFileURL = createRecordingFile()
        if recordingFileURL == nil {
            Logger.debug("Error: Failed to create recording file.")
            return nil
        }
        
        // Then set up audio session and tap
        do {
            Logger.debug("Configuring audio session with sample rate: \(settings.sampleRate) Hz")
            
            if let currentRoute = session.currentRoute.outputs.first {
                Logger.debug("Current audio output: \(currentRoute.portType)")
                newSettings.sampleRate = settings.sampleRate  // Keep original sample rate
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
            try session.setPreferredIOBufferDuration(1024 / Double(settings.sampleRate))
            try session.setActive(true)
            Logger.debug("Audio session activated successfully.")
            
            let actualSampleRate = session.sampleRate
            if actualSampleRate != settings.sampleRate {
                Logger.debug("Hardware using sample rate \(actualSampleRate)Hz, will resample to \(settings.sampleRate)Hz")
            }
            
            recordingSettings = newSettings  // Keep original settings with desired sample rate
            enableWakeLock()
            
            // Create format matching hardware capabilities
            guard let hardwareFormat = AVAudioFormat(
                commonFormat: .pcmFormatFloat32,
                sampleRate: actualSampleRate,
                channels: AVAudioChannelCount(settings.numberOfChannels),
                interleaved: true
            ) else {
                Logger.debug("Failed to create hardware format")
                return nil
            }
            
            Logger.debug("""
                Audio format configuration:
                - Hardware format: \(describeAudioFormat(hardwareFormat))
                - Target format: \(describeCommonFormat(hardwareFormat.commonFormat)) at \(actualSampleRate)Hz
                - Bit depth: \(settings.bitDepth)-bit
                - Channels: \(settings.numberOfChannels)
                """)

            audioEngine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: hardwareFormat) { [weak self] (buffer, time) in
                guard let self = self,
                      let fileURL = self.recordingFileURL else {
                    Logger.debug("Error: File URL or self is nil during buffer processing.")
                    return
                }
                self.processAudioBuffer(buffer, fileURL: fileURL)
                self.lastBufferTime = time
            }
            
            // Setup compressed recording if enabled
            if settings.enableCompressedOutput {
                do {
                    let compressedSettings: [String: Any] = [
                        AVFormatIDKey: settings.compressedFormat == "aac" ? kAudioFormatMPEG4AAC : kAudioFormatOpus,
                        AVSampleRateKey: settings.sampleRate,
                        AVNumberOfChannelsKey: settings.numberOfChannels,
                        AVEncoderBitRateKey: settings.compressedBitRate,
                        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
                        AVEncoderBitDepthHintKey: 16
                    ]
                    
                    Logger.debug("Initializing compressed recording with settings: \(compressedSettings)")
                    
                    let tempDirectory = FileManager.default.temporaryDirectory
                    try FileManager.default.createDirectory(at: tempDirectory, withIntermediateDirectories: true)
                    
                    // Use the same UUID as the main recording
                    if let recordingUUID = recordingUUID {
                        compressedFileURL = tempDirectory.appendingPathComponent(recordingUUID.uuidString)
                            .appendingPathExtension(settings.compressedFormat)
                        
                        if let url = compressedFileURL {
                            // Create empty file first
                            if FileManager.default.createFile(atPath: url.path, contents: nil) {
                                Logger.debug("Created empty file at: \(url.path)")
                            } else {
                                Logger.debug("Failed to create empty file at: \(url.path)")
                            }
                            
                            // Then initialize recorder
                            compressedRecorder = try AVAudioRecorder(url: url, settings: compressedSettings)
                            if let recorder = compressedRecorder {
                                let prepared = recorder.prepareToRecord()
                                Logger.debug("Recorder prepared: \(prepared)")
                                
                                let started = recorder.record()
                                Logger.debug("Recorder started: \(started)")
                                
                                Logger.debug("Recorder current time: \(recorder.currentTime)")
                                
                                compressedFormat = settings.compressedFormat
                                compressedBitRate = settings.compressedBitRate
                                Logger.debug("Compressed recording initialized - Format: \(compressedFormat), Bitrate: \(compressedBitRate)")
                            }
                        }
                    }
                } catch {
                    Logger.debug("Failed to setup compressed recording: \(error)")
                    compressedFileURL = nil
                    compressedRecorder = nil
                }
            }
            
        } catch {
            Logger.debug("Error: Failed to set up audio session with preferred settings: \(error.localizedDescription)")
            return nil
        }
        
        NotificationCenter.default.addObserver(self, selector: #selector(handleAudioSessionInterruption), name: AVAudioSession.interruptionNotification, object: nil)
        
        // Create audio format based on recording settings
        let commonFormat: AVAudioCommonFormat
        switch newSettings.bitDepth {
        case 16:
            commonFormat = .pcmFormatInt16
        case 32:
            commonFormat = .pcmFormatFloat32
        default:
            Logger.debug("Unsupported bit depth: \(newSettings.bitDepth), falling back to 16-bit")
            commonFormat = .pcmFormatInt16
        }
        
        guard let audioFormat = AVAudioFormat(
            commonFormat: commonFormat,
            sampleRate: newSettings.sampleRate,
            channels: UInt32(newSettings.numberOfChannels),
            interleaved: true
        ) else {
            Logger.debug("Error: Failed to create audio format with bit depth: \(newSettings.bitDepth)")
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
        
        if settings.showNotification {
            initializeNotifications()
        }
        
        do {
            startTime = Date()
            totalPausedDuration = 0     // Reset pause tracking
            currentPauseStart = nil
            Logger.debug("Starting new recording - Reset pause tracking")
            
            try audioEngine.start()
            isRecording = true
            isPaused = false
            Logger.debug("Debug: Recording started successfully.")
            
            return StartRecordingResult(
                fileUri: recordingFileURL!.path,
                mimeType: mimeType,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate,
                compression: settings.enableCompressedOutput && compressedFileURL != nil ? CompressedRecordingInfo(
                    fileUri: compressedFileURL!.absoluteString,
                    mimeType: compressedFormat == "aac" ? "audio/aac" : "audio/opus",
                    bitrate: compressedBitRate,
                    format: compressedFormat
                ) : nil
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
        
        // Store the current duration when pausing
        lastValidDuration = currentRecordingDuration()
        Logger.debug("Storing duration at pause: \(lastValidDuration ?? 0)")
        
        disableWakeLock()
        audioEngine.pause()
        isPaused = true
        
        updateNowPlayingInfo(isPaused: true)
        notificationManager?.updateState(isPaused: true)
        delegate?.audioStreamManager(self, didPauseRecording: Date())
        delegate?.audioStreamManager(self, didUpdateNotificationState: true)
        
        // Pause compressed recording if active
        compressedRecorder?.pause()
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
        
        lastValidDuration = nil  // Clear the stored duration when resuming
        
        enableWakeLock()
        audioEngine.prepare()
        do {
            try audioEngine.start()
            
            // Add the completed pause duration to total
            if let pauseStart = currentPauseStart {
                let currentPauseDuration = Date().timeIntervalSince(pauseStart)
                totalPausedDuration += currentPauseDuration
                currentPauseStart = nil
                
                Logger.debug("""
                    Resume completed:
                    - Added pause duration: \(currentPauseDuration)
                    - New total pause duration: \(totalPausedDuration)
                    """)
            }
            
            isPaused = false
            
            updateNowPlayingInfo(isPaused: false)
            notificationManager?.updateState(isPaused: false)
            delegate?.audioStreamManager(self, didResumeRecording: Date())
            delegate?.audioStreamManager(self, didUpdateNotificationState: false)
            
            // Resume compressed recording if active
            compressedRecorder?.record()
            
        } catch {
            Logger.debug("Error: Failed to resume recording: \(error.localizedDescription)")
        }
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
    
    private func describeCommonFormat(_ format: AVAudioCommonFormat) -> String {
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
    
    /// Stops the current audio recording.
    /// - Returns: A RecordingResult object if the recording stopped successfully, or nil otherwise.
    func stopRecording() -> RecordingResult? {
        guard isRecording else { return nil }
        
        disableWakeLock()
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        // Stop compressed recording if active
        compressedRecorder?.stop()
        
        // Get the final duration before changing state
        let finalDuration = currentRecordingDuration()
        
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
        
        guard let fileURL = recordingFileURL,
              let settings = recordingSettings else {
            Logger.debug("Recording or file URL is nil.")
            return nil
        }
        
        // Use the final duration we captured before state changes
        let durationMs = Int64(finalDuration * 1000)
        
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
                duration: durationMs,
                size: fileSize,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate,
                compression: settings.enableCompressedOutput && compressedFileURL != nil ? CompressedRecordingInfo(
                    fileUri: compressedFileURL!.absoluteString,
                    mimeType: compressedFormat == "aac" ? "audio/aac" : "audio/opus",
                    bitrate: compressedBitRate,
                    format: compressedFormat
                ) : nil
            )
            
            // Cleanup
            recordingFileURL = nil
            lastBufferTime = nil
            lastValidDuration = nil
            compressedRecorder = nil
            compressedFileURL = nil
            
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
        guard let settings = recordingSettings else {
            Logger.debug("Recording settings not available")
            return nil
        }
        
        Logger.debug("""
            Starting resampling:
            - Original format: \(describeAudioFormat(buffer.format))
            - Original frames: \(buffer.frameLength)
            - Target settings:
              • Sample rate: \(targetSampleRate)Hz
              • Bit depth: \(settings.bitDepth)
              • Channels: \(settings.numberOfChannels)
            """)
        
        // Use settings bit depth for output format
        let targetFormat: AVAudioCommonFormat = settings.bitDepth == 32 ? .pcmFormatFloat32 : .pcmFormatInt16
        
        // Create output format matching recording settings exactly
        guard let outputFormat = AVAudioFormat(
            commonFormat: targetFormat,
            sampleRate: targetSampleRate,
            channels: AVAudioChannelCount(settings.numberOfChannels),
            interleaved: true
        ) else {
            Logger.debug("Failed to create output format")
            return nil
        }
        
        // Calculate new buffer size
        let ratio = targetSampleRate / originalSampleRate
        let newFrameCount = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
        
        // Create output buffer
        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: outputFormat,
            frameCapacity: newFrameCount
        ) else {
            Logger.debug("Failed to create output buffer")
            return nil
        }
        outputBuffer.frameLength = newFrameCount
        
        // Create intermediate format for high-quality conversion if needed
        let needsIntermediate = buffer.format.commonFormat != outputFormat.commonFormat
        if needsIntermediate {
            Logger.debug("Using intermediate Float32 format for high-quality conversion")
            guard let intermediateFormat = AVAudioFormat(
                commonFormat: .pcmFormatFloat32,
                sampleRate: targetSampleRate,
                channels: AVAudioChannelCount(settings.numberOfChannels),
                interleaved: true
            ) else {
                Logger.debug("Failed to create intermediate format")
                return nil
            }
            
            // First convert to intermediate float format
            guard let converter = AVAudioConverter(from: buffer.format, to: intermediateFormat),
                  let intermediateBuffer = AVAudioPCMBuffer(
                    pcmFormat: intermediateFormat,
                    frameCapacity: newFrameCount
                  ) else {
                Logger.debug("Failed to create converter or intermediate buffer")
                return nil
            }
            intermediateBuffer.frameLength = newFrameCount
            
            var error: NSError?
            let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
                outStatus.pointee = AVAudioConverterInputStatus.haveData
                return buffer
            }
            
            converter.convert(to: intermediateBuffer, error: &error, withInputFrom: inputBlock)
            
            if let error = error {
                Logger.debug("Intermediate conversion failed: \(error.localizedDescription)")
                return nil
            }
            
            // Then convert to final format
            guard let finalConverter = AVAudioConverter(from: intermediateFormat, to: outputFormat) else {
                Logger.debug("Failed to create final converter")
                return nil
            }
            
            finalConverter.convert(to: outputBuffer, error: &error) { inNumPackets, outStatus in
                outStatus.pointee = AVAudioConverterInputStatus.haveData
                return intermediateBuffer
            }
            
            if let error = error {
                Logger.debug("Final conversion failed: \(error.localizedDescription)")
                return nil
            }
        } else {
            // Direct conversion if formats are compatible
            guard let converter = AVAudioConverter(from: buffer.format, to: outputFormat) else {
                Logger.debug("Failed to create converter")
                return nil
            }
            
            var error: NSError?
            let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
                outStatus.pointee = AVAudioConverterInputStatus.haveData
                return buffer
            }
            
            converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)
            
            if let error = error {
                Logger.debug("Conversion failed: \(error.localizedDescription)")
                return nil
            }
        }
        
        Logger.debug("""
            Resampling completed:
            - Final format: \(describeAudioFormat(outputBuffer.format))
            - Final frames: \(outputBuffer.frameLength)
            - Conversion path: \(needsIntermediate ? "With intermediate Float32" : "Direct")
            """)
        
        return outputBuffer
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
        
        let currentDuration = Date().timeIntervalSince(startTime) - TimeInterval(totalPausedDuration)
        
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
        guard let settings = recordingSettings else {
            Logger.debug("Recording settings not available")
            return
        }
        
        guard let fileHandle = try? FileHandle(forWritingTo: fileURL) else {
            Logger.debug("Failed to open file handle for URL: \(fileURL)")
            return
        }
        defer {
            fileHandle.closeFile()  // Ensure file is always closed
        }
        
        let targetSampleRate = Double(settings.sampleRate)
        let targetFormat: AVAudioCommonFormat = settings.bitDepth == 32 ? .pcmFormatFloat32 : .pcmFormatInt16
        
        // First handle resampling if needed
        let resampledBuffer: AVAudioPCMBuffer
        if buffer.format.sampleRate != targetSampleRate {
            if let resampled = resampleAudioBuffer(buffer, from: buffer.format.sampleRate, to: targetSampleRate) {
                resampledBuffer = resampled
            } else {
                Logger.debug("Resampling failed")
                return
            }
        } else {
            resampledBuffer = buffer
        }
        
        // Then ensure format matches user settings
        let finalBuffer: AVAudioPCMBuffer
        if resampledBuffer.format.commonFormat != targetFormat {
            guard let converted = convertBufferFormat(resampledBuffer, to: AVAudioFormat(
                commonFormat: targetFormat,
                sampleRate: targetSampleRate,
                channels: AVAudioChannelCount(settings.numberOfChannels),
                interleaved: true
            )!) else {
                Logger.debug("Format conversion failed")
                return
            }
            finalBuffer = converted
        } else {
            finalBuffer = resampledBuffer
        }
        
        let audioData = finalBuffer.audioBufferList.pointee.mBuffers
        guard let bufferData = audioData.mData else {
            Logger.debug("Buffer data is nil.")
            return
        }
        
        var data = Data(bytes: bufferData, count: Int(audioData.mDataByteSize))
        
        // Check if this is the first buffer to process
        if totalDataSize == 0 {
            let header = createWavHeader(dataSize: 0)
            data.insert(contentsOf: header, at: 0)
        }
        
        // Write to file
        fileHandle.seekToEndOfFile()
        fileHandle.write(data)
        
        // Update total size and accumulated data
        totalDataSize += Int64(data.count)
        accumulatedData.append(data)
        
        // Handle notifications if enabled
        if recordingSettings?.showNotification == true {
            updateNotificationDuration()
        }
        
        // Emit data based on interval
        let currentTime = Date()
        if let lastEmissionTime = lastEmissionTime,
           let startTime = startTime,
           currentTime.timeIntervalSince(lastEmissionTime) >= emissionInterval {
            
            let recordingTime = currentTime.timeIntervalSince(startTime)
            let dataToProcess = accumulatedData
            
            // Prepare compression info if enabled
            var compressionInfo: [String: Any]? = nil
            if settings.enableCompressedOutput, let compressedURL = compressedFileURL {
                do {
                    // Ensure file exists and has data
                    if FileManager.default.fileExists(atPath: compressedURL.path) {
                        let compressedAttributes = try FileManager.default.attributesOfItem(atPath: compressedURL.path)
                        if let compressedSize = compressedAttributes[.size] as? Int64 {
                            let eventDataSize = compressedSize - lastEmittedCompressedSize
                            
                            Logger.debug("Compressed file status - Total size: \(compressedSize), New data size: \(eventDataSize)")
                            
                            // Read the new compressed data if there's new data
                            var compressedData: String? = nil
                            if eventDataSize > 0 {
                                do {
                                    let fileHandle = try FileHandle(forReadingFrom: compressedURL)
                                    defer { fileHandle.closeFile() }
                                    
                                    fileHandle.seek(toFileOffset: UInt64(lastEmittedCompressedSize))
                                    let data = fileHandle.readData(ofLength: Int(eventDataSize))
                                    compressedData = data.base64EncodedString()
                                    
                                    Logger.debug("Read compressed data of size: \(data.count)")
                                } catch {
                                    Logger.debug("Error reading compressed data: \(error)")
                                }
                            }
                            
                            lastEmittedCompressedSize = compressedSize
                            
                            compressionInfo = [
                                "position": recordingTime * 1000, // Convert to milliseconds
                                "fileUri": compressedURL.absoluteString,
                                "eventDataSize": eventDataSize,
                                "totalSize": compressedSize,
                                "data": compressedData ?? ""
                            ]
                            
                            Logger.debug("Compression info prepared: \(String(describing: compressionInfo))")
                        } else {
                            Logger.debug("Could not get compressed file size")
                        }
                    } else {
                        Logger.debug("Compressed file does not exist at path: \(compressedURL.path)")
                    }
                } catch {
                    Logger.debug("Error preparing compression info: \(error)")
                }
            }
            
            // Emit the audio data with compression info
            delegate?.audioStreamManager(
                self,
                didReceiveAudioData: dataToProcess,
                recordingTime: recordingTime,
                totalDataSize: totalDataSize,
                compressionInfo: compressionInfo
            )
            
            // Process audio if enabled
            if settings.enableProcessing {
                DispatchQueue.global().async { [weak self] in
                    guard let self = self else { return }
                    if let processor = self.audioProcessor {
                        Logger.debug("Processing audio buffer of size: \(dataToProcess.count)")
                        let processingResult = processor.processAudioBuffer(
                            data: dataToProcess,
                            sampleRate: Float(settings.sampleRate),
                            pointsPerSecond: settings.pointsPerSecond ?? 10,
                            algorithm: settings.algorithm ?? "rms",
                            featureOptions: settings.featureOptions ?? ["rms": true, "zcr": true],
                            bitDepth: settings.bitDepth,
                            numberOfChannels: settings.numberOfChannels
                        )
                        
                        DispatchQueue.main.async {
                            if let result = processingResult {
                                self.delegate?.audioStreamManager(self, didReceiveProcessingResult: result)
                            }
                        }
                    }
                }
            }
            
            // Update state after emission
            self.lastEmissionTime = currentTime
            self.lastEmittedSize = totalDataSize
            accumulatedData.removeAll()
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
