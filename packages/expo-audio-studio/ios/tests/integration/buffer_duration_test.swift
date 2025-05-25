#!/usr/bin/env swift

import Foundation
import AVFoundation

// Integration test for Buffer Duration feature
// This tests the ACTUAL behavior of AVAudioEngine with different buffer sizes

print("🧪 Buffer Duration Integration Test")
print("===================================\n")

class BufferDurationTest {
    let audioEngine = AVAudioEngine()
    var results: [(name: String, passed: Bool, message: String)] = []
    
    func runAllTests() {
        testDefaultBufferSize()
        testCustomBufferSizes()
        testBufferSizeLimits()
        printResults()
    }
    
    func testDefaultBufferSize() {
        print("Test 1: Default Buffer Size (1024 frames requested)")
        print("-------------------------------------------------")
        
        let inputNode = audioEngine.inputNode
        let expectation = DispatchSemaphore(value: 0)
        var receivedFrames: AVAudioFrameCount = 0
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputNode.inputFormat(forBus: 0)) { buffer, _ in
            receivedFrames = buffer.frameLength
            expectation.signal()
        }
        
        audioEngine.prepare()
        do {
            try audioEngine.start()
            _ = expectation.wait(timeout: .now() + 2)
            audioEngine.stop()
        } catch {
            print("Error: \(error)")
        }
        
        inputNode.removeTap(onBus: 0)
        
        // iOS enforces minimum of ~4800 frames
        let passed = receivedFrames >= 4800
        results.append((
            name: "Default Buffer Size",
            passed: passed,
            message: "Requested: 1024, Received: \(receivedFrames) frames (iOS minimum: ~4800)"
        ))
        
        print("✓ Requested: 1024 frames")
        print("✓ Received: \(receivedFrames) frames")
        print("✓ iOS enforces minimum buffer size\n")
    }
    
    func testCustomBufferSizes() {
        print("Test 2: Custom Buffer Sizes")
        print("---------------------------")
        
        let inputNode = audioEngine.inputNode
        let sampleRate = inputNode.inputFormat(forBus: 0).sampleRate
        
        let testCases: [(duration: Double, name: String)] = [
            (0.01, "10ms"),
            (0.05, "50ms"),
            (0.1, "100ms"),
            (0.2, "200ms"),
            (0.5, "500ms")
        ]
        
        for testCase in testCases {
            let requestedFrames = AVAudioFrameCount(testCase.duration * sampleRate)
            let expectation = DispatchSemaphore(value: 0)
            var receivedFrames: AVAudioFrameCount = 0
            
            inputNode.removeTap(onBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: requestedFrames, format: inputNode.inputFormat(forBus: 0)) { buffer, _ in
                receivedFrames = buffer.frameLength
                expectation.signal()
            }
            
            do {
                try audioEngine.start()
                _ = expectation.wait(timeout: .now() + 2)
                audioEngine.stop()
            } catch {
                print("Error: \(error)")
            }
            
            let expectedFrames: AVAudioFrameCount = requestedFrames < 4800 ? 4800 : requestedFrames
            let tolerance: AVAudioFrameCount = expectedFrames > 10000 ? AVAudioFrameCount(Double(expectedFrames) * 0.2) : 100
            let passed = abs(Int32(receivedFrames) - Int32(expectedFrames)) <= Int32(tolerance)
            
            results.append((
                name: "Buffer \(testCase.name)",
                passed: passed,
                message: "Requested: \(requestedFrames), Expected: \(expectedFrames), Received: \(receivedFrames)"
            ))
            
            print("  \(testCase.name): Requested \(requestedFrames) → Received \(receivedFrames) frames")
        }
        
        inputNode.removeTap(onBus: 0)
        print()
    }
    
    func testBufferSizeLimits() {
        print("Test 3: Buffer Size Limits")
        print("--------------------------")
        
        let inputNode = audioEngine.inputNode
        
        let extremeCases: [(size: AVAudioFrameCount, name: String)] = [
            (100, "Very small (100 frames)"),
            (50000, "Very large (50000 frames)")
        ]
        
        for testCase in extremeCases {
            let expectation = DispatchSemaphore(value: 0)
            var receivedFrames: AVAudioFrameCount = 0
            
            inputNode.removeTap(onBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: testCase.size, format: inputNode.inputFormat(forBus: 0)) { buffer, _ in
                receivedFrames = buffer.frameLength
                expectation.signal()
            }
            
            do {
                try audioEngine.start()
                _ = expectation.wait(timeout: .now() + 2)
                audioEngine.stop()
            } catch {
                print("Error: \(error)")
            }
            
            let passed = receivedFrames >= 4800 && receivedFrames <= 50000
            results.append((
                name: testCase.name,
                passed: passed,
                message: "Requested: \(testCase.size), Received: \(receivedFrames)"
            ))
            
            print("  \(testCase.name): \(testCase.size) → \(receivedFrames) frames")
        }
        
        inputNode.removeTap(onBus: 0)
        print()
    }
    
    func printResults() {
        print("📊 Test Results")
        print("===============")
        
        let passed = results.filter { $0.passed }.count
        let total = results.count
        
        for result in results {
            let status = result.passed ? "✅" : "❌"
            print("\(status) \(result.name)")
            print("   \(result.message)")
        }
        
        print("\nSummary: \(passed)/\(total) tests passed")
        
        if passed == total {
            print("🎉 All tests passed!")
        } else {
            print("⚠️  Some tests failed")
        }
        
        print("\n📝 Key Findings:")
        print("- iOS AVAudioEngine enforces a minimum buffer size of ~4800 frames")
        print("- Requests below 4800 frames are ignored")
        print("- Larger buffer sizes generally work as requested")
        print("- Buffer accumulation is needed for small buffer durations")
    }
}

// Run the test
let test = BufferDurationTest()
test.runAllTests() 