// packages/expo-audio-stream/ios/ExpoAudioStreamModule.swift
import ExpoModulesCore
import AVFoundation

// Constants
private let audioDataEvent: String = "AudioData"
private let audioAnalysisEvent: String = "AudioAnalysis"
private let recordingInterruptedEvent: String = "onRecordingInterrupted"
private let deviceChangedEvent: String = "deviceChangedEvent"
private let trimProgressEvent: String = "TrimProgress"
private let errorEvent: String = "error"
private let DEFAULT_SEGMENT_DURATION_MS = 100
private let audioDeviceTypeBuiltinMic = "builtin_mic"
private let audioDeviceTypeBluetooth = "bluetooth"
private let audioDeviceTypeUSB = "usb"
private let audioDeviceTypeWiredHeadset = "wired_headset"
private let audioDeviceTypeWiredHeadphones = "wired_headphones"
private let audioDeviceTypeSpeaker = "speaker"
private let audioDeviceTypeUnknown = "unknown"

public class ExpoAudioStreamModule: Module, AudioStreamManagerDelegate {
    private var streamManager = AudioStreamManager()
    private let notificationCenter = UNUserNotificationCenter.current()
    private let notificationIdentifier = "audio_recording_notification"
    private var deviceManager = AudioDeviceManager()
    private var deviceChangeObserver: Any?
        
    public func definition() -> ModuleDefinition {
        Name("ExpoAudioStream")
        
        // Defines event names that the module can send to JavaScript.
        Events([
            audioDataEvent,
            audioAnalysisEvent,
            recordingInterruptedEvent,
            deviceChangedEvent,
            trimProgressEvent,
            errorEvent
        ])
        
        OnCreate {
            Logger.debug("ExpoAudioStreamModule", "Module created, setting delegate and starting device monitoring.")
            streamManager.delegate = self
        }
        
        OnDestroy {
            Logger.debug("ExpoAudioStreamModule", "Module destroyed, stopping device monitoring.")
            _ = streamManager.stopRecording()
        }
        
        /// Extracts audio analysis data from an audio file.
        ///
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `pointsPerSecond`: The number of data points to extract per second of audio.
        ///     - `features`: A dictionary specifying which features to extract (e.g., `energy`, `mfcc`, `rms`, etc.).
        ///   - promise: A promise to resolve with the extracted audio analysis data or reject with an error.
        /// - Returns: Promise to be resolved with audio analysis data.
        AsyncFunction("extractAudioAnalysis") { (options: [String: Any], promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "extractAudioAnalysis called with options: \(options)")
            guard let fileUri = options["fileUri"] as? String,
                  let url = URL(string: fileUri) else {
                Logger.error("ExpoAudioStreamModule", "extractAudioAnalysis: Invalid file URI.")
                promise.reject("INVALID_ARGUMENTS", "Invalid file URI provided")
                return
            }
            
            // Get time or byte range options
            let startTimeMs = options["startTimeMs"] as? Double
            let endTimeMs = options["endTimeMs"] as? Double
            let position = options["position"] as? Int
            let byteLength = options["length"] as? Int
            
            // Validate ranges - can have time range OR byte range OR no range
            let hasTimeRange = startTimeMs != nil && endTimeMs != nil
            let hasByteRange = position != nil && byteLength != nil
            
            // Only throw if both ranges are provided
            guard !(hasTimeRange && hasByteRange) else {
                promise.reject("INVALID_ARGUMENTS", "Cannot specify both time range and byte range")
                return
            }
            
            let features = options["features"] as? [String: Bool] ?? [:]
            let featureOptions = self.extractFeatureOptions(from: features)
            let segmentDurationMs = options["segmentDurationMs"] as? Int ?? DEFAULT_SEGMENT_DURATION_MS // Default value of 100ms
            
            DispatchQueue.global().async(execute: {
                do {
                    let audioFile = try AVAudioFile(forReading: url)
                    let bitDepth = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16
                    let numberOfChannels = Int(audioFile.fileFormat.channelCount)
                    let sampleRate = audioFile.fileFormat.sampleRate
                    
                    // Convert time range to byte range if needed
                    let effectivePosition: Int?
                    let effectiveLength: Int?
                    
                    if hasTimeRange {
                        let bytesPerSecond = Int(sampleRate) * numberOfChannels * (bitDepth / 8)
                        effectivePosition = Int(startTimeMs! * Double(bytesPerSecond) / 1000.0)
                        effectiveLength = Int((endTimeMs! - startTimeMs!) * Double(bytesPerSecond) / 1000.0)
                    } else {
                        effectivePosition = position
                        effectiveLength = byteLength
                    }
                    
                    Logger.debug("ExpoAudioStreamModule", "extractAudioAnalysis: Processing started for \(fileUri)")
                    let audioProcessor = try AudioProcessor(url: url, resolve: { result in
                        Logger.warn("ExpoAudioStreamModule", "extractAudioAnalysis: AudioProcessor resolve called unexpectedly.")
                    }, reject: { code, message in
                        Logger.warn("ExpoAudioStreamModule", "extractAudioAnalysis: AudioProcessor reject called unexpectedly: \(code) - \(message)")
                    })
                    
                    if let result = audioProcessor.processAudioData(
                        numberOfSamples: nil,
                        offset: 0,
                        length: nil,
                        segmentDurationMs: segmentDurationMs,
                        featureOptions: featureOptions,
                        bitDepth: bitDepth,
                        numberOfChannels: numberOfChannels,
                        position: effectivePosition,
                        byteLength: effectiveLength
                    ) {
                        Logger.debug("ExpoAudioStreamModule", "extractAudioAnalysis: Processing successful for \(fileUri)")
                        promise.resolve(result.toDictionary())
                    } else {
                        Logger.error("ExpoAudioStreamModule", "extractAudioAnalysis: audioProcessor.processAudioData returned nil for \(fileUri)")
                        promise.reject("PROCESSING_ERROR", "Failed to process audio data")
                    }
                } catch {
                    Logger.error("ExpoAudioStreamModule", "extractAudioAnalysis: Error initializing AudioProcessor for \(fileUri): \(error.localizedDescription)")
                    promise.reject("PROCESSING_ERROR", "Failed to initialize audio processor: \(error.localizedDescription)")
                }
            })
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
        ///     - `bufferDurationSeconds`: The buffer duration in seconds (if no value we set a default buffer size).
        ///     - `skipFileWriting`: When true, only emits audio data without writing to file (default is false).
        ///   - promise: A promise to resolve with the recording settings or reject with an error.
        AsyncFunction("startRecording") { (options: [String: Any], promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "startRecording called with options: \(options)")
            self.checkMicrophonePermission { granted in
                guard granted else {
                    Logger.warn("ExpoAudioStreamModule", "startRecording: Permission denied.")
                    promise.reject("PERMISSION_DENIED", "Recording permission has not been granted")
                    return
                }
                
                // Check if compression is enabled and format is Opus
                var modifiedOptions = options
                if let compression = options["compression"] as? [String: Any],
                   let enabled = compression["enabled"] as? Bool, enabled,
                   let format = compression["format"] as? String,
                   format.lowercased() == "opus" {
                    
                    // Create a mutable copy of the compression dictionary
                    var modifiedCompression = compression
                    
                    // Change format to AAC and log warning
                    modifiedCompression["format"] = "aac"
                    modifiedOptions["compression"] = modifiedCompression
                    
                    Logger.warn("ExpoAudioStreamModule", "startRecording: Opus format is not supported on iOS. Falling back to AAC format.")
                }
                
                // Create settings with validation using the potentially modified options
                let settingsResult = RecordingSettings.fromDictionary(modifiedOptions)
                
                switch settingsResult {
                case .success(let settings):
                    Logger.debug("ExpoAudioStreamModule", "startRecording: Settings parsed successfully. ShowNotification=\(settings.showNotification)")
                    // Initialize notification if enabled
                    if settings.showNotification {
                        Task {
                            let notificationGranted = await self.requestNotificationPermissions()
                            if !notificationGranted {
                                Logger.debug("ExpoAudioStreamModule", "Notification permissions not granted")
                            }
                        }
                    }
                    
                    Logger.debug("ExpoAudioStreamModule", "startRecording: Calling streamManager.startRecording")
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
                        
                        Logger.info("ExpoAudioStreamModule", "startRecording: Recording started successfully. fileUri: \(result.fileUri)")
                        promise.resolve(resultDict)
                    } else {
                        Logger.error("ExpoAudioStreamModule", "startRecording: streamManager.startRecording returned nil.")
                        promise.reject("ERROR", "Failed to start recording.")
                    }
                    
                case .failure(let error):
                    Logger.error("ExpoAudioStreamModule", "startRecording: Invalid settings - \(error.localizedDescription)")
                    promise.reject("INVALID_SETTINGS", error.localizedDescription)
                }
            }
        }
        
        /// Retrieves the current status of the audio stream.
        ///
        /// - Returns: The current status of the audio stream.Ï
        Function("status") {
            let currentStatus = self.streamManager.getStatus()
            Logger.debug("ExpoAudioStreamModule", "status requested: isRecording=\(currentStatus["isRecording"] ?? false), isPaused=\(currentStatus["isPaused"] ?? false)")
            return currentStatus
        }
        
        /// Prepares audio recording with the specified settings without starting it.
        ///
        /// - Parameters:
        ///   - options: The recording settings to use.
        ///   - promise: A promise to resolve with true if preparation was successful.
        /// - Returns: A promise that resolves with a boolean indicating success.
        AsyncFunction("prepareRecording") { (options: [String: Any], promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "prepareRecording called with options: \(options)")
            self.checkMicrophonePermission { granted in
                guard granted else {
                    promise.reject("PERMISSION_DENIED", "Recording permission has not been granted")
                    return
                }
                
                // Create settings with validation
                let settingsResult = RecordingSettings.fromDictionary(options)
                
                switch settingsResult {
                case .success(let settings):
                    Logger.debug("ExpoAudioStreamModule", "prepareRecording: Settings parsed successfully. Calling streamManager.prepareRecording")
                    if self.streamManager.prepareRecording(settings: settings) {
                        Logger.info("ExpoAudioStreamModule", "prepareRecording: Preparation successful.")
                        promise.resolve(true)
                    } else {
                        Logger.error("ExpoAudioStreamModule", "prepareRecording: streamManager.prepareRecording returned false.")
                        promise.reject("ERROR", "Failed to prepare recording.")
                    }
                    
                case .failure(let error):
                    promise.reject("INVALID_SETTINGS", error.localizedDescription)
                }
            }
        }
        
        /// Pauses audio recording.
        Function("pauseRecording") {
            Logger.debug("ExpoAudioStreamModule", "pauseRecording called.")
            self.streamManager.pauseRecording()
        }
        
        /// Resumes audio recording.
        Function("resumeRecording") {
            Logger.debug("ExpoAudioStreamModule", "resumeRecording called.")
            self.streamManager.resumeRecording()
        }
        
        /// Asynchronously stops audio recording and retrieves the recording result.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the recording result or reject with an error.
        AsyncFunction("stopRecording") { (promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "stopRecording called.")
            
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
                
                Logger.info("ExpoAudioStreamModule", "stopRecording: Recording stopped successfully. fileUri: \(recordingResult.fileUri), size: \(recordingResult.size)")
                promise.resolve(resultDict)
            } else {
                Logger.error("ExpoAudioStreamModule", "stopRecording: streamManager.stopRecording returned nil.")
                promise.reject("ERROR", "Failed to stop recording or no recording in progress.")
            }
        }
        
        /// Asynchronously lists all audio files stored in the document directory.
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the list of audio file URIs or reject with an error.
        /// - Returns: A promise that resolves with the list of audio file URIs or rejects with an error.
        AsyncFunction("listAudioFiles") { (promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "listAudioFiles called.")
            let files = listAudioFiles()
            Logger.debug("ExpoAudioStreamModule", "listAudioFiles returning \(files.count) files.")
            promise.resolve(files)
        }
        
        /// Clears all audio files stored in the document directory.
        Function("clearAudioFiles") {
            Logger.debug("ExpoAudioStreamModule", "clearAudioFiles called.")
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

        /// Trims an audio file to specified start and end times.
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `mode`: Trim mode ('single', 'keep', or 'remove').
        ///     - `startTimeMs`: Start time in milliseconds (for 'single' mode).
        ///     - `endTimeMs`: End time in milliseconds (for 'single' mode).
        ///     - `ranges`: Array of time ranges (for 'keep' and 'remove' modes).
        ///     - `outputFileName`: Optional name for the output file.
        ///     - `outputFormat`: Optional output format configuration.
        ///     - `decodingOptions`: Optional decoding configuration.
        AsyncFunction("trimAudio") { (options: [String: Any], promise: Promise) in
            guard let fileUri = options["fileUri"] as? String,
                  let url = URL(string: fileUri) else {
                promise.reject("INVALID_ARGUMENTS", "Invalid file URI provided")
                return
            }

            let mode = options["mode"] as? String ?? "single"
            let startTimeMs = options["startTimeMs"] as? Double
            let endTimeMs = options["endTimeMs"] as? Double
            let ranges = options["ranges"] as? [[String: Double]]
            let outputFileName = options["outputFileName"] as? String
            let outputFormat = options["outputFormat"] as? [String: Any]
            let decodingOptions = options["decodingOptions"] as? [String: Any] ?? [:]

            // Add detailed logging for filename and format options
            Logger.debug("ExpoAudioStreamModule", "Trim audio request:")
            Logger.debug("ExpoAudioStreamModule", "- Input file: \(fileUri)")
            Logger.debug("ExpoAudioStreamModule", "- Mode: \(mode)")
            Logger.debug("ExpoAudioStreamModule", "- Output filename: \(outputFileName ?? "not specified (will generate UUID)")")
            if let format = outputFormat?["format"] as? String {
                Logger.debug("ExpoAudioStreamModule", "- Output format: \(format)")
            } else {
                Logger.debug("ExpoAudioStreamModule", "- Output format: not specified (will use default)")
            }

            // Input validation based on mode
            switch mode {
            case "single":
                guard let start = startTimeMs, let end = endTimeMs else {
                    promise.reject("INVALID_ARGUMENTS", "startTimeMs and endTimeMs required for 'single' mode")
                    return
                }
                guard start >= 0, end > start else {
                    promise.reject("INVALID_ARGUMENTS", "Invalid time range")
                    return
                }
            case "keep", "remove":
                guard let rangesArray = ranges, !rangesArray.isEmpty else {
                    promise.reject("INVALID_ARGUMENTS", "'ranges' array required for 'keep' or 'remove' mode")
                    return
                }
            default:
                promise.reject("INVALID_MODE", "Mode must be 'single', 'keep', or 'remove'")
                return
            }

            DispatchQueue.global().async {
                do {
                    let audioProcessor = try AudioProcessor(
                        url: url,
                        resolve: { result in promise.resolve(result) },
                        reject: { code, message in promise.reject(code, message) }
                    )

                    let progressCallback: (Float, Int64, Int64) -> Void = { progress, bytesProcessed, totalBytes in
                        self.sendEvent(trimProgressEvent, [
                            "progress": progress,
                            "bytesProcessed": bytesProcessed,
                            "totalBytes": totalBytes
                        ])
                    }

                    let startTime = CACurrentMediaTime()
                    if let result = audioProcessor.trimAudio(
                        mode: mode,
                        startTimeMs: startTimeMs,
                        endTimeMs: endTimeMs,
                        ranges: ranges,
                        outputFileName: outputFileName,
                        outputFormat: outputFormat,
                        decodingOptions: decodingOptions,
                        progressCallback: progressCallback
                    ) {
                        let processingTimeMs = Int((CACurrentMediaTime() - startTime) * 1000)
                        var resultDict = result.toDictionary()
                        resultDict["processingInfo"] = ["durationMs": processingTimeMs]
                        
                        let uri = result.uri
                        Logger.debug("ExpoAudioStreamModule", "Trim completed successfully in \(processingTimeMs)ms")
                        Logger.debug("ExpoAudioStreamModule", "Output file URI: \(uri)")
                        
                        // Verify file exists
                        let fileManager = FileManager.default
                        if let url = URL(string: uri) {
                            let exists = fileManager.fileExists(atPath: url.path)
                            Logger.debug("ExpoAudioStreamModule", "File exists at path \(url.path): \(exists)")
                            
                            // Log filename details
                            Logger.debug("ExpoAudioStreamModule", "Filename: \(url.lastPathComponent)")
                            Logger.debug("ExpoAudioStreamModule", "File extension: \(url.pathExtension.lowercased())")
                            
                            // If format is AAC, ensure we're using the correct extension and MIME type
                            if let format = outputFormat?["format"] as? String, 
                               format.lowercased() == "aac" {
                                
                                Logger.debug("ExpoAudioStreamModule", "AAC format detected - ensuring correct metadata")
                                
                                // For AAC format, ensure we're using the correct extension and MIME type
                                if url.pathExtension.lowercased() == "m4a" {
                                    Logger.debug("ExpoAudioStreamModule", "File has correct m4a extension for AAC audio")
                                    
                                    // Just update the MIME type in the result to ensure correct playback
                                    if var compression = resultDict["compression"] as? [String: Any] {
                                        compression["mimeType"] = "audio/mp4"
                                        resultDict["compression"] = compression
                                    }
                                    
                                    resultDict["mimeType"] = "audio/mp4"
                                    resultDict["actualFormat"] = "m4a"
                                } else {
                                    Logger.debug("ExpoAudioStreamModule", "Warning: AAC format should use .m4a extension, but found .\(url.pathExtension.lowercased())")
                                }
                            }
                        }
                        
                        promise.resolve(resultDict)
                    } else {
                        Logger.debug("ExpoAudioStreamModule", "Failed to trim audio")
                        promise.reject("TRIM_ERROR", "Failed to trim audio")
                    }
                } catch {
                    Logger.debug("ExpoAudioStreamModule", "Failed to initialize audio processor: \(error.localizedDescription)")
                    promise.reject("PROCESSING_ERROR", "Failed to initialize audio processor: \(error.localizedDescription)")
                }
            }
        }
        
        /// Extracts raw PCM audio data from a file with time or byte range support
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file
        ///     - `startTimeMs`: Optional start time in milliseconds
        ///     - `endTimeMs`: Optional end time in milliseconds
        ///     - `position`: Optional byte position
        ///     - `length`: Optional byte length
        ///     - `includeNormalizedData`: Boolean to include normalized audio data in [-1, 1] range
        ///     - `includeWavHeader`: Boolean to include WAV header in the PCM data
        ///     - `decodingOptions`: Decoding configuration
        ///     - `includeBase64Data`: Boolean to include base64 encoded string representation of the audio data
        ///     - `computeChecksum`: Boolean to compute and include CRC32 checksum of the PCM data
        AsyncFunction("extractAudioData") { (options: [String: Any], promise: Promise) in
            guard let fileUri = options["fileUri"] as? String,
                  let url = URL(string: fileUri) else {
                promise.reject("INVALID_ARGUMENTS", "Invalid file URI provided")
                return
            }

            // Get time or byte range options
            let startTimeMs = options["startTimeMs"] as? Double
            let endTimeMs = options["endTimeMs"] as? Double
            let position = options["position"] as? Int
            let length = options["length"] as? Int
            let includeWavHeader = options["includeWavHeader"] as? Bool ?? false
            let includeNormalizedData = options["includeNormalizedData"] as? Bool ?? false
            let decodingOptions = options["decodingOptions"] as? [String: Any] ?? [:]
            let includeBase64Data = options["includeBase64Data"] as? Bool ?? false

            // Validate that we have either time range or byte range, but not both and not neither
            let hasTimeRange = startTimeMs != nil && endTimeMs != nil
            let hasByteRange = position != nil && length != nil

            guard hasTimeRange || hasByteRange else {
                promise.reject("INVALID_ARGUMENTS", "Must specify either time range (startTimeMs, endTimeMs) or byte range (position, length)")
                return
            }

            guard !(hasTimeRange && hasByteRange) else {
                promise.reject("INVALID_ARGUMENTS", "Cannot specify both time range and byte range")
                return
            }

            do {
                let audioFile = try AVAudioFile(forReading: url)
                let format = audioFile.processingFormat
                let sampleRate = format.sampleRate
                let channels = Int(format.channelCount)
                let bitDepth = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16

                // Calculate frame positions
                let startFrame: AVAudioFramePosition
                let endFrame: AVAudioFramePosition

                if hasTimeRange {
                    startFrame = AVAudioFramePosition(startTimeMs! * sampleRate / 1000.0)
                    endFrame = AVAudioFramePosition(endTimeMs! * sampleRate / 1000.0)
                } else {
                    // Convert byte position to frame position
                    let bytesPerFrame = Int64(channels * (bitDepth / 8))
                    startFrame = AVAudioFramePosition(position!) / bytesPerFrame
                    endFrame = startFrame + (AVAudioFramePosition(length!) / bytesPerFrame)
                }

                // Validate frame range
                guard startFrame >= 0 && endFrame <= audioFile.length && startFrame < endFrame else {
                    promise.reject("INVALID_RANGE", "Invalid range specified")
                    return
                }

                let frameCount = AVAudioFrameCount(endFrame - startFrame)
                
                
                // Pass both options separately - normalizeAudio from decodingOptions, and includeNormalizedData as is
                let decodingConfig = DecodingConfig.fromDictionary(decodingOptions)
                
                let (pcmData, normalizedData, base64Data) = try extractRawAudioData(
                    from: url,
                    startFrame: startFrame,
                    frameCount: frameCount,
                    format: format,
                    decodingConfig: decodingConfig,
                    includeNormalizedData: includeNormalizedData,
                    includeBase64Data: includeBase64Data
                )

                var resultDict: [String: Any] = [:]
                
                if includeWavHeader {
                    // Create WAV header and prepend it to the PCM data
                    let wavData = createWavHeader(
                        pcmData: pcmData,
                        sampleRate: Int(sampleRate),
                        channels: channels,
                        bitDepth: bitDepth
                    )
                    resultDict["pcmData"] = wavData
                    resultDict["hasWavHeader"] = true
                } else {
                    resultDict["pcmData"] = pcmData
                    resultDict["hasWavHeader"] = false
                }
                
                // Add the rest of the data
                resultDict["sampleRate"] = Int(sampleRate)
                resultDict["channels"] = channels
                resultDict["bitDepth"] = bitDepth
                resultDict["durationMs"] = Int(Double(frameCount) * 1000.0 / sampleRate)
                resultDict["format"] = "pcm_\(bitDepth)bit"
                resultDict["samples"] = Int(frameCount) * channels
                
                // Add normalized data if requested, regardless of normalization setting
                if includeNormalizedData {
                    resultDict["normalizedData"] = normalizedData
                }
                
                // Add checksum if requested
                if options["computeChecksum"] as? Bool == true {
                    let checksum = calculateCRC32(data: pcmData)
                    resultDict["checksum"] = Int(checksum)
                    
                    Logger.debug("ExpoAudioStreamModule", "Computed CRC32 checksum: \(checksum)")
                }
                
                if let includeBase64Data = options["includeBase64Data"] as? Bool, includeBase64Data {
                    resultDict["base64Data"] = base64Data
                }
                
                promise.resolve(resultDict)

            } catch {
                promise.reject("PROCESSING_ERROR", "Failed to process audio file: \(error.localizedDescription)")
            }
        }
        
        /// Extracts mel spectrogram data from a file.
        ///
        /// - Parameters:
        ///   - options: A dictionary containing:
        ///     - `fileUri`: The URI of the audio file.
        ///     - `pointsPerSecond`: The number of data points to extract per second of audio.
        ///   - promise: A promise to resolve with the extracted mel spectrogram data or reject with an error.
        /// - Returns: Promise to be resolved with mel spectrogram data.
        AsyncFunction("extractMelSpectrogram") { (options: [String: Any], promise: Promise) in
            // This is a placeholder implementation that will be fully implemented later
            // Currently, mel spectrogram extraction is only available on Android
            promise.reject(
                "UNSUPPORTED_PLATFORM", 
                "Mel spectrogram extraction is currently only available on Android and is experimental"
            )
        }
        
        /// Gets available audio input devices with an optional refresh parameter
        /// - Parameters:
        ///   - options: Optional dictionary containing a refresh parameter
        ///   - promise: A promise to resolve with a list of available audio input devices
        AsyncFunction("getAvailableInputDevices") { (options: [String: Any]?, promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "getAvailableInputDevices called. Refresh: \(options?["refresh"] ?? false)")
            if let options = options, let refresh = options["refresh"] as? Bool, refresh {
                Logger.debug("ExpoAudioStreamModule", "Forcing refresh of audio devices")
                _ = self.deviceManager.forceRefreshAudioSession()
            }
            
            // Call the device manager with the promise
            self.deviceManager.getAvailableInputDevices(promise: promise)
        }
        
        /// Refreshes the audio session to detect newly connected devices
        /// - Returns: Boolean indicating success
        Function("refreshAudioDevices") {
            Logger.debug("ExpoAudioStreamModule", "refreshAudioDevices called.")
            let success = self.deviceManager.forceRefreshAudioSession()
            Logger.debug("ExpoAudioStreamModule", "refreshAudioDevices result: \(success)")
            return ["success": success]
        }
        
        /// Gets the currently selected audio input device
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with the currently selected audio input device
        AsyncFunction("getCurrentInputDevice") { (promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "getCurrentInputDevice called.")
            self.deviceManager.getCurrentInputDevice(promise: promise)
        }
        
        /// Selects a specific audio input device for recording
        ///
        /// - Parameters:
        ///   - deviceId: The ID of the device to select
        ///   - promise: A promise to resolve with boolean indicating success
        AsyncFunction("selectInputDevice") { (deviceId: String, promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "selectInputDevice called with ID: \(deviceId)")
            self.deviceManager.selectInputDevice(deviceId, promise: promise)
            // Update the audio recorder if recording is in progress or prepared
            if self.streamManager.isRecording || self.streamManager.isPrepared {
                Logger.debug("ExpoAudioStreamModule", "selectInputDevice: Calling updateAudioSessionWithCurrentSettings because recording/prepared.")
                self.streamManager.updateAudioSessionWithCurrentSettings()
            } else {
                Logger.debug("ExpoAudioStreamModule", "selectInputDevice: Not calling updateAudioSessionWithCurrentSettings because not recording/prepared.")
            }
        }
        
        /// Resets to the default audio input device
        ///
        /// - Parameters:
        ///   - promise: A promise to resolve with boolean indicating success
        AsyncFunction("resetToDefaultDevice") { (promise: Promise) in
            Logger.debug("ExpoAudioStreamModule", "resetToDefaultDevice called.")
            self.deviceManager.resetToDefaultDevice { success, error in
                if success {
                    if self.streamManager.isRecording || self.streamManager.isPrepared {
                        Logger.debug("ExpoAudioStreamModule", "resetToDefaultDevice: Calling updateAudioSessionWithCurrentSettings because recording/prepared.")
                        self.streamManager.updateAudioSessionWithCurrentSettings()
                    } else {
                        Logger.debug("ExpoAudioStreamModule", "resetToDefaultDevice: Not calling updateAudioSessionWithCurrentSettings because not recording/prepared.")
                    }
                    promise.resolve(true)
                } else {
                    Logger.error("ExpoAudioStreamModule", "resetToDefaultDevice failed: \(error?.localizedDescription ?? "Unknown error")")
                    promise.reject("DEVICE_ERROR", "Failed to reset to default device: \(error?.localizedDescription ?? "Unknown error")")
                }
            }
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveInterruption info: [String: Any]) {
        Logger.debug("ExpoAudioStreamModule", "Delegate: didReceiveInterruption: \(info)")
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
        Logger.debug("ExpoAudioStreamModule", "Delegate: didPauseRecording")
        sendEvent(recordingInterruptedEvent, [
            "reason": "userPaused",
            "isPaused": true,
            "timestamp": pauseTime.timeIntervalSince1970 * 1000
        ])
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didResumeRecording resumeTime: Date) {
        Logger.debug("ExpoAudioStreamModule", "Delegate: didResumeRecording")
        sendEvent(recordingInterruptedEvent, [
            "reason": "userResumed",
            "isPaused": false,
            "timestamp": resumeTime.timeIntervalSince1970 * 1000
        ])
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didUpdateNotificationState isPaused: Bool) {
        Logger.debug("ExpoAudioStreamModule", "Delegate: didUpdateNotificationState: isPaused=\(isPaused)")
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
        // Reduce log frequency or detail for this potentially high-frequency event
        // Logger.debug("[ExpoAudioStreamModule] Delegate: didReceiveAudioData: size=\(data.count), totalSize=\(totalDataSize)")
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
            Logger.debug("ExpoAudioStreamModule", "Failed to request notification permissions: \(error)")
            return false
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveProcessingResult result: AudioAnalysisData?) {
        if let data = result {
            Logger.debug("ExpoAudioStreamModule", "Delegate: didReceiveProcessingResult: Received \(data.dataPoints.count) data points.")
        } else {
            Logger.debug("ExpoAudioStreamModule", "Delegate: didReceiveProcessingResult: Received nil result.")
        }
        let resultDict = result?.toDictionary() ?? [:] 
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
                    print("ExpoAudioStreamModule", "Removed file at:", fileURL.path)
                } catch {
                    print("ExpoAudioStreamModule", "Error removing file at \(fileURL.path):", error.localizedDescription)
                }
            } else {
                print("ExpoAudioStreamModule", "Invalid URL string: \(fileURLString)")
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
            "hnr": options["hnr"] as? Bool ?? false,
            "melSpectrogram": options["melSpectrogram"] as? Bool ?? false,
            "spectralContrast": options["spectralContrast"] as? Bool ?? false,
            "tonnetz": options["tonnetz"] as? Bool ?? false,
            "pitch": options["pitch"] as? Bool ?? false,
            "crc32": options["crc32"] as? Bool ?? false
        ]
    }
    
    /// Lists all audio files stored in the document directory.
    ///
    /// - Returns: An array of file URIs as strings.
    func listAudioFiles() -> [String] {
        guard let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false) else {
            print("ExpoAudioStreamModule", "Failed to access document directory.")
            return []
        }
        
        do {
            let files = try FileManager.default.contentsOfDirectory(at: documentDirectory, includingPropertiesForKeys: nil)
            let audioFiles = files.filter { $0.pathExtension == "wav" }.map { $0.absoluteString }
            return audioFiles
        } catch {
            print("ExpoAudioStreamModule", "Error listing audio files:", error.localizedDescription)
            return []
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didFailWithError error: String) {
        Logger.error("ExpoAudioStreamModule", "Delegate: didFailWithError: \(error)")
        sendEvent(errorEvent, [ "message": error ])
    }
}
