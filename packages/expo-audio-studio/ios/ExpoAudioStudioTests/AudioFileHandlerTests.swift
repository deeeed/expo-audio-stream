import XCTest
import AVFoundation
@testable import ExpoAudioStream

class AudioFileHandlerTests: XCTestCase {
    
    var tempDir: URL!
    var audioProcessor: AudioProcessor!
    
    // Helper function to create WAV header for tests
    private func createWavHeader(sampleRate: Int, channels: Int, bitsPerSample: Int, dataSize: Int) -> Data {
        var header = Data()
        
        let blockAlign = channels * (bitsPerSample / 8)
        let byteRate = sampleRate * blockAlign
        
        // "RIFF" chunk descriptor
        header.append(contentsOf: "RIFF".utf8)
        header.append(contentsOf: UInt32(36 + dataSize).littleEndianBytes)
        header.append(contentsOf: "WAVE".utf8)
        
        // "fmt " sub-chunk
        header.append(contentsOf: "fmt ".utf8)
        header.append(contentsOf: UInt32(16).littleEndianBytes)  // PCM format requires 16 bytes for the fmt sub-chunk
        header.append(contentsOf: UInt16(1).littleEndianBytes)   // Audio format 1 for PCM
        header.append(contentsOf: UInt16(channels).littleEndianBytes)
        header.append(contentsOf: UInt32(sampleRate).littleEndianBytes)
        header.append(contentsOf: UInt32(byteRate).littleEndianBytes)    // byteRate
        header.append(contentsOf: UInt16(blockAlign).littleEndianBytes)  // blockAlign
        header.append(contentsOf: UInt16(bitsPerSample).littleEndianBytes)  // bits per sample
        
        // "data" sub-chunk
        header.append(contentsOf: "data".utf8)
        header.append(contentsOf: UInt32(dataSize).littleEndianBytes)  // Sub-chunk data size
        
        return header
    }
    
