#!/usr/bin/env swift

import AVFoundation
import Foundation

// Test script to verify if AVAudioRecorder actually supports Opus encoding
// This version is macOS-compatible for testing purposes

func testOpusSupport() {
    print("Testing AVAudioRecorder Opus Support (macOS test)...")
    print("--------------------------------------------------")
    
    // Test 1: Check if kAudioFormatOpus is defined
    let opusFormat = kAudioFormatOpus
    print("✓ kAudioFormatOpus is defined: \(opusFormat) (0x\(String(opusFormat, radix: 16)))")
    
    // Convert to FourCC string
    let fourCC = String(format: "%c%c%c%c",
                       (opusFormat >> 24) & 0xff,
                       (opusFormat >> 16) & 0xff,
                       (opusFormat >> 8) & 0xff,
                       opusFormat & 0xff)
    print("  FourCC: '\(fourCC)'")
    print()
    
    // Test 2: Try to create AVAudioRecorder with Opus settings
    print("Testing AVAudioRecorder with Opus settings...")
    
    let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let opusURL = documentsPath.appendingPathComponent("test_opus.opus")
    let aacURL = documentsPath.appendingPathComponent("test_aac.m4a")
    
    // Opus settings
    let opusSettings: [String: Any] = [
        AVFormatIDKey: kAudioFormatOpus,
        AVSampleRateKey: 48000,
        AVNumberOfChannelsKey: 1,
        AVEncoderBitRateKey: 64000
    ]
    
    // AAC settings for comparison
    let aacSettings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 48000,
        AVNumberOfChannelsKey: 1,
        AVEncoderBitRateKey: 64000
    ]
    
    // Test Opus recorder
    do {
        let opusRecorder = try AVAudioRecorder(url: opusURL, settings: opusSettings)
        print("✓ Opus recorder created successfully")
        print("  URL: \(opusURL.lastPathComponent)")
        print("  Settings provided: \(opusSettings)")
        print("  Settings after init: \(opusRecorder.settings)")
        print("  Format: \(opusRecorder.format)")
        
        // Check if recorder can prepare
        if opusRecorder.prepareToRecord() {
            print("✓ Opus recorder prepared successfully")
            
            // Try to record for a brief moment
            if opusRecorder.record() {
                print("✓ Opus recorder started recording")
                Thread.sleep(forTimeInterval: 0.5)
                opusRecorder.stop()
                print("✓ Opus recorder stopped")
                
                // Check if file was created
                if FileManager.default.fileExists(atPath: opusURL.path) {
                    let attributes = try FileManager.default.attributesOfItem(atPath: opusURL.path)
                    let fileSize = attributes[.size] as? Int64 ?? 0
                    print("✓ Opus file created: \(fileSize) bytes")
                    
                    // Check file format by reading header
                    if fileSize > 0 {
                        let fileHandle = try FileHandle(forReadingFrom: opusURL)
                        let headerData = fileHandle.readData(ofLength: 32)
                        fileHandle.closeFile()
                        
                        print("  File header (hex): \(headerData.map { String(format: "%02X", $0) }.prefix(16).joined(separator: " "))")
                        
                        // Check for common audio file signatures
                        if headerData.count >= 4 {
                            let signature = headerData.prefix(4)
                            if signature.starts(with: "OggS".data(using: .ascii)!) {
                                print("  ✓ File has OGG container signature")
                            } else if signature.starts(with: [0x00, 0x00, 0x00]) {
                                print("  File might be MP4/M4A container")
                            } else {
                                print("  Unknown file signature")
                            }
                        }
                    }
                    
                    // Clean up
                    try FileManager.default.removeItem(at: opusURL)
                } else {
                    print("✗ No Opus file was created")
                }
            } else {
                print("✗ Opus recorder failed to start recording")
            }
        } else {
            print("✗ Opus recorder failed to prepare")
        }
    } catch {
        print("✗ Failed to create Opus recorder: \(error)")
        print("  Error details: \(error.localizedDescription)")
    }
    
    print()
    
    // Test AAC recorder for comparison
    print("Testing AVAudioRecorder with AAC settings (for comparison)...")
    do {
        let aacRecorder = try AVAudioRecorder(url: aacURL, settings: aacSettings)
        print("✓ AAC recorder created successfully")
        print("  Settings after init: \(aacRecorder.settings)")
        print("  Format: \(aacRecorder.format)")
        
        if aacRecorder.prepareToRecord() && aacRecorder.record() {
            print("✓ AAC recorder working normally")
            Thread.sleep(forTimeInterval: 0.5)
            aacRecorder.stop()
            
            if FileManager.default.fileExists(atPath: aacURL.path) {
                let attributes = try FileManager.default.attributesOfItem(atPath: aacURL.path)
                let fileSize = attributes[.size] as? Int64 ?? 0
                print("✓ AAC file created: \(fileSize) bytes")
                
                // Check file header
                let fileHandle = try FileHandle(forReadingFrom: aacURL)
                let headerData = fileHandle.readData(ofLength: 16)
                fileHandle.closeFile()
                
                print("  File header (hex): \(headerData.map { String(format: "%02X", $0) }.joined(separator: " "))")
                
                try FileManager.default.removeItem(at: aacURL)
            }
        }
    } catch {
        print("✗ Failed to create AAC recorder: \(error)")
    }
    
    print()
    print("Test complete!")
    print()
    print("Note: This test runs on macOS which may have different codec support than iOS.")
    print("The results should be validated on an actual iOS device or simulator.")
}

// Run the test
testOpusSupport()