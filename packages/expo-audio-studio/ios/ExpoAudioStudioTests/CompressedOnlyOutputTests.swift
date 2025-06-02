import XCTest
import AVFoundation
@testable import ExpoAudioStream

class CompressedOnlyOutputTests: XCTestCase {
    
    var audioManager: AudioStreamManager!
    var testDelegate: TestAudioStreamDelegate!
    
    override func setUp() {
        super.setUp()
        audioManager = AudioStreamManager()
        testDelegate = TestAudioStreamDelegate()
        audioManager.delegate = testDelegate
    }
    
    override func tearDown() {
        audioManager.stopRecording()
        audioManager = nil
        testDelegate = nil
        super.tearDown()
    }
    
    // MARK: - Test Compressed-Only Output (Issue #244)
    
    func testCompressedOnlyOutputWithAAC() {
        // Given: Recording settings with primary disabled and compressed enabled (AAC)
        var settings = RecordingSettings(
            sampleRate: 44100,
            desiredSampleRate: 44100,
            autoResumeAfterInterruption: false
        )
        settings.numberOfChannels = 1
        settings.bitDepth = 16
        settings.output.primary.enabled = false
        settings.output.compressed.enabled = true
        settings.output.compressed.format = "aac"
        settings.output.compressed.bitrate = 128000
        
        let expectation = self.expectation(description: "Recording should complete with compression info")
        var capturedCompressionInfo: [String: Any]?
        var capturedError: String?
        
        // When: Start and stop recording
        testDelegate.onAudioData = { data, recordingTime, totalDataSize, compressionInfo in
            capturedCompressionInfo = compressionInfo
        }
        
        testDelegate.onError = { error in
            capturedError = error
        }
        
        // Start recording returns a result that we can check
        let startResult = audioManager.startRecording(settings: settings)
        XCTAssertNotNil(startResult, "Start recording should return a result")
        
        // Generate and process some test audio to ensure compression happens
        let testBuffer = TestAudioGenerator.generateTone(frequency: 440, duration: 0.1, sampleRate: 44100)
        if let buffer = testBuffer {
            // Process multiple chunks to ensure we have enough data
            for _ in 0..<5 {
                audioManager.processAudioBuffer(buffer, time: AVAudioTime(hostTime: mach_absolute_time()))
                Thread.sleep(forTimeInterval: 0.1)
            }
        }
        
        // Stop recording and get the result
        let recordingResult = audioManager.stopRecording()
        expectation.fulfill()
        
        waitForExpectations(timeout: 2.0) { error in
            XCTAssertNil(error, "Recording should complete within timeout")
        }
        
        // Then: Verify compression info is returned
        XCTAssertNil(capturedError, "No errors should occur during recording")
        XCTAssertNotNil(recordingResult, "Recording result should not be nil")
        XCTAssertNotNil(recordingResult?.compression, "Compression info should be included")
        
        if let compression = recordingResult?.compression {
            XCTAssertEqual(compression.format, "aac", "Format should be AAC")
            XCTAssertEqual(compression.bitrate, 128000, "Bitrate should match settings")
            XCTAssertFalse(compression.compressedFileUri.isEmpty, "Compressed file URI should not be empty")
            XCTAssertGreaterThan(compression.size, 0, "Compressed file size should be greater than 0")
            XCTAssertEqual(compression.mimeType, "audio/aac", "MIME type should be audio/aac")
        }
        
        // Verify main result uses compressed info when primary is disabled
        XCTAssertEqual(recordingResult?.fileUri, recordingResult?.compression?.compressedFileUri,
                      "Main fileUri should use compressed URI when primary is disabled")
        XCTAssertEqual(recordingResult?.mimeType, "audio/aac",
                      "Main mimeType should reflect compressed format")
    }
    
    func testCompressedOnlyOutputWithOpusFallback() {
        // Given: Recording settings with primary disabled and compressed enabled (Opus)
        var settings = RecordingSettings(
            sampleRate: 48000,
            desiredSampleRate: 48000,
            autoResumeAfterInterruption: false
        )
        settings.numberOfChannels = 1
        settings.bitDepth = 16
        settings.output.primary.enabled = false
        settings.output.compressed.enabled = true
        settings.output.compressed.format = "opus" // Should fallback to AAC on iOS
        settings.output.compressed.bitrate = 64000
        
        let expectation = self.expectation(description: "Recording should complete with AAC fallback")
        
        // Start recording
        let startResult = audioManager.startRecording(settings: settings)
        XCTAssertNotNil(startResult, "Start recording should return a result")
        
        // Generate test audio
        if let buffer = TestAudioGenerator.generateTone(frequency: 440, duration: 0.1, sampleRate: 48000) {
            for _ in 0..<3 {
                audioManager.processAudioBuffer(buffer, time: AVAudioTime(hostTime: mach_absolute_time()))
                Thread.sleep(forTimeInterval: 0.1)
            }
        }
        
        // Stop recording
        let recordingResult = audioManager.stopRecording()
        expectation.fulfill()
        
        waitForExpectations(timeout: 2.0) { error in
            XCTAssertNil(error, "Recording should complete within timeout")
        }
        
        // Then: Verify Opus falls back to AAC on iOS
        XCTAssertNotNil(recordingResult?.compression, "Compression info should be included")
        XCTAssertEqual(recordingResult?.compression?.format, "aac", 
                      "Opus should fallback to AAC on iOS")
        XCTAssertEqual(recordingResult?.compression?.bitrate, 64000,
                      "Bitrate should be preserved from original settings")
    }
    
    func testCompressedFileAccessibility() {
        // Given: Recording with compressed output
        var settings = RecordingSettings(
            sampleRate: 44100,
            desiredSampleRate: 44100,
            autoResumeAfterInterruption: false
        )
        settings.numberOfChannels = 1
        settings.bitDepth = 16
        settings.output.primary.enabled = false
        settings.output.compressed.enabled = true
        settings.output.compressed.format = "aac"
        settings.output.compressed.bitrate = 96000
        
        let expectation = self.expectation(description: "Compressed file should be accessible")
        
        // Start recording
        let startResult = audioManager.startRecording(settings: settings)
        XCTAssertNotNil(startResult, "Start recording should return a result")
        
        // Generate substantial audio data to ensure file is created
        if let buffer = TestAudioGenerator.generateTone(frequency: 440, duration: 0.2, sampleRate: 44100) {
            for _ in 0..<5 {
                audioManager.processAudioBuffer(buffer, time: AVAudioTime(hostTime: mach_absolute_time()))
                Thread.sleep(forTimeInterval: 0.1)
            }
        }
        
        // Stop recording
        let recordingResult = audioManager.stopRecording()
        expectation.fulfill()
        
        waitForExpectations(timeout: 2.0) { error in
            XCTAssertNil(error, "Recording should complete within timeout")
        }
        
        // Then: Verify compressed file is accessible
        if let compression = recordingResult?.compression {
            let fileURL = URL(string: compression.compressedFileUri)
            XCTAssertNotNil(fileURL, "Compressed file URL should be valid")
            
            if let url = fileURL {
                let fileExists = FileManager.default.fileExists(atPath: url.path)
                XCTAssertTrue(fileExists, "Compressed file should exist at the specified path")
                
                // Verify file size matches reported size
                if fileExists {
                    do {
                        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
                        let actualSize = attributes[.size] as? Int64 ?? 0
                        XCTAssertEqual(actualSize, compression.size,
                                      "Reported size should match actual file size")
                    } catch {
                        XCTFail("Failed to get file attributes: \(error)")
                    }
                }
            }
        } else {
            XCTFail("Compression info should not be nil")
        }
    }
    
    func testStreamingOnlyWithCompression() {
        // Given: Streaming configuration with compression
        var settings = RecordingSettings(
            sampleRate: 44100,
            desiredSampleRate: 44100,
            autoResumeAfterInterruption: false
        )
        settings.numberOfChannels = 1
        settings.bitDepth = 16
        settings.output.primary.enabled = false
        settings.output.compressed.enabled = true
        settings.output.compressed.format = "aac"
        settings.output.compressed.bitrate = 128000
        settings.interval = 100 // Enable streaming with 100ms intervals
        
        let expectation = self.expectation(description: "Streaming should work with compressed output")
        var dataEventCount = 0
        var hasCompressionInfo = false
        
        testDelegate.onAudioData = { data, recordingTime, totalDataSize, compressionInfo in
            dataEventCount += 1
            if compressionInfo != nil {
                hasCompressionInfo = true
            }
        }
        
        // Start recording
        let startResult = audioManager.startRecording(settings: settings)
        XCTAssertNotNil(startResult, "Start recording should return a result")
        
        // Generate audio data
        if let buffer = TestAudioGenerator.generateTone(frequency: 440, duration: 0.1, sampleRate: 44100) {
            for _ in 0..<5 {
                audioManager.processAudioBuffer(buffer, time: AVAudioTime(hostTime: mach_absolute_time()))
                Thread.sleep(forTimeInterval: 0.1)
            }
        }
        
        // Stop recording
        let recordingResult = audioManager.stopRecording()
        expectation.fulfill()
        
        waitForExpectations(timeout: 2.0) { error in
            XCTAssertNil(error, "Recording should complete within timeout")
        }
        
        // Then: Verify streaming worked and compression info is available
        XCTAssertGreaterThan(dataEventCount, 0, "Should have received audio data events")
        XCTAssertTrue(hasCompressionInfo, "Should have received compression info in data events")
        XCTAssertNotNil(recordingResult?.compression, "Compression info should be available in final result")
    }
}

// MARK: - Test Delegate

class TestAudioStreamDelegate: AudioStreamManagerDelegate {
    var onAudioData: ((Data, TimeInterval, Int64, [String: Any]?) -> Void)?
    var onError: ((String) -> Void)?
    var onAnalysis: ((AudioAnalysisData?) -> Void)?
    
    func audioStreamManager(
        _ manager: AudioStreamManager,
        didReceiveAudioData data: Data,
        recordingTime: TimeInterval,
        totalDataSize: Int64,
        compressionInfo: [String: Any]?
    ) {
        onAudioData?(data, recordingTime, totalDataSize, compressionInfo)
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveProcessingResult result: AudioAnalysisData?) {
        onAnalysis?(result)
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didPauseRecording pauseTime: Date) {
        // Optional: Handle pause
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didResumeRecording resumeTime: Date) {
        // Optional: Handle resume
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didUpdateNotificationState isPaused: Bool) {
        // Optional: Handle notification state
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveInterruption info: [String: Any]) {
        // Optional: Handle interruption
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didFailWithError error: String) {
        onError?(error)
    }
}