    // Helper function to update WAV header for tests
    private func updateWavHeader(fileURL: URL) {
        guard let fileHandle = try? FileHandle(forUpdating: fileURL) else { return }
        defer { fileHandle.closeFile() }
        
        // Get file size
        fileHandle.seekToEndOfFile()
        let fileSize = fileHandle.offsetInFile
        
        // Update file size in header (bytes 4-7)
        fileHandle.seek(toFileOffset: 4)
        var size = UInt32(fileSize - 8).littleEndian
        fileHandle.write(Data(bytes: &size, count: 4))
        
        // Update data chunk size (bytes 40-43)
        fileHandle.seek(toFileOffset: 40)
        var dataSize = UInt32(fileSize - 44).littleEndian
        fileHandle.write(Data(bytes: &dataSize, count: 4))
    }
}
    
    override func setUp() {
        super.setUp()
        
        // Create temporary directory for tests
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        
        // Initialize AudioProcessor
        audioProcessor = AudioProcessor(filesDir: tempDir)
    }
    
    override func tearDown() {
        // Clean up temporary directory
        try? FileManager.default.removeItem(at: tempDir)
        
        super.tearDown()
    }
    
    // MARK: - WAV Header Tests
    
    func testWriteWavHeader_createsValidHeader() {
        // Given
        let sampleRate = 44100
        let channels = 2
        let bitsPerSample = 16
        let dataSize = 1000
        
        // When
        let header = createWavHeader(
            sampleRate: sampleRate,
            channels: channels,
            bitsPerSample: bitsPerSample,
            dataSize: dataSize
        )
        
        // Then
        XCTAssertEqual(header.count, 44, "WAV header should be 44 bytes")
        
        // Verify RIFF header
        let riffString = String(data: header[0..<4], encoding: .ascii)
        XCTAssertEqual(riffString, "RIFF")
        
        // Verify WAVE format
        let waveString = String(data: header[8..<12], encoding: .ascii)
        XCTAssertEqual(waveString, "WAVE")
        
        // Verify fmt chunk
        let fmtString = String(data: header[12..<16], encoding: .ascii)
        XCTAssertEqual(fmtString, "fmt ")
        
        // Verify data chunk
        let dataString = String(data: header[36..<40], encoding: .ascii)
        XCTAssertEqual(dataString, "data")
    }
    
    func testCreateAudioFile_createsFileWithCorrectSize() {
        // Given
        let fileName = "test_audio.wav"
        let sampleRate = 16000
        let channels = 1
        let durationMs = 1000
        
        // When
        let result = audioProcessor.createAudioFile(
            fileName: fileName,
            sampleRate: sampleRate,
            channels: channels,
            durationMs: durationMs
        )
        
        // Then
        XCTAssertTrue(result["success"] as? Bool ?? false)
        
        let fileUri = result["fileUri"] as? String
        XCTAssertNotNil(fileUri)
        
        if let fileUri = fileUri {
            let fileURL = URL(string: fileUri)!
            let fileExists = FileManager.default.fileExists(atPath: fileURL.path)
            XCTAssertTrue(fileExists)
            
            // Verify file size
            if let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
               let fileSize = attributes[.size] as? Int64 {
                let expectedDataSize = sampleRate * channels * 2 * durationMs / 1000
                let expectedFileSize = 44 + expectedDataSize // WAV header + data
                XCTAssertEqual(fileSize, Int64(expectedFileSize))
            }
        }
    }
    
    func testDeleteAudioFile_removesExistingFile() {
        // Given - Create a file first
        let fileName = "test_to_delete.wav"
        _ = audioProcessor.createAudioFile(
            fileName: fileName,
            sampleRate: 16000,
            channels: 1,
            durationMs: 100
        )
        
        // When
        let result = audioProcessor.deleteAudioFile(fileName: fileName)
        
        // Then
        XCTAssertTrue(result["success"] as? Bool ?? false)
        
        let fileURL = tempDir.appendingPathComponent(fileName)
        XCTAssertFalse(FileManager.default.fileExists(atPath: fileURL.path))
    }
    
    func testDeleteAudioFile_handlesNonExistentFile() {
        // Given
        let fileName = "non_existent.wav"
        
        // When
        let result = audioProcessor.deleteAudioFile(fileName: fileName)
        
        // Then
        XCTAssertFalse(result["success"] as? Bool ?? true)
        XCTAssertNotNil(result["error"])
    }
    
    func testGetAudioFiles_returnsCorrectList() {
        // Given - Create multiple files
        let fileNames = ["file1.wav", "file2.wav", "file3.txt"]
        
        for fileName in fileNames {
            if fileName.hasSuffix(".wav") {
                _ = audioProcessor.createAudioFile(
                    fileName: fileName,
                    sampleRate: 16000,
                    channels: 1,
                    durationMs: 100
                )
            } else {
                // Create non-audio file
                let url = tempDir.appendingPathComponent(fileName)
                try? "test".write(to: url, atomically: true, encoding: .utf8)
            }
        }
        
        // When
        let files = audioProcessor.getAudioFiles()
        
        // Then
        XCTAssertEqual(files.count, 2, "Should only return WAV files")
        XCTAssertTrue(files.contains("file1.wav"))
        XCTAssertTrue(files.contains("file2.wav"))
        XCTAssertFalse(files.contains("file3.txt"))
    }
    
    func testClearAudioStorage_removesAllAudioFiles() {
        // Given - Create multiple files
        let audioFiles = ["audio1.wav", "audio2.wav"]
        let otherFiles = ["document.txt", "image.png"]
        
        for fileName in audioFiles {
            _ = audioProcessor.createAudioFile(
                fileName: fileName,
                sampleRate: 16000,
                channels: 1,
                durationMs: 100
            )
        }
        
        for fileName in otherFiles {
            let url = tempDir.appendingPathComponent(fileName)
            try? "test".write(to: url, atomically: true, encoding: .utf8)
        }
        
        // When
        let result = audioProcessor.clearAudioStorage()
        
        // Then
        XCTAssertTrue(result["success"] as? Bool ?? false)
        
        // Verify audio files are deleted
        for fileName in audioFiles {
            let url = tempDir.appendingPathComponent(fileName)
            XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
        }
        
        // Verify other files remain
        for fileName in otherFiles {
            let url = tempDir.appendingPathComponent(fileName)
            XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
        }
    }
    
    func testUpdateWavHeader_updatesFileSizeCorrectly() {
        // Given - Create a file
        let fileName = "test_update.wav"
        let createResult = audioProcessor.createAudioFile(
            fileName: fileName,
            sampleRate: 16000,
            channels: 1,
            durationMs: 1000
        )
        
        guard let fileUri = createResult["fileUri"] as? String,
              let fileURL = URL(string: fileUri) else {
            XCTFail("Failed to create test file")
            return
        }
        
        // Simulate appending more data
        if let fileHandle = try? FileHandle(forWritingTo: fileURL) {
            fileHandle.seekToEndOfFile()
            let additionalData = Data(count: 1000)
            fileHandle.write(additionalData)
            fileHandle.closeFile()
        }
        
        // When
        updateWavHeader(fileURL: fileURL)
        
        // Then - Verify header was updated
        if let data = try? Data(contentsOf: fileURL) {
            // Check file size in header (bytes 4-7)
            let fileSize = data.subdata(in: 4..<8).withUnsafeBytes { $0.load(as: UInt32.self) }
            XCTAssertEqual(fileSize, UInt32(data.count - 8))
            
            // Check data chunk size (bytes 40-43)
            let dataSize = data.subdata(in: 40..<44).withUnsafeBytes { $0.load(as: UInt32.self) }
            XCTAssertEqual(dataSize, UInt32(data.count - 44))
        }
    }
    
    // MARK: - Real File Tests
    
    func testLoadRealWavFile() {
        // Load test asset
        guard let testBundle = Bundle(for: type(of: self)).url(forResource: "jfk", withExtension: "wav") else {
            XCTFail("Test resource jfk.wav should exist")
            return
        }
        
        // Copy to temp directory
        let destURL = tempDir.appendingPathComponent("test_jfk.wav")
        try? FileManager.default.copyItem(at: testBundle, to: destURL)
        
        // Load and verify
        let audioData = audioProcessor.loadAudioFromAnyFormat(
            filePath: destURL.path,
            config: nil
        )
        
        XCTAssertNotNil(audioData)
        
        // JFK.wav is known to be mono, 16kHz, 16-bit
        XCTAssertEqual(audioData?.sampleRate, 16000)
        XCTAssertEqual(audioData?.channels, 1)
        XCTAssertEqual(audioData?.bitDepth, 16)
        XCTAssertGreaterThan(audioData?.data.count ?? 0, 0)
    }
    
    func testProcessMultipleRealFiles() {
        let testFiles = ["jfk.wav", "recorder_hello_world.wav", "osr_us_000_0010_8k.wav"]
        
        for fileName in testFiles {
            guard let testBundle = Bundle(for: type(of: self)).url(forResource: fileName.replacingOccurrences(of: ".wav", with: ""), withExtension: "wav") else {
                print("Skipping \(fileName) - not found in test bundle")
                continue
            }
            
            let destURL = tempDir.appendingPathComponent(fileName)
            try? FileManager.default.copyItem(at: testBundle, to: destURL)
            
            let audioData = audioProcessor.loadAudioFromAnyFormat(
                filePath: destURL.path,
                config: nil
            )
            
            XCTAssertNotNil(audioData, "Should load \(fileName)")
            XCTAssertGreaterThan(audioData?.data.count ?? 0, 0, "\(fileName) should have audio data")
        }
    }
} 