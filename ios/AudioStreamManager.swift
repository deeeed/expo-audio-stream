//
//  AudioStreamManager.swift
//  ExpoAudioStream
//
//  Created by Arthur Breton on 21/4/2024.
//

import Foundation
import AVFoundation

struct RecordingSettings {
    var sampleRate: Double = 44100.0
    var numberOfChannels: Int = 1
    var bitDepth: Int = 16
}

protocol AudioStreamManagerDelegate: AnyObject {
    func didUpdateRecordingStatus(_ manager: AudioStreamManager, status: String)
    func didEmitAudioData(_ manager: AudioStreamManager, data: Data)
    func didReceiveBuffer(_ manager: AudioStreamManager, buffer: AVAudioPCMBuffer, atTime: AVAudioTime)
}

class AudioStreamManager: NSObject, AVAudioRecorderDelegate, AVAudioPlayerDelegate {
    private var audioRecorder: AVAudioRecorder?
    private let audioSession = AVAudioSession.sharedInstance()
    private var recordingFileURL: URL?
    private var recordingStartTime: Date?
    private var isRecording: Bool { audioRecorder?.isRecording ?? false }
    private var isPaused: Bool = false
    private var pausedTime: TimeInterval = 0
    private var totalRecordedTime: TimeInterval = 0
    private var totalDataSize: Int64 = 0
    private var emitInterval: TimeInterval = 1.0  // Default interval
    private var emitTimer: Timer?
    weak var delegate: AudioStreamManagerDelegate?
    
    
    override init() {
        super.init()
        configureAudioSession()
    }
    
    private func configureAudioSession() {
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default)
            try audioSession.setActive(true)
            print("Audio session configured successfully.")
            
        } catch {
            print("Failed to set up audio session: \(error)")
        }
    }
    
    
    func startEmittingAudioData(interval: TimeInterval = 1.0) {
        emitTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.emitAudioData()
        }
    }
    
    private func emitAudioData() {
        guard let url = recordingFileURL, let data = try? Data(contentsOf: url) else { return }
        delegate?.didEmitAudioData(self, data: data)
    }
    
    func listAudioFiles() -> [URL] {
        let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        let files = try? FileManager.default.contentsOfDirectory(at: documentDirectory!, includingPropertiesForKeys: nil)
        return files?.filter { $0.pathExtension == "pcm" } ?? []
    }
    
    func clearAudioFiles() {
        let files = listAudioFiles()
        files.forEach { try? FileManager.default.removeItem(at: $0) }
    }
    
    
    func checkMicrophonePermission(completion: @escaping (Bool) -> Void) {
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
    
    func startRecording(settings: RecordingSettings, completion: @escaping (Bool, Error?) -> Void) {
        checkMicrophonePermission { [weak self] granted in
            guard granted else {
                completion(false, NSError(domain: "AudioStreamManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "Microphone permission not granted"]))
                return
            }
            
            guard let self = self, !self.isRecording else {
                completion(false, NSError(domain: "AudioStreamManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Recording is already in progress"]))
                return
            }
            
            let filename = "\(UUID().uuidString).pcm"
            do {
                let documentDirectory = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                self.recordingFileURL = documentDirectory.appendingPathComponent(filename)
                
                let recorderSettings = [
                    AVFormatIDKey: NSNumber(value: kAudioFormatLinearPCM),
                    AVSampleRateKey: NSNumber(value: settings.sampleRate),
                    AVNumberOfChannelsKey: NSNumber(value: settings.numberOfChannels),
                    AVLinearPCMBitDepthKey: NSNumber(value: settings.bitDepth),
                    AVLinearPCMIsBigEndianKey: false,
                    AVLinearPCMIsFloatKey: false
                ] as [String : Any]
                
                self.audioRecorder = try AVAudioRecorder(url: self.recordingFileURL!, settings: recorderSettings)
                self.audioRecorder?.delegate = self
                self.audioRecorder?.record()
                
                self.recordingStartTime = Date() // Set start time
                print("Recording started at URL: \(self.recordingFileURL!.absoluteString)")
                completion(true, nil)
            } catch {
                completion(false, error)
            }
        }
    }
    
    func status() -> [String: Any] {
        let currentTime = Date()
        var currentRecordedTime: TimeInterval = 0
        if let startTime = recordingStartTime {
            currentRecordedTime = currentTime.timeIntervalSince(startTime) - pausedTime
        }
        
        // Adjust the total recorded time if recording is stopped
        if !isRecording {
            totalRecordedTime = currentRecordedTime
        }
        
        // Calculate the size of the recorded file
        var fileSize: Int64 = 0
        if let url = recordingFileURL {
            do {
                let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
                fileSize = attributes[FileAttributeKey.size] as? Int64 ?? 0
            } catch {
                print("Error getting file size: \(error)")
            }
        }
        
        return [
            "duration": totalRecordedTime,
            "isRecording": isRecording,
            "isPaused": isPaused,
            "size": fileSize,
            "interval": emitInterval
        ]
    }
    
    func pauseRecording() {
        audioRecorder?.pause()
        pausedTime += Date().timeIntervalSince(recordingStartTime ?? Date())
        print("Recording paused. Total paused time: \(pausedTime) seconds")
    }
    
    
    func stopRecording() {
        guard let startTime = recordingStartTime else { return }
        
        audioRecorder?.stop()
        audioRecorder = nil
        let recordedTime = Date().timeIntervalSince(startTime)
        print("Recording stopped. Total recorded time: \(recordedTime) seconds")
    }
}
