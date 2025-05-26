#!/usr/bin/env swift

import Foundation
import AVFoundation

// Simple test framework
struct TestResult {
    let name: String
    let passed: Bool
    let message: String
}

class AudioStreamingTest {
    var results: [TestResult] = []
    let testDir: URL
    var audioEngine: AVAudioEngine?
    var inputNode: AVAudioInputNode?
    
    init() {
        // Create a temporary directory for test files
        let tempDir = FileManager.default.temporaryDirectory
        testDir = tempDir.appendingPathComponent("audio_streaming_test_\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: testDir, withIntermediateDirectories: true)
    }
    
    deinit {
        // Clean up
        audioEngine?.stop()
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
        print("🧪 Running iOS Audio Streaming Tests...\n")
        
        testAudioEngineSetup()
        testRealtimeStreaming()
        testBufferProcessing()
        testMultipleFormats()
        
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
    
    func testAudioEngineSetup() {
        print("Testing AVAudioEngine setup...")
        
        audioEngine = AVAudioEngine()
        inputNode = audioEngine!.inputNode
        
        assert(audioEngine != nil, "Audio engine should be created")
        assert(inputNode != nil, "Input node should be available")
        
        // Check input format
        let inputFormat = inputNode!.inputFormat(forBus: 0)
        assert(inputFormat.sampleRate > 0, "Input format should have valid sample rate")
        assert(inputFormat.channelCount > 0, "Input format should have channels")
        
        print("  Sample rate: \(inputFormat.sampleRate) Hz")
        print("  Channels: \(inputFormat.channelCount)")
        print("  Format: \(inputFormat.commonFormat.rawValue)")
        
        print("✓ Audio engine setup test completed")
    }
    
    func testRealtimeStreaming() {
        print("\nTesting real-time audio streaming...")
        
        guard let engine = audioEngine, let input = inputNode else {
            assert(false, "Audio engine not initialized")
            return
        }
        
        var bufferCount = 0
        var totalFrames: AVAudioFrameCount = 0
        let expectation = DispatchSemaphore(value: 0)
        
        // Install tap on input
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, time in
            bufferCount += 1
            totalFrames += buffer.frameLength
            
            // Stop after collecting some buffers
            if bufferCount >= 10 {
                expectation.signal()
            }
        }
        
        do {
            try engine.start()
            assert(engine.isRunning, "Engine should be running")
            
            // Wait for buffers
            let timeout = expectation.wait(timeout: .now() + 2.0)
            assert(timeout == .success, "Should receive audio buffers within timeout")
            
            engine.stop()
            input.removeTap(onBus: 0)
            
            assert(bufferCount >= 10, "Should have received at least 10 buffers")
            assert(totalFrames > 0, "Should have received audio frames")
            
            print("  Received \(bufferCount) buffers")
            print("  Total frames: \(totalFrames)")
            
            print("✓ Real-time streaming test completed")
            
        } catch {
            assert(false, "Failed to start audio engine: \(error)")
        }
    }
    
    func testBufferProcessing() {
        print("\nTesting buffer processing...")
        
        guard let engine = audioEngine, let input = inputNode else {
            assert(false, "Audio engine not initialized")
            return
        }
        
        var processedBuffers = 0
        var maxAmplitude: Float = 0
        var totalRMS: Float = 0
        let expectation = DispatchSemaphore(value: 0)
        
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 2048, format: format) { buffer, time in
            // Process buffer
            if let channelData = buffer.floatChannelData {
                let frameLength = Int(buffer.frameLength)
                let channelCount = Int(buffer.format.channelCount)
                
                for channel in 0..<channelCount {
                    let samples = channelData[channel]
                    
                    // Find max amplitude
                    for i in 0..<frameLength {
                        let amplitude = abs(samples[i])
                        if amplitude > maxAmplitude {
                            maxAmplitude = amplitude
                        }
                    }
                    
                    // Calculate RMS
                    var sum: Float = 0
                    for i in 0..<frameLength {
                        sum += samples[i] * samples[i]
                    }
                    let rms = sqrt(sum / Float(frameLength))
                    totalRMS += rms
                }
            }
            
            processedBuffers += 1
            if processedBuffers >= 5 {
                expectation.signal()
            }
        }
        
        do {
            try engine.start()
            
            let timeout = expectation.wait(timeout: .now() + 2.0)
            assert(timeout == .success, "Should process buffers within timeout")
            
            engine.stop()
            input.removeTap(onBus: 0)
            
            assert(processedBuffers >= 5, "Should have processed at least 5 buffers")
            // Note: maxAmplitude might be 0 if there's silence
            print("  Processed buffers: \(processedBuffers)")
            print("  Max amplitude: \(maxAmplitude)")
            print("  Average RMS: \(totalRMS / Float(processedBuffers))")
            
            print("✓ Buffer processing test completed")
            
        } catch {
            assert(false, "Failed to process buffers: \(error)")
        }
    }
    
    func testMultipleFormats() {
        print("\nTesting multiple audio formats...")
        
        // Test creating different format converters
        let sampleRates = [8000.0, 16000.0, 44100.0, 48000.0]
        
        for sampleRate in sampleRates {
            // Create a format
            guard let format = AVAudioFormat(
                commonFormat: .pcmFormatFloat32,
                sampleRate: sampleRate,
                channels: 1,
                interleaved: false
            ) else {
                assert(false, "Failed to create format at \(sampleRate)Hz")
                continue
            }
            
            assert(format.sampleRate == sampleRate, "Format should have correct sample rate")
            assert(format.channelCount == 1, "Format should be mono")
            assert(format.commonFormat == .pcmFormatFloat32, "Format should be float32")
            
            // Test creating a buffer with this format
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format,
                frameCapacity: AVAudioFrameCount(sampleRate * 0.1) // 100ms
            ) else {
                assert(false, "Failed to create buffer at \(sampleRate)Hz")
                continue
            }
            
            assert(buffer.format.sampleRate == sampleRate, "Buffer format should match")
        }
        
        print("✓ Multiple formats test completed")
    }
}

// Run the tests
let test = AudioStreamingTest()
test.run() 