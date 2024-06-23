//
//  AudioStreamManager.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 21/4/2024.
//

import Foundation
import AVFoundation
import Accelerate

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
    
    weak var delegate: AudioStreamManagerDelegate?  // Define the delegate here
    
    /// Initializes the AudioStreamManager
    override init() {
        super.init()
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
            // Pause your audio recording
        } else if type == .ended {
            if let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) {
                    // Resume your audio recording
                    Logger.debug("Resume audio recording \(recordingUUID!)")
                    try? AVAudioSession.sharedInstance().setActive(true)
                }
            }
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
        let durationInMilliseconds = Int(durationInSeconds * 1000)
        
        return [
            "duration": durationInMilliseconds,
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
        
        let session = AVAudioSession.sharedInstance()
        do {
            Logger.debug("Debug: Configuring audio session with sample rate: \(settings.sampleRate) Hz")
            
            // Create an audio format with the desired sample rate
            let desiredFormat = AVAudioFormat(commonFormat: commonFormat, sampleRate: newSettings.sampleRate, channels: UInt32(newSettings.numberOfChannels), interleaved: true)
            
            // Check if the input node supports the desired format
            let inputNode = audioEngine.inputNode
            let hardwareFormat = inputNode.inputFormat(forBus: 0)
            if hardwareFormat.sampleRate != newSettings.sampleRate {
                Logger.debug("Debug: Preferred sample rate not supported. Falling back to hardware sample rate \(session.sampleRate).")
                newSettings.sampleRate = session.sampleRate
            }
            
            try session.setCategory(.playAndRecord)
            try session.setMode(.default)
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
        
        do {
            startTime = Date()
            try audioEngine.start()
            isRecording = true
            Logger.debug("Debug: Recording started successfully.")
            return StartRecordingResult(
                fileUri: recordingFileURL!.path,
                mimeType: mimeType,
                channels: settings.numberOfChannels,
                bitDepth: settings.bitDepth,
                sampleRate: settings.sampleRate
            )
        } catch {
            Logger.debug("Error: Could not start the audio engine: \(error.localizedDescription)")
            isRecording = false
            return nil
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
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        isRecording = false
        
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
            
            // Update the WAV header with the correct file size
            updateWavHeader(fileURL: fileURL, totalDataSize: fileSize - 44) // Subtract the header size to get audio data size
            
            let result = RecordingResult(
                fileUri: fileURL.absoluteString,
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
