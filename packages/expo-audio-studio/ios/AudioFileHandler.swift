import Foundation
import AVFoundation

/// Wrapper class for file handling operations to support tests
class AudioFileHandler {
    
    /// Create WAV header
    static func createWavHeader(sampleRate: Int, channels: Int, bitsPerSample: Int, dataSize: Int) -> Data {
        // Use the existing function from AudioProcessingHelpers
        return createWavHeader(
            pcmData: Data(count: dataSize),
            sampleRate: sampleRate,
            channels: channels,
            bitDepth: bitsPerSample
        ).prefix(44) // Return just the header, not the data
    }
    
    /// Update WAV header in file
    static func updateWavHeader(fileURL: URL) {
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