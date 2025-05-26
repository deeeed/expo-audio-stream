#!/usr/bin/env swift

import Foundation
import AVFoundation

// Simple test framework
struct TestResult {
    let name: String
    let passed: Bool
    let message: String
}

class SimpleTest {
    var results: [TestResult] = []
    
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
        print("🧪 Running iOS Audio Tests...\n")
        
        testWAVHeader()
        testAudioBuffer()
        
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
    
    func testWAVHeader() {
        print("Testing WAV header creation...")
        
        let sampleRate = 44100
        let channels = 2
        let bitsPerSample = 16
        let dataSize = 1024
        
        // Create header
        var header = Data()
        
        // RIFF chunk
        header.append("RIFF".data(using: .ascii)!)
        var fileSize = UInt32(dataSize + 36).littleEndian
        header.append(Data(bytes: &fileSize, count: 4))
        header.append("WAVE".data(using: .ascii)!)
        
        // fmt chunk
        header.append("fmt ".data(using: .ascii)!)
        var fmtSize = UInt32(16).littleEndian
        header.append(Data(bytes: &fmtSize, count: 4))
        var audioFormat = UInt16(1).littleEndian
        header.append(Data(bytes: &audioFormat, count: 2))
        var numChannels = UInt16(channels).littleEndian
        header.append(Data(bytes: &numChannels, count: 2))
        var sampleRateValue = UInt32(sampleRate).littleEndian
        header.append(Data(bytes: &sampleRateValue, count: 4))
        let byteRate = sampleRate * channels * (bitsPerSample / 8)
        var byteRateValue = UInt32(byteRate).littleEndian
        header.append(Data(bytes: &byteRateValue, count: 4))
        let blockAlign = channels * (bitsPerSample / 8)
        var blockAlignValue = UInt16(blockAlign).littleEndian
        header.append(Data(bytes: &blockAlignValue, count: 2))
        var bitsPerSampleValue = UInt16(bitsPerSample).littleEndian
        header.append(Data(bytes: &bitsPerSampleValue, count: 2))
        
        // data chunk
        header.append("data".data(using: .ascii)!)
        var dataSizeValue = UInt32(dataSize).littleEndian
        header.append(Data(bytes: &dataSizeValue, count: 4))
        
        // Tests
        assertEqual(header.count, 44, "WAV header should be 44 bytes")
        
        let riffHeader = String(data: header[0..<4], encoding: .ascii)
        assertEqual(riffHeader, "RIFF", "Should have RIFF header")
        
        let waveFormat = String(data: header[8..<12], encoding: .ascii)
        assertEqual(waveFormat, "WAVE", "Should have WAVE format")
        
        print("✓ WAV header test completed")
    }
    
    func testAudioBuffer() {
        print("\nTesting audio buffer creation...")
        
        let sampleRate = 44100.0
        let duration = 0.1
        let frequency = 440.0
        
        let frameCount = Int(sampleRate * duration)
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frameCount)) else {
            assert(false, "Failed to create audio buffer")
            return
        }
        
        buffer.frameLength = AVAudioFrameCount(frameCount)
        
        // Generate sine wave
        let channelData = buffer.floatChannelData![0]
        for frame in 0..<frameCount {
            let phase = 2.0 * Double.pi * frequency * Double(frame) / sampleRate
            channelData[frame] = Float(sin(phase) * 0.5)
        }
        
        // Tests
        assertEqual(Int(buffer.frameLength), frameCount, "Frame length should match")
        assertEqual(buffer.format.sampleRate, sampleRate, "Sample rate should match")
        assertEqual(Int(buffer.format.channelCount), 1, "Should have 1 channel")
        
        let middleSample = channelData[frameCount / 4]
        assert(abs(middleSample) > 0.001, "Middle sample should not be zero")
        
        print("✓ Audio buffer test completed")
    }
}

// Run the tests
let test = SimpleTest()
test.run() 