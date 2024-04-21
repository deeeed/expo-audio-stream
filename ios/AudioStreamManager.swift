//
//  AudioStreamManager.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 21/4/2024.
//

import Foundation
import AVFoundation

struct RecordingSettings {
    var sampleRate: Double = 48000.0
    var numberOfChannels: Int = 1
    var bitDepth: Int = 16
}

protocol AudioStreamManagerDelegate: AnyObject {
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveAudioData data: Data, recordingTime: TimeInterval, totalDataSize: Int64)
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
    internal var recordingUUID: UUID?
    weak var delegate: AudioStreamManagerDelegate?  // Define the delegate here
    
    override init() {
        super.init()
        configureAudioSession()
    }
    
    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .default)
            try session.setActive(true)
            print("Audio session configured successfully.")
        } catch {
            print("Failed to set up audio session: \(error.localizedDescription)")
        }
    }
    
    private func createRecordingFile() -> URL? {
        let documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        recordingUUID = UUID()
        let fileName = "\(recordingUUID!.uuidString).pcm"
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        fileManager.createFile(atPath: fileURL.path, contents: nil, attributes: nil)
        print("Recording file created at:", fileURL.path)

        return fileURL
    }
    
    func getStatus() -> [String: Any] {
        let currentTime = Date()
        let totalRecordedTime = startTime != nil ? Int(currentTime.timeIntervalSince(startTime!)) - pausedDuration : 0
        return [
            "duration": totalRecordedTime,
            "isRecording": isRecording,
            "isPaused": isPaused,
            "size": totalDataSize,
            "interval": emissionInterval
        ]
    }
    
    func startRecording(settings: RecordingSettings, intervalMilliseconds: Int) {
        guard !isRecording else { return }
        
        emissionInterval = max(100.0, Double(intervalMilliseconds)) / 1000.0 // Convert ms to seconds, ensure minimum of 100 ms
        lastEmissionTime = Date() // Reset last emission time
        
        // Configure audio session for the desired sample rate and channel count
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setPreferredSampleRate(settings.sampleRate)
            try session.setPreferredIOBufferDuration(1024 / settings.sampleRate)
            try session.setCategory(.playAndRecord)
            try session.setActive(true)
        } catch {
            print("Failed to set up audio session: \(error)")
            return
        }
        
        // Create an audio format with specified or default settings
        let channelLayout = AVAudioChannelLayout(layoutTag: settings.numberOfChannels == 1 ? kAudioChannelLayoutTag_Mono : kAudioChannelLayoutTag_Stereo) ?? AVAudioChannelLayout(layoutTag: kAudioChannelLayoutTag_Stereo)!
        let errorFormat = AVAudioFormat(standardFormatWithSampleRate: settings.sampleRate, channelLayout: channelLayout)
        
        // Create an audio format with default settings
        let format = audioEngine.inputNode.inputFormat(forBus: 0)
        
        // Debugging statements
        print("Desired Sample Rate:", settings.sampleRate)
        print("Channel Layout:", channelLayout.description)
        print("Created Audio Format Sample Rate: \(format.sampleRate) channelLayout: \(format.channelLayout) channelCount: \(format.channelCount)")
        print("Error Audio Format Sample Rate: \(errorFormat.sampleRate) channel Layout: \(errorFormat.channelLayout) channelCount: \(errorFormat.channelCount)")
        print("Hardware Format Sample Rate:", audioEngine.inputNode.inputFormat(forBus: 0).sampleRate)
        
        // Install tap on the input node and handle audio buffer
        audioEngine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: errorFormat) { [weak self] (buffer, time) in
            guard let self = self, let fileURL = self.recordingFileURL else { return }
            self.processAudioBuffer(buffer, fileURL: fileURL)
        }

        recordingFileURL = createRecordingFile()
        do {
            startTime = Date()
            try audioEngine.start()
            isRecording = true
        } catch {
            print("Could not start the audio engine: \(error)")
            isRecording = false
        }
    }
    
    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        isRecording = false
        recordingFileURL = nil  // Optionally reset or handle the finalization of the file
        print("Recording stopped.")

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
        let data = Data(bytes: bufferData, count: Int(audioData.mDataByteSize))
        
        fileHandle.seekToEndOfFile()
        fileHandle.write(data)
        fileHandle.closeFile()
        
        totalDataSize += Int64(data.count)
        
        let currentTime = Date()
        if let lastEmissionTime = lastEmissionTime, currentTime.timeIntervalSince(lastEmissionTime) >= emissionInterval {
            if let startTime = startTime {
                let recordingTime = currentTime.timeIntervalSince(startTime)
                print("Emitting data: Recording time \(recordingTime) seconds, Data size \(totalDataSize) bytes")
                print("delegate", self.delegate)
                self.delegate?.audioStreamManager(self, didReceiveAudioData: data, recordingTime: recordingTime, totalDataSize: totalDataSize)
                self.lastEmissionTime = currentTime // Update last emission time
                self.lastEmittedSize = totalDataSize
            }
        }
    }
    
}
