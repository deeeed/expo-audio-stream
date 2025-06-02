#!/usr/bin/env swift

import Foundation
import AVFoundation

// Integration test for Compressed-Only Output (Issue #244)
// This tests that when primary output is disabled and compressed is enabled,
// the compressed file info is properly returned in the result

print("🧪 Compressed-Only Output Integration Test (Issue #244)")
print("=====================================================\n")

// Add the parent directory to the module search path
let srcPath = URL(fileURLWithPath: #file)
    .deletingLastPathComponent()
    .deletingLastPathComponent()
    .deletingLastPathComponent()
    .path

// Import the module
#if canImport(ExpoAudioStream)
import ExpoAudioStream
#endif

// Helper to load Swift files
func loadSwiftFile(_ filename: String) {
    let filePath = "\(srcPath)/\(filename).swift"
    let fileURL = URL(fileURLWithPath: filePath)
    
    do {
        let _ = try String(contentsOf: fileURL, encoding: .utf8)
        // In a real scenario, we'd compile and load this
        // For testing, we'll simulate the behavior
    } catch {
        print("Warning: Could not load \(filename).swift")
    }
}

// Test class
class CompressedOnlyOutputTest {
    var results: [(name: String, passed: Bool, message: String)] = []
    
    func runAllTests() {
        print("📋 Test Scenarios:")
        print("1. Primary disabled, Compressed enabled (AAC)")
        print("2. Primary disabled, Compressed enabled (Opus)")
        print("3. Verify compressed file URI is returned")
        print("4. Verify file size and format info")
        print("\n")
        
        testCompressedOnlyAAC()
        testCompressedOnlyOpus()
        testCompressedFileAccess()
        printResults()
    }
    
    func testCompressedOnlyAAC() {
        print("Test 1: Compressed-Only Output with AAC")
        print("---------------------------------------")
        
        // Simulate recording configuration
        let config = [
            "sampleRate": 44100,
            "channels": 1,
            "encoding": "pcm_16bit",
            "output": [
                "primary": ["enabled": false],
                "compressed": [
                    "enabled": true,
                    "format": "aac",
                    "bitrate": 128000
                ]
            ]
        ] as [String : Any]
        
        // Expected behavior: Should return compression info with file URI
        let mockResult = simulateRecording(config: config)
        
        let hasCompressionInfo = mockResult["compression"] != nil
        let compressionDict = mockResult["compression"] as? [String: Any]
        let hasCompressedUri = compressionDict?["compressedFileUri"] != nil
        let format = compressionDict?["format"] as? String
        
        let passed = hasCompressionInfo && hasCompressedUri && format == "aac"
        
        results.append((
            name: "AAC Compressed-Only",
            passed: passed,
            message: "Compression info: \(hasCompressionInfo), URI: \(hasCompressedUri), Format: \(format ?? "nil")"
        ))
        
        if passed {
            print("✅ Compression info properly returned")
            print("✅ Compressed file URI: \(compressionDict?["compressedFileUri"] ?? "nil")")
            print("✅ Format: \(format ?? "nil")")
        } else {
            print("❌ FAIL: Compression info missing or incomplete")
        }
        print()
    }
    
    func testCompressedOnlyOpus() {
        print("Test 2: Compressed-Only Output with Opus (fallback to AAC on iOS)")
        print("-----------------------------------------------------------------")
        
        let config = [
            "sampleRate": 48000,
            "channels": 1,
            "encoding": "pcm_16bit",
            "output": [
                "primary": ["enabled": false],
                "compressed": [
                    "enabled": true,
                    "format": "opus", // Should fallback to AAC on iOS
                    "bitrate": 64000
                ]
            ]
        ] as [String : Any]
        
        let mockResult = simulateRecording(config: config)
        
        let compressionDict = mockResult["compression"] as? [String: Any]
        let format = compressionDict?["format"] as? String
        let bitrate = compressionDict?["bitrate"] as? Int
        
        // On iOS, Opus should fallback to AAC
        let passed = format == "aac" && bitrate != nil
        
        results.append((
            name: "Opus→AAC Fallback",
            passed: passed,
            message: "Format: \(format ?? "nil"), Bitrate: \(bitrate ?? 0)"
        ))
        
        if passed {
            print("✅ Opus correctly fell back to AAC")
            print("✅ Bitrate preserved: \(bitrate ?? 0)")
        } else {
            print("❌ FAIL: Incorrect format or missing bitrate")
        }
        print()
    }
    
    func testCompressedFileAccess() {
        print("Test 3: Verify Compressed File Accessibility")
        print("-------------------------------------------")
        
        let config = [
            "sampleRate": 44100,
            "channels": 1,
            "encoding": "pcm_16bit",
            "output": [
                "primary": ["enabled": false],
                "compressed": ["enabled": true, "format": "aac"]
            ]
        ] as [String : Any]
        
        let mockResult = simulateRecording(config: config)
        
        // Check main result structure
        let fileUri = mockResult["fileUri"] as? String ?? ""
        let _ = mockResult["filename"] as? String ?? ""
        let _ = mockResult["mimeType"] as? String ?? ""
        
        // Check compression structure
        let compressionDict = mockResult["compression"] as? [String: Any]
        let compressedUri = compressionDict?["compressedFileUri"] as? String
        let compressedSize = compressionDict?["size"] as? Int64
        
        // When primary is disabled, we should either:
        // 1. Get compression info with the compressed file URI
        // 2. Or use compressed URI as main fileUri (like web does)
        let hasAccessToCompressed = (compressedUri != nil && !compressedUri!.isEmpty) ||
                                   (!fileUri.isEmpty && fileUri != "")
        
        let passed = hasAccessToCompressed && compressedSize != nil
        
        results.append((
            name: "File Accessibility",
            passed: passed,
            message: "Main URI: '\(fileUri)', Compressed URI: '\(compressedUri ?? "nil")', Size: \(compressedSize ?? 0)"
        ))
        
        if passed {
            print("✅ Compressed file is accessible")
            print("✅ File size reported: \(compressedSize ?? 0) bytes")
        } else {
            print("❌ FAIL: Cannot access compressed file")
            print("   Main fileUri: '\(fileUri)'")
            print("   Compressed URI: '\(compressedUri ?? "nil")'")
        }
        print()
    }
    
    // Helper to simulate recording
    func simulateRecording(config: [String: Any]) -> [String: Any] {
        // This simulates the current BUGGY behavior
        // After the fix, this should return proper compression info
        
        let outputConfig = config["output"] as? [String: Any]
        let primaryConfig = outputConfig?["primary"] as? [String: Any]
        let compressedConfig = outputConfig?["compressed"] as? [String: Any]
        
        let primaryEnabled = primaryConfig?["enabled"] as? Bool ?? true
        let compressedEnabled = compressedConfig?["enabled"] as? Bool ?? false
        
        if !primaryEnabled {
            // Current buggy behavior - returns nil compression
            let result: [String: Any] = [
                "fileUri": "",
                "filename": "stream-only",
                "durationMs": 5000,
                "size": 0,
                "mimeType": "audio/wav"
            ]
            // BUG: compression should be included but is currently nil
            return result
        } else {
            // Normal behavior when primary is enabled
            var result: [String: Any] = [
                "fileUri": "file:///mock/recording.wav",
                "filename": "recording.wav",
                "durationMs": 5000,
                "size": 240000,
                "mimeType": "audio/wav"
            ]
            
            if compressedEnabled {
                result["compression"] = [
                    "compressedFileUri": "file:///mock/recording.aac",
                    "format": "aac",
                    "bitrate": 128000,
                    "size": 40000,
                    "mimeType": "audio/aac"
                ]
            }
            
            return result
        }
    }
    
    func printResults() {
        print("\n📊 Test Results")
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
            print("⚠️  Some tests failed - Fix needed!")
            print("\n🔧 Required Fix:")
            print("- When primary output is disabled, compression info must be included")
            print("- Compressed file URI must be accessible to users")
            print("- This affects iOS and Android (Web works correctly)")
        }
    }
}

// Run the test
let test = CompressedOnlyOutputTest()
test.runAllTests()