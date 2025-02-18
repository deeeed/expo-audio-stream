import ExpoModulesCore
import AVFoundation

let audioDataEvent: String = "AudioData"
let audioAnalysisEvent: String = "AudioAnalysis"
let recordingInterruptedEvent: String = "onRecordingInterrupted"

public class ExpoAudioStreamModule: Module, AudioStreamManagerDelegate {
    private var streamManager = AudioStreamManager()
    private let notificationCenter = UNUserNotificationCenter.current()
    private let notificationIdentifier = "audio_recording_notification"
        
    public func definition() -> ModuleDefinition {
        Name("ExpoAudioStream")
        
        // Defines event names that the module can send to JavaScript.
        Events([
            audioDataEvent,
            audioAnalysisEvent,
            recordingInterruptedEvent
        ])
        
        OnCreate {
            print("Setting streamManager delegate")
            streamManager.delegate = self
        }
        
        /// Extracts audio analysis data from an audio file.
        ///
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `pointsPerSecond`: The number of data points to extract per second of audio.
        ///     - `algorithm`: The algorithm to use for extraction.
        ///     - `features`: A dictionary specifying which features to extract (e.g., `energy`, `mfcc`, `rms`, etc.).
        ///   - promise: A promise to resolve with the extracted audio analysis data or reject with an error.
        /// - Returns: Promise to be resolved with audio analysis data.
        AsyncFunction("extractAudioAnalysis") { (options: [String: Any], promise: Promise) in
            guard let fileUri = options["fileUri"] as? String,
                  let url = URL(string: fileUri),
                  let pointsPerSecond = options["pointsPerSecond"] as? Int,
                  let algorithm = options["algorithm"] as? String else {
                promise.reject("INVALID_ARGUMENTS", "Invalid arguments provided")
                return
            }
            
            let features = options["features"] as? [String: Bool] ?? [:]
            let featureOptions = self.extractFeatureOptions(from: features)
            
            DispatchQueue.global().async {
                do {
                    let audioFile = try AVAudioFile(forReading: url)
                    let bitDepth = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16
                    let numberOfChannels = Int(audioFile.fileFormat.channelCount)
                    
                    let audioProcessor = try AudioProcessor(url: url, resolve: { result in
                        promise.resolve(result)
                    }, reject: { code, message in
                        promise.reject(code, message)
                    })
                    
                    if let result = audioProcessor.processAudioData(numberOfSamples: nil, pointsPerSecond: pointsPerSecond, algorithm: algorithm, featureOptions: featureOptions, bitDepth: bitDepth, numberOfChannels: numberOfChannels) {
                        promise.resolve(result.toDictionary())
                    } else {
                        promise.reject("PROCESSING_ERROR", "Failed to process audio data")
                    }
                } catch {
                    promise.reject("PROCESSING_ERROR", "Failed to initialize audio processor: \(error.localizedDescription)")
                }
            }
        }
        
        /// Extracts waveform data from an audio file.
        ///
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `numberOfSamples`: The number of samples to extract for the waveform.
        ///     - `offset`: The optional offset to start reading from. Defaults to 0 if not provided.
        ///     - `length`: The optional length of the audio to read. Defaults to the entire file if not provided.
        ///   - promise: A promise to resolve with the extracted waveform data or reject with an error.
        /// - Returns: Promise to be resolved with waveform data.
        AsyncFunction("extractWaveform") { (options: [String: Any], promise: Promise) in
            guard let fileUri = options["fileUri"] as? String,
                  let url = URL(string: fileUri),
                  let numberOfSamples = options["numberOfSamples"] as? Int else {
                promise.reject("INVALID_ARGUMENTS", "Invalid arguments provided")
                return
            }
            
            let offset = options["offset"] as? Int ?? 0
            DispatchQueue.global().async {
                do {
                    let audioFile = try AVAudioFile(forReading: url)
                    let bitDepth = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16
                    let numberOfChannels = Int(audioFile.fileFormat.channelCount)
                    
                    // If length is not provided, default to the entire file length
                    let length = options["length"] as? UInt ?? UInt(audioFile.length - AVAudioFramePosition(offset))
                    
                    let audioProcessor = try AudioProcessor(url: url, resolve: { result in
                        promise.resolve(result)
                    }, reject: { code, message in
                        promise.reject(code, message)
                    })
                    
                    if let result = audioProcessor.processAudioData(numberOfSamples: numberOfSamples, offset: offset, length: length, pointsPerSecond: nil, algorithm: "rms", featureOptions: [:], bitDepth: bitDepth, numberOfChannels: numberOfChannels) {
                        promise.resolve(result.toDictionary())
                    } else {
                        promise.reject("EXTRACTION_ERROR", "Failed to extract waveform")
                    }
                } catch {
                    promise.reject("EXTRACTION_ERROR", "Failed to initialize waveform extractor: \(error.localizedDescription)")
                }
            }
        }
        
        
        /// Asynchronously starts audio recording with the given settings.
        ///
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `sampleRate`: The sample rate for recording (default is 16000.0).
        ///     - `channelConfig`: The number of channels (default is 1 for mono).
        ///     - `audioFormat`: The bit depth for recording (default is 16 bits).
        ///     - `interval`: The interval in milliseconds at which to emit recording data (default is 1000 ms).
        ///     - `intervalAnalysis`: The interval in milliseconds at which to emit analysis data (default is 500 ms).
        ///     - `enableProcessing`: Boolean to enable/disable audio processing (default is false).
        ///     - `pointsPerSecond`: The number of data points to extract per second of audio (default is 20).
        ///     - `algorithm`: The algorithm to use for extraction (default is "rms").
        ///     - `featureOptions`: A dictionary of feature options to extract (default is empty).
        ///     - `maxRecentDataDuration`: The maximum duration of recent data to keep for processing (default is 10.0 seconds).
        ///     - `compression`: A dictionary containing:
        ///       - `enabled`: Boolean to enable/disable compression (default is false).
        ///       - `format`: The compression format (default is "aac").
        ///       - `bitrate`: The compression bitrate in bps (default is 128000).
        ///   - promise: A promise to resolve with the recording settings or reject with an error.
        AsyncFunction("startRecording") { (options: [String: Any], promise: Promise) in
            self.checkMicrophonePermission { granted in
                guard granted else {
                    promise.reject("PERMISSION_DENIED", "Recording permission has not been granted")
                    return
                }
                
                // Create settings with validation
                let settingsResult = RecordingSettings.fromDictionary(options)
                
                switch settingsResult {
                case .success(let settings):
                    // Initialize notification if enabled
                    if settings.showNotification {
                        Task {
                            let notificationGranted = await self.requestNotificationPermissions()
                            if !notificationGranted {
                                Logger.debug("Notification permissions not granted")
                            }
                        }
                    }
                    
                    if let result = self.streamManager.startRecording(settings: settings) {
                        var resultDict: [String: Any] = [
                            "fileUri": result.fileUri,
                            "channels": result.channels,
                            "bitDepth": result.bitDepth,
                            "sampleRate": result.sampleRate,
                            "mimeType": result.mimeType,
                        ]
                        
                        // Add compression info if available
                        if let compression = result.compression {
                            resultDict["compression"] = [
                                "compressedFileUri": compression.compressedFileUri,
                                "mimeType": compression.mimeType,
                                "bitrate": compression.bitrate,
                                "format": compression.format
                            ]
                        }
                        
                        promise.resolve(resultDict)
                    } else {
                        promise.reject("ERROR", "Failed to start recording.")
                    }
                    
                case .failure(let error):
                    promise.reject("INVALID_SETTINGS", error.localizedDescription)
                }
            }
        }
        
        /// Retrieves the current status of the audio stream.
        ///
        /// - Returns: The current status of the audio stream.Ï
        Function("status") {
            return self.streamManager.getStatus()
        }
        
        /// Pauses audio recording.
        Function("pauseRecording") {
            self.streamManager.pauseRecording()
        }
        
        /// Resumes audio recording.
        Function("resumeRecording") {
            self.streamManager.resumeRecording()
        }
        
        /// Asynchronously stops audio recording and retrieves the recording result.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the recording result or reject with an error.
        AsyncFunction("stopRecording") { (promise: Promise) in
            if let recordingResult = self.streamManager.stopRecording() {
                var resultDict: [String: Any] = [
                    "fileUri": recordingResult.fileUri,
                    "filename": recordingResult.filename,
                    "durationMs": recordingResult.duration,
                    "size": recordingResult.size,
                    "channels": recordingResult.channels,
                    "bitDepth": recordingResult.bitDepth,
                    "sampleRate": recordingResult.sampleRate,
                    "mimeType": recordingResult.mimeType,
                    "createdAt": Date().timeIntervalSince1970 * 1000,
                ]
                
                // Add compression info if available
                if let compression = recordingResult.compression {
                    resultDict["compression"] = [
                        "compressedFileUri": compression.compressedFileUri,
                        "mimeType": compression.mimeType,
                        "bitrate": compression.bitrate,
                        "format": compression.format,
                        "size": compression.size
                    ]
                }
                
                promise.resolve(resultDict)
            } else {
                promise.reject("ERROR", "Failed to stop recording or no recording in progress.")
            }
        }
        
        /// Asynchronously lists all audio files stored in the document directory.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the list of audio file URIs or reject with an error.
        /// - Returns: A promise that resolves with the list of audio file URIs or rejects with an error.
        AsyncFunction("listAudioFiles") { (promise: Promise) in
            let files = listAudioFiles()
            promise.resolve(files)
        }
        
        /// Clears all audio files stored in the document directory.
        Function("clearAudioFiles") {
            clearAudioFiles()
        }
        
        
        /// Requests audio recording permissions.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the permission status or reject with an error.
        /// - Returns: Promise to be resolved with the permission status.
        AsyncFunction("requestPermissionsAsync") { (promise: Promise) in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                promise.resolve([
                    "status": granted ? "granted" : "denied",
                    "granted": granted,
                    "expires": "never",
                    "canAskAgain": true
                ])
            }
        }
        
        AsyncFunction("requestNotificationPermissionsAsync") { (promise: Promise) in
            Task {
                let granted = await requestNotificationPermissions()
                promise.resolve([
                    "granted": granted,
                    "status": granted ? "granted" : "denied"
                ])
            }
        }
        
        /// Gets the current audio recording permissions.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the permission status or reject with an error.
        /// - Returns: Promise to be resolved with the permission status.
        AsyncFunction("getPermissionsAsync") { (promise: Promise) in
            let permissionStatus = AVAudioSession.sharedInstance().recordPermission
            switch permissionStatus {
            case .granted:
                promise.resolve([
                    "status": "granted",
                    "granted": true,
                    "expires": "never",
                    "canAskAgain": true
                ])
            case .denied:
                promise.resolve([
                    "status": "denied",
                    "granted": false,
                    "expires": "never",
                    "canAskAgain": false
                ])
            case .undetermined:
                promise.resolve([
                    "status": "undetermined",
                    "granted": false,
                    "expires": "never",
                    "canAskAgain": true
                ])
            @unknown default:
                promise.reject("UNKNOWN_ERROR", "Unknown permission status")
            }
        }

        /// Extracts audio features from an audio file.
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `startTimeMs`: Optional start time in milliseconds.
        ///     - `endTimeMs`: Optional end time in milliseconds.
        ///     - `pointsPerSecond`: Number of points per second for analysis.
        ///     - `algorithm`: The algorithm to use for extraction.
        ///     - `featureOptions`: Features to extract.
        AsyncFunction("extractPreview") { (options: [String: Any], promise: Promise) in
            guard let fileUri = options["fileUri"] as? String,
                  let url = URL(string: fileUri) else {
                promise.reject("INVALID_ARGUMENTS", "Invalid file URI provided")
                return
            }

            let startTimeMs = options["startTimeMs"] as? Double
            let endTimeMs = options["endTimeMs"] as? Double
            let pointsPerSecond = options["pointsPerSecond"] as? Int ?? 20
            let algorithm = options["algorithm"] as? String ?? "rms"
            let featureOptions = options["featureOptions"] as? [String: Bool] ?? [:]

            DispatchQueue.global().async {
                do {
                    let audioProcessor = try AudioProcessor(
                        url: url,
                        resolve: { result in
                            promise.resolve(result)
                        },
                        reject: { code, message in
                            promise.reject(code, message)
                        }
                    )
                    
                    if let result = audioProcessor.processAudioData(
                        startTimeMs: startTimeMs,
                        endTimeMs: endTimeMs,
                        pointsPerSecond: pointsPerSecond,
                        algorithm: algorithm,
                        featureOptions: featureOptions
                    ) {
                        promise.resolve(result.toDictionary())
                    } else {
                        promise.reject("PROCESSING_ERROR", "Failed to process audio data")
                    }
                } catch {
                    promise.reject("PROCESSING_ERROR", "Failed to initialize audio processor: \(error.localizedDescription)")
                }
            }
        }

        /// Trims an audio file to specified start and end times.
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `startTimeMs`: Start time in milliseconds.
        ///     - `endTimeMs`: End time in milliseconds.
        ///     - `outputFormat`: Optional output format configuration.
        AsyncFunction("trimAudio") { (options: [String: Any], promise: Promise) in
            guard let fileUri = options["fileUri"] as? String,
                  let startTimeMs = options["startTimeMs"] as? Double,
                  let endTimeMs = options["endTimeMs"] as? Double,
                  let url = URL(string: fileUri) else {
                promise.reject("INVALID_ARGUMENTS", "Invalid arguments provided")
                return
            }

            let outputFormat = options["outputFormat"] as? [String: Any]

            DispatchQueue.global().async {
                do {
                    let audioProcessor = try AudioProcessor(
                        url: url,
                        resolve: { result in
                            promise.resolve(result)
                        },
                        reject: { code, message in
                            promise.reject(code, message)
                        }
                    )
                    
                    if let result = audioProcessor.trimAudio(
                        startTimeMs: startTimeMs,
                        endTimeMs: endTimeMs,
                        outputFormat: outputFormat
                    ) {
                        promise.resolve([
                            "uri": result.uri,
                            "duration": result.duration,
                            "size": result.size
                        ])
                    } else {
                        promise.reject("TRIM_ERROR", "Failed to trim audio")
                    }
                } catch {
                    promise.reject("PROCESSING_ERROR", "Failed to initialize audio processor: \(error.localizedDescription)")
                }
            }
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveInterruption info: [String: Any]) {
        // Convert iOS interruption events to match the TypeScript types
        var reason: String
        var isPaused: Bool = true
        
        if let type = info["type"] as? String {
            switch type {
            case "began":
                // Phone call or other audio session interruption began
                reason = "audioFocusLoss"
            case "ended":
                reason = "audioFocusGain"
                isPaused = false
                // Check if this was from a phone call
                if let wasSuspended = info["wasSuspended"] as? Bool, wasSuspended {
                    reason = "phoneCallEnded"
                }
            default:
                return
            }
        } else if let specificReason = info["reason"] as? String {
            // Handle specific reasons that are already properly formatted
            reason = specificReason
            isPaused = info["isPaused"] as? Bool ?? true
        } else {
            return
        }
        
        // Send event in the correct format
        sendEvent(recordingInterruptedEvent, [
            "reason": reason,
            "isPaused": isPaused,
            "timestamp": Date().timeIntervalSince1970 * 1000
        ])
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didPauseRecording pauseTime: Date) {
        sendEvent(recordingInterruptedEvent, [
            "reason": "userPaused",
            "isPaused": true,
            "timestamp": pauseTime.timeIntervalSince1970 * 1000
        ])
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didResumeRecording resumeTime: Date) {
        sendEvent(recordingInterruptedEvent, [
            "reason": "userResumed",
            "isPaused": false,
            "timestamp": resumeTime.timeIntervalSince1970 * 1000
        ])
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didUpdateNotificationState isPaused: Bool) {
        sendEvent(recordingInterruptedEvent, [
            "reason": "notification",
            "isPaused": isPaused,
            "timestamp": Date().timeIntervalSince1970 * 1000
        ])
    }
    
    /// Handles the reception of audio data from the AudioStreamManager.
    ///
    /// - Parameters:
    ///   - manager: The AudioStreamManager instance.
    ///   - data: The received audio data.
    ///   - recordingTime: The current recording time.
    ///   - totalDataSize: The total size of the received audio data.
    func audioStreamManager(
        _ manager: AudioStreamManager,
        didReceiveAudioData data: Data,
        recordingTime: TimeInterval,
        totalDataSize: Int64,
        compressionInfo: [String: Any]?
    ) {
        var resultDict: [String: Any] = [
            "fileUri": manager.recordingFileURL?.absoluteString ?? "",
            "lastEmittedSize": totalDataSize,
            "encoded": data.base64EncodedString(),
            "deltaSize": data.count,
            "position": Int64(recordingTime * 1000),
            "mimeType": manager.mimeType,
            "totalSize": totalDataSize,
            "streamUuid": manager.recordingUUID?.uuidString ?? UUID().uuidString
        ]
        
        if let compressionInfo = compressionInfo {
            resultDict["compression"] = compressionInfo
        }
        
        sendEvent(audioDataEvent, resultDict)
    }
    
    private func requestNotificationPermissions() async -> Bool {
        do {
            let options: UNAuthorizationOptions = [.alert, .sound]
            return try await notificationCenter.requestAuthorization(options: options)
        } catch {
            Logger.debug("Failed to request notification permissions: \(error)")
            return false
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveProcessingResult result: AudioAnalysisData?) {
        // Handle the processed audio data
        // Emit the processing result event to JavaScript
        let resultDict = result?.toDictionary() ?? [:]
        Logger.debug("emitting \(audioAnalysisEvent) event with \(resultDict)")
        sendEvent(audioAnalysisEvent, resultDict)
    }
    
    /// Checks microphone permission and calls the completion handler with the result.
    ///
    /// - Parameters:
    ///   - completion: A completion handler that receives a boolean indicating whether the microphone permission was granted.
    private func checkMicrophonePermission(completion: @escaping (Bool) -> Void) {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            completion(true)
        case .denied:
            completion(false)
        case .undetermined:
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        @unknown default:
            completion(false)
        }
    }
    
    /// Clears all audio files stored in the document directory.
    private func clearAudioFiles() {
        let fileURLs = listAudioFiles()  // This now returns full URLs as strings
        fileURLs.forEach { fileURLString in
            if let fileURL = URL(string: fileURLString) {
                do {
                    try FileManager.default.removeItem(at: fileURL)
                    print("Removed file at:", fileURL.path)
                } catch {
                    print("Error removing file at \(fileURL.path):", error.localizedDescription)
                }
            } else {
                print("Invalid URL string: \(fileURLString)")
            }
        }
    }
    
    /// Extracts feature options from the provided options dictionary.
    ///
    /// - Parameters:
    ///   - options: The options dictionary containing feature flags.
    /// - Returns: A dictionary with feature flags and their boolean values.
    private func extractFeatureOptions(from options: [String: Any]) -> [String: Bool] {
        return [
            "energy": options["energy"] as? Bool ?? false,
            "mfcc": options["mfcc"] as? Bool ?? false,
            "rms": options["rms"] as? Bool ?? false,
            "zcr": options["zcr"] as? Bool ?? false,
            "dB": options["dB"] as? Bool ?? false,
            "spectralCentroid": options["spectralCentroid"] as? Bool ?? false,
            "spectralFlatness": options["spectralFlatness"] as? Bool ?? false,
            "spectralRollOff": options["spectralRollOff"] as? Bool ?? false,
            "spectralBandwidth": options["spectralBandwidth"] as? Bool ?? false,
            "chromagram": options["chromagram"] as? Bool ?? false,
            "tempo": options["tempo"] as? Bool ?? false,
            "hnr": options["hnr"] as? Bool ?? false
        ]
    }
    
    /// Lists all audio files stored in the document directory.
    ///
    /// - Returns: An array of file URIs as strings.
    func listAudioFiles() -> [String] {
        guard let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false) else {
            print("Failed to access document directory.")
            return []
        }
        
        do {
            let files = try FileManager.default.contentsOfDirectory(at: documentDirectory, includingPropertiesForKeys: nil)
            let audioFiles = files.filter { $0.pathExtension == "wav" }.map { $0.absoluteString }
            return audioFiles
        } catch {
            print("Error listing audio files:", error.localizedDescription)
            return []
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didFailWithError error: String) {
        // Send error event to JavaScript
        sendEvent("error", [
            "message": error
        ])
    }
}
