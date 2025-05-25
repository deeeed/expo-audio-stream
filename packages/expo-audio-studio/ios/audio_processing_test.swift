#!/usr/bin/env swift

import Foundation
import AVFoundation
import Accelerate

// Simple test framework
struct TestResult {
    let name: String
    let passed: Bool
    let message: String
}

class AudioProcessingTest {
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
    
    func assertClose(_ a: Float, _ b: Float, tolerance: Float = 0.001, _ message: String = "", file: String = #file, line: Int = #line) {
        let passed = abs(a - b) < tolerance
        let msg = message.isEmpty ? "\(a) should be close to \(b)" : message
        assert(passed, msg, file: file, line: line)
    }
    
    func run() {
        print("🧪 Running iOS Audio Processing Tests...\n")
        
        testRMSCalculation()
        testZeroCrossingRate()
        testChannelConversion()
        testBitDepthConversion()
        
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
    
    func testRMSCalculation() {
        print("Testing RMS calculation...")
        
        // Create a simple sine wave
        let sampleCount = 1024
        var samples = [Float](repeating: 0, count: sampleCount)
        
        // Generate 1.0 amplitude sine wave
        for i in 0..<sampleCount {
            samples[i] = sin(Float(i) * 2.0 * .pi / 64.0)
        }
        
        // Calculate RMS
        var rms: Float = 0
        vDSP_rmsqv(samples, 1, &rms, vDSP_Length(sampleCount))
        
        // For a sine wave, RMS should be approximately 1/sqrt(2) ≈ 0.707
        assertClose(rms, 0.707, tolerance: 0.01, "RMS of sine wave should be ~0.707")
        
        print("✓ RMS calculation test completed")
    }
    
    func testZeroCrossingRate() {
        print("\nTesting zero crossing rate...")
        
        // Create a signal that crosses zero 10 times
        let samples: [Float] = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1]
        
        var zcr = 0
        for i in 1..<samples.count {
            if (samples[i] >= 0 && samples[i-1] < 0) || (samples[i] < 0 && samples[i-1] >= 0) {
                zcr += 1
            }
        }
        
        assertEqual(zcr, 10, "Should have 10 zero crossings")
        
        print("✓ Zero crossing rate test completed")
    }
    
    func testChannelConversion() {
        print("\nTesting channel conversion...")
        
        // Mono to stereo
        let monoSamples: [Float] = [0.5, -0.5, 0.3, -0.3]
        var stereoSamples = [Float](repeating: 0, count: monoSamples.count * 2)
        
        // Simple duplication for mono to stereo
        for i in 0..<monoSamples.count {
            stereoSamples[i * 2] = monoSamples[i]
            stereoSamples[i * 2 + 1] = monoSamples[i]
        }
        
        assertEqual(stereoSamples.count, 8, "Stereo should have double the samples")
        assertEqual(stereoSamples[0], monoSamples[0], "Left channel should match mono")
        assertEqual(stereoSamples[1], monoSamples[0], "Right channel should match mono")
        
        print("✓ Channel conversion test completed")
    }
    
    func testBitDepthConversion() {
        print("\nTesting bit depth conversion...")
        
        // 16-bit to float conversion
        let int16Samples: [Int16] = [Int16.max, 0, Int16.min]
        var floatSamples = [Float](repeating: 0, count: int16Samples.count)
        
        // Convert
        for i in 0..<int16Samples.count {
            floatSamples[i] = Float(int16Samples[i]) / Float(Int16.max)
        }
        
        assertClose(floatSamples[0], 1.0, "Max int16 should convert to ~1.0")
        assertClose(floatSamples[1], 0.0, "Zero should remain zero")
        assertClose(floatSamples[2], -1.0, tolerance: 0.01, "Min int16 should convert to ~-1.0")
        
        print("✓ Bit depth conversion test completed")
    }
}

// Run the tests
let test = AudioProcessingTest()
test.run() 