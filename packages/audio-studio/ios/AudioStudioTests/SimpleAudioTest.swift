import XCTest
import AVFoundation

class SimpleAudioTest: XCTestCase {
    
    func testCreateWAVHeader() {
        // Test creating a basic WAV header
        let sampleRate = 44100
        let channels = 2
        let bitsPerSample = 16
        let dataSize = 1024
        
        // Calculate expected values
        let byteRate = sampleRate * channels * (bitsPerSample / 8)
        let blockAlign = channels * (bitsPerSample / 8)
        
        // Create header data manually (44 bytes)
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
        var audioFormat = UInt16(1).littleEndian // PCM
        header.append(Data(bytes: &audioFormat, count: 2))
        var numChannels = UInt16(channels).littleEndian
        header.append(Data(bytes: &numChannels, count: 2))
        var sampleRateValue = UInt32(sampleRate).littleEndian
        header.append(Data(bytes: &sampleRateValue, count: 4))
        var byteRateValue = UInt32(byteRate).littleEndian
        header.append(Data(bytes: &byteRateValue, count: 4))
        var blockAlignValue = UInt16(blockAlign).littleEndian
        header.append(Data(bytes: &blockAlignValue, count: 2))
        var bitsPerSampleValue = UInt16(bitsPerSample).littleEndian
        header.append(Data(bytes: &bitsPerSampleValue, count: 2))
        
        // data chunk
        header.append("data".data(using: .ascii)!)
        var dataSizeValue = UInt32(dataSize).littleEndian
        header.append(Data(bytes: &dataSizeValue, count: 4))
        
        // Verify header size
        XCTAssertEqual(header.count, 44, "WAV header should be 44 bytes")
        
        // Verify RIFF header
        let riffHeader = String(data: header[0..<4], encoding: .ascii)
        XCTAssertEqual(riffHeader, "RIFF")
        
        // Verify WAVE format
        let waveFormat = String(data: header[8..<12], encoding: .ascii)
        XCTAssertEqual(waveFormat, "WAVE")
        
        print("✅ Basic WAV header test passed!")
    }
    
    func testSimpleAudioBuffer() {
        // Test creating a simple audio buffer
        let sampleRate = 44100.0
        let duration = 0.1 // 100ms
        let frequency = 440.0 // A4 note
        
        let frameCount = Int(sampleRate * duration)
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frameCount)) else {
            XCTFail("Failed to create audio buffer")
            return
        }
        
        buffer.frameLength = AVAudioFrameCount(frameCount)
        
        // Generate a simple sine wave
        let channelData = buffer.floatChannelData![0]
        for frame in 0..<frameCount {
            let phase = 2.0 * Double.pi * frequency * Double(frame) / sampleRate
            channelData[frame] = Float(sin(phase) * 0.5)
        }
        
        // Verify buffer properties
        XCTAssertEqual(buffer.frameLength, AVAudioFrameCount(frameCount))
        XCTAssertEqual(buffer.format.sampleRate, sampleRate)
        XCTAssertEqual(buffer.format.channelCount, 1)
        
        // Verify we have audio data
        let firstSample = channelData[0]
        let lastSample = channelData[frameCount - 1]
        XCTAssertNotEqual(firstSample, 0.0, accuracy: 0.001)
        XCTAssertNotEqual(lastSample, firstSample, accuracy: 0.001)
        
        print("✅ Simple audio buffer test passed!")
    }
} 