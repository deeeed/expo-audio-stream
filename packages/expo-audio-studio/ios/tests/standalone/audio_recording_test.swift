#!/usr/bin/env swift

import Foundation
import AVFoundation

// Simple test framework
struct TestResult {
    let name: String
    let passed: Bool
    let message: String
}

class AudioRecordingTest {
    var results: [TestResult] = []
    let testDir: URL
    var audioRecorder: AVAudioRecorder?
    
    init() {
        // Create a temporary directory for test files
        let tempDir = FileManager.default.temporaryDirectory
        testDir = tempDir.appendingPathComponent("audio_recording_test_\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: testDir, withIntermediateDirectories: true)
    }
    
    deinit {
        // Clean up test directory
        try? FileManager.default.removeItem(at: testDir)
    }
    
    func assert(_ condition: Bool, _ message: String, file: String = #file, line: Int = #line) {
        let testName = "\(file.split(separator: "/").last ?? ""):\(line)"
        results.append(TestResult(name: testName, passed: condition, message: message))
        if !condition {
            print("❌ FAILED: \(message) at \(testName)")
        }
    }
    
    func assertEqual<T: Equatable>(_ a: T, _ b: T, _ message: String = "", file: String = #file, line: Int = #line) {
        let passed = a == b
        let msg = message.isEmpty ? "\(a) should equal \(b)" : message
        assert(passed, msg, file: file, line: line)
    }
    
    func run() {
        print("🧪 Running iOS Audio Recording Tests...\n")
        
        // Request permission first (in a real app)
        setupAudioSession()
        
        testBasicWAVRecording()
        testCompressedRecording()
        testRecordingSettings()
        testFileValidation()
        
        // Print summary
        let passed = results.filter { $0.passed }.count
        let total = results.count
        
        print("\n📊 Test Summary:")
        print("   Total: \(total)")
        print("   Passed: \(passed)")
        print("   Failed: \(total - passed)")
        
        if passed == total {
            print("\n✅ All tests passed!")
        } else {
            print("\n❌ Some tests failed!")
            exit(1)
        }
    }
    
    func setupAudioSession() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .default)
            try session.setActive(true)
            print("✓ Audio session configured")
        } catch {
            print("⚠️  Failed to setup audio session: \(error)")
        }
        #else
        print("✓ Audio session setup skipped (macOS)")
        #endif
    }
    
    func testBasicWAVRecording() {
        print("\nTesting basic WAV recording...")
        
        let wavURL = testDir.appendingPathComponent("test_recording.wav")
        
        // Configure recording settings for WAV
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 2,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]
        
        do {
            // Create recorder
            audioRecorder = try AVAudioRecorder(url: wavURL, settings: settings)
            assert(audioRecorder != nil, "Recorder should be created")
            
            // Prepare and record
            let prepared = audioRecorder!.prepareToRecord()
            assert(prepared, "Recorder should prepare successfully")
            
            let started = audioRecorder!.record()
            assert(started, "Recording should start")
            
            // Record for a short time
            Thread.sleep(forTimeInterval: 0.5)
            
            audioRecorder!.stop()
            
            // Verify file exists and has content
            assert(FileManager.default.fileExists(atPath: wavURL.path), "WAV file should exist")
            
            let attributes = try FileManager.default.attributesOfItem(atPath: wavURL.path)
            let fileSize = attributes[.size] as? Int64 ?? 0
            assert(fileSize > 44, "WAV file should have content beyond header")
            
            // Verify WAV header
            let data = try Data(contentsOf: wavURL)
            let riffHeader = String(data: data[0..<4], encoding: .ascii)
            assertEqual(riffHeader, "RIFF", "Should have RIFF header")
            
            let waveFormat = String(data: data[8..<12], encoding: .ascii)
            assertEqual(waveFormat, "WAVE", "Should have WAVE format")
            
            print("✓ Basic WAV recording test completed")
            
        } catch {
            assert(false, "Recording failed: \(error)")
        }
    }
    
    func testCompressedRecording() {
        print("\nTesting compressed recording (AAC)...")
        
        let aacURL = testDir.appendingPathComponent("test_recording.m4a")
        
        // Configure recording settings for AAC
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 2,
            AVEncoderBitRateKey: 128000,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        
        do {
            // Create recorder
            audioRecorder = try AVAudioRecorder(url: aacURL, settings: settings)
            assert(audioRecorder != nil, "AAC recorder should be created")
            
            // Record
            let started = audioRecorder!.record()
            assert(started, "AAC recording should start")
            
            Thread.sleep(forTimeInterval: 0.5)
            audioRecorder!.stop()
            
            // Verify file
            assert(FileManager.default.fileExists(atPath: aacURL.path), "AAC file should exist")
            
            let attributes = try FileManager.default.attributesOfItem(atPath: aacURL.path)
            let fileSize = attributes[.size] as? Int64 ?? 0
            assert(fileSize > 0, "AAC file should have content")
            
            // Verify it's a valid audio file by loading it
            let audioFile = try AVAudioFile(forReading: aacURL)
            assert(audioFile.length > 0, "AAC file should have audio frames")
            assertEqual(Int(audioFile.fileFormat.sampleRate), 44100, "Sample rate should match")
            
            print("✓ Compressed recording test completed")
            
        } catch {
            assert(false, "AAC recording failed: \(error)")
        }
    }
    
    func testRecordingSettings() {
        print("\nTesting various recording settings...")
        
        // Test different sample rates
        let sampleRates = [8000.0, 16000.0, 44100.0, 48000.0]
        
        for sampleRate in sampleRates {
            let url = testDir.appendingPathComponent("test_\(Int(sampleRate))hz.wav")
            
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatLinearPCM),
                AVSampleRateKey: sampleRate,
                AVNumberOfChannelsKey: 1,
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsBigEndianKey: false,
                AVLinearPCMIsFloatKey: false
            ]
            
            do {
                let recorder = try AVAudioRecorder(url: url, settings: settings)
                assert(recorder.prepareToRecord(), "Should prepare at \(sampleRate)Hz")
                
                // Verify settings were applied
                let appliedSettings = recorder.settings
                let appliedRate = appliedSettings[AVSampleRateKey] as? Double ?? 0
                assertEqual(appliedRate, sampleRate, "Sample rate should be \(sampleRate)")
                
            } catch {
                assert(false, "Failed to create recorder at \(sampleRate)Hz: \(error)")
            }
        }
        
        print("✓ Recording settings test completed")
    }
    
    func testFileValidation() {
        print("\nTesting file validation and properties...")
        
        // Create a test recording
        let url = testDir.appendingPathComponent("validation_test.wav")
        let duration = 1.0 // 1 second
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]
        
        do {
            audioRecorder = try AVAudioRecorder(url: url, settings: settings)
            audioRecorder!.record()
            
            // Record for the specified duration
            Thread.sleep(forTimeInterval: duration)
            audioRecorder!.stop()
            
            // Load and validate the file
            let audioFile = try AVAudioFile(forReading: url)
            
            // Check duration (should be close to 1 second)
            let recordedDuration = Double(audioFile.length) / audioFile.fileFormat.sampleRate
            assert(abs(recordedDuration - duration) < 0.5, "Duration should be close to \(duration)s (got \(recordedDuration)s)")
            
            // Check file format
            assertEqual(Int(audioFile.fileFormat.sampleRate), 16000, "Sample rate should be 16kHz")
            assertEqual(Int(audioFile.fileFormat.channelCount), 1, "Should be mono")
            
            // Calculate expected file size
            let expectedDataSize = Int(16000 * duration * 2) // 16kHz * 1s * 2 bytes per sample
            let expectedFileSize = expectedDataSize + 44 // Plus WAV header
            
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            let actualFileSize = attributes[.size] as? Int64 ?? 0
            
            // Allow some tolerance (macOS may add extra metadata)
            assert(abs(Int(actualFileSize) - expectedFileSize) < 5000, 
                   "File size should be close to expected (\(actualFileSize) vs \(expectedFileSize))")
            
            print("✓ File validation test completed")
            
        } catch {
            assert(false, "File validation failed: \(error)")
        }
    }
}

// Run the tests
let test = AudioRecordingTest()
test.run() 