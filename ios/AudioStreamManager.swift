//
//  AudioStreamManager.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 21/4/2024.
//

import Foundation
import AVFoundation

struct RecordingSettings {
    var sampleRate: Double
    var numberOfChannels: Int = 1
    var bitDepth: Int = 16
}

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


struct RecordingResult {
    var fileUri: String
    var mimeType: String
    var duration: Int64
    var size: Int64
    var channels: Int
    var bitDepth: Int
    var sampleRate: Double
}

struct StartRecordingResult {
    var fileUri: String
    var mimeType: String
    var channels: Int
    var bitDepth: Int
    var sampleRate: Double
}

protocol AudioStreamManagerDelegate: AnyObject {
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveAudioData data: Data, recordingTime: TimeInterval, totalDataSize: Int64)
}

enum AudioStreamError: Error {
    case audioSessionSetupFailed(String)
    case fileCreationFailed(URL)
    case audioProcessingError(String)
}

class AudioStreamManager: NSObject {
    private let audioEngine = AVAudioEngine()
    private var inputNode: AVAudioInputNode {
        return audioEngine.inputNode
    }
    internal var recordingFileURL: URL?
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
    
    weak var delegate: AudioStreamManagerDelegate?  // Define the delegate here
    
    override init() {
        super.init()
    }
    
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
    
    func startRecording(settings: RecordingSettings, intervalMilliseconds: Int)  -> StartRecordingResult? {
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
                  Logger.debug("Debug: Preferred sample rate not supported. Falling back to hardware sample rate.")
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
    
    func stopRecording() -> RecordingResult? {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        isRecording = false
        
        guard let fileURL = recordingFileURL, let startTime = startTime, let settings = recordingSettings else {
            print("Recording or file URL is nil.")
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
            print("Failed to fetch file attributes: \(error)")
            return nil
        }
    }
    
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
            print("Error updating WAV header: \(error)")
        }
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer, fileURL: URL) {
        guard let fileHandle = try? FileHandle(forWritingTo: fileURL) else {
            print("Failed to open file handle for URL: \(fileURL)")
            return
        }
        
        let audioData = buffer.audioBufferList.pointee.mBuffers
        guard let bufferData = audioData.mData else {
            print("Buffer data is nil.")
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
                //                print("Emitting data: Recording time \(recordingTime) seconds, Data size \(totalDataSize) bytes")
                self.delegate?.audioStreamManager(self, didReceiveAudioData: accumulatedData, recordingTime: recordingTime, totalDataSize: totalDataSize)
                self.lastEmissionTime = currentTime // Update last emission time
                self.lastEmittedSize = totalDataSize
                accumulatedData.removeAll() // Reset accumulated data after emission
            }
        }
    }
    
}
