import XCTest
import AVFoundation
import Accelerate
@testable import ExpoAudioStream

class AudioFormatUtilsTests: XCTestCase {
    
    // MARK: - Bit Depth Conversion Tests
    
    func testConvertBitDepth_8to16() {
        // Given
        let input8bit: [UInt8] = [0, 64, 128, 192, 255]
        let expected16bit: [Int16] = [-32768, -16384, 0, 16384, 32767]
        
        // When
        let result = AudioFormatUtils.convertBitDepth(
            data: Data(input8bit),
            fromBitDepth: 8,
            toBitDepth: 16
        )
        
        // Then
        let result16bit = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        XCTAssertEqual(result16bit, expected16bit)
    }
    
    func testConvertBitDepth_16to8() {
        // Given
        let input16bit: [Int16] = [-32768, -16384, 0, 16384, 32767]
        let expected8bit: [UInt8] = [0, 64, 128, 192, 255]
        
        // When
        var data = Data()
        input16bit.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        let result = AudioFormatUtils.convertBitDepth(
            data: data,
            fromBitDepth: 16,
            toBitDepth: 8
        )
        
        // Then
        let result8bit = Array(result)
        XCTAssertEqual(result8bit, expected8bit)
    }
    
    func testConvertBitDepth_16to32() {
        // Given
        let input16bit: [Int16] = [-32768, 0, 32767]
        let expected32bit: [Int32] = [-2147483648, 0, 2147483647]
        
        // When
        var data = Data()
        input16bit.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        let result = AudioFormatUtils.convertBitDepth(
            data: data,
            fromBitDepth: 16,
            toBitDepth: 32
        )
        
        // Then
        let result32bit = result.withUnsafeBytes { Array($0.bindMemory(to: Int32.self)) }
        XCTAssertEqual(result32bit, expected32bit)
    }
    
    func testConvertBitDepth_32to16() {
        // Given
        let input32bit: [Int32] = [-2147483648, 0, 2147483647]
        let expected16bit: [Int16] = [-32768, 0, 32767]
        
        // When
        var data = Data()
        input32bit.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        let result = AudioFormatUtils.convertBitDepth(
            data: data,
            fromBitDepth: 32,
            toBitDepth: 16
        )
        
        // Then
        let result16bit = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        XCTAssertEqual(result16bit, expected16bit)
    }
    
    func testConvertBitDepth_sameDepth() {
        // Given
        let input: [Int16] = [100, 200, 300]
        var data = Data()
        input.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.convertBitDepth(
            data: data,
            fromBitDepth: 16,
            toBitDepth: 16
        )
        
        // Then
        XCTAssertEqual(result, data)
    }
    
    // MARK: - Channel Conversion Tests
    
    func testConvertChannels_monoToStereo() {
        // Given
        let monoData: [Int16] = [100, 200, 300]
        var data = Data()
        monoData.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.convertChannels(
            data: data,
            fromChannels: 1,
            toChannels: 2,
            bitDepth: 16
        )
        
        // Then
        let stereoData = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        let expected: [Int16] = [100, 100, 200, 200, 300, 300]
        XCTAssertEqual(stereoData, expected)
    }
    
    func testConvertChannels_stereoToMono() {
        // Given
        let stereoData: [Int16] = [100, 200, 300, 400, 500, 600]
        var data = Data()
        stereoData.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.convertChannels(
            data: data,
            fromChannels: 2,
            toChannels: 1,
            bitDepth: 16
        )
        
        // Then
        let monoData = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        let expected: [Int16] = [150, 350, 550] // Average of pairs
        XCTAssertEqual(monoData, expected)
    }
    
    func testConvertChannels_sameChannels() {
        // Given
        let input: [Int16] = [100, 200, 300, 400]
        var data = Data()
        input.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.convertChannels(
            data: data,
            fromChannels: 2,
            toChannels: 2,
            bitDepth: 16
        )
        
        // Then
        XCTAssertEqual(result, data)
    }
    
    // MARK: - Audio Normalization Tests
    
    func testNormalizeAudio_quietAudio() {
        // Given - Very quiet audio
        let quietAudio: [Int16] = [10, -10, 20, -20, 30, -30]
        var data = Data()
        quietAudio.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.normalizeAudio(
            data: data,
            bitDepth: 16,
            targetLevel: 0.9
        )
        
        // Then
        let normalized = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        
        // Check that audio was amplified
        let maxOriginal = quietAudio.map { abs($0) }.max() ?? 0
        let maxNormalized = normalized.map { abs($0) }.max() ?? 0
        
        XCTAssertGreaterThan(maxNormalized, maxOriginal)
        
        // Check that max is close to target
        let targetMax = Int16(Float(Int16.max) * 0.9)
        XCTAssertGreaterThan(maxNormalized, Int16(Float(targetMax) * 0.8))
        XCTAssertLessThanOrEqual(maxNormalized, targetMax)
    }
    
    func testNormalizeAudio_loudAudio() {
        // Given - Already loud audio
        let loudAudio: [Int16] = [30000, -30000, 25000, -25000]
        var data = Data()
        loudAudio.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.normalizeAudio(
            data: data,
            bitDepth: 16,
            targetLevel: 0.9
        )
        
        // Then
        let normalized = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        
        // Check that audio was slightly reduced
        let maxOriginal = loudAudio.map { abs($0) }.max() ?? 0
        let maxNormalized = normalized.map { abs($0) }.max() ?? 0
        
        XCTAssertLessThanOrEqual(maxNormalized, maxOriginal)
        
        // Check that max is close to target
        let targetMax = Int16(Float(Int16.max) * 0.9)
        XCTAssertGreaterThan(maxNormalized, Int16(Float(targetMax) * 0.8))
        XCTAssertLessThanOrEqual(maxNormalized, targetMax)
    }
    
    func testNormalizeAudio_silentAudio() {
        // Given - Silent audio
        let silentAudio = [Int16](repeating: 0, count: 100)
        var data = Data()
        silentAudio.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.normalizeAudio(
            data: data,
            bitDepth: 16,
            targetLevel: 0.9
        )
        
        // Then - Should remain silent
        let normalized = result.withUnsafeBytes { Array($0.bindMemory(to: Int16.self)) }
        XCTAssertTrue(normalized.allSatisfy { $0 == 0 })
    }
    
    // MARK: - Sample Rate Conversion Tests
    
    func testResampleAudio_upsample() {
        // Given
        let originalSampleRate = 16000
        let targetSampleRate = 44100
        let duration = 0.1 // 100ms
        let originalSamples = Int(Double(originalSampleRate) * duration)
        
        // Create a simple sine wave
        var sineWave = [Int16]()
        for i in 0..<originalSamples {
            let value = sin(2.0 * .pi * 440.0 * Double(i) / Double(originalSampleRate))
            sineWave.append(Int16(value * 10000))
        }
        
        var data = Data()
        sineWave.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.resampleAudio(
            data: data,
            fromSampleRate: originalSampleRate,
            toSampleRate: targetSampleRate,
            channels: 1,
            bitDepth: 16
        )
        
        // Then
        let expectedSamples = Int(Double(targetSampleRate) * duration)
        let actualSamples = result.count / 2 // 16-bit = 2 bytes per sample
        
        // Allow some tolerance due to resampling
        XCTAssertGreaterThan(actualSamples, Int(Double(expectedSamples) * 0.95))
        XCTAssertLessThan(actualSamples, Int(Double(expectedSamples) * 1.05))
    }
    
    func testResampleAudio_downsample() {
        // Given
        let originalSampleRate = 44100
        let targetSampleRate = 16000
        let duration = 0.1 // 100ms
        let originalSamples = Int(Double(originalSampleRate) * duration)
        
        // Create a simple sine wave
        var sineWave = [Int16]()
        for i in 0..<originalSamples {
            let value = sin(2.0 * .pi * 440.0 * Double(i) / Double(originalSampleRate))
            sineWave.append(Int16(value * 10000))
        }
        
        var data = Data()
        sineWave.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.resampleAudio(
            data: data,
            fromSampleRate: originalSampleRate,
            toSampleRate: targetSampleRate,
            channels: 1,
            bitDepth: 16
        )
        
        // Then
        let expectedSamples = Int(Double(targetSampleRate) * duration)
        let actualSamples = result.count / 2 // 16-bit = 2 bytes per sample
        
        // Allow some tolerance due to resampling
        XCTAssertGreaterThan(actualSamples, Int(Double(expectedSamples) * 0.95))
        XCTAssertLessThan(actualSamples, Int(Double(expectedSamples) * 1.05))
    }
    
    func testResampleAudio_sameSampleRate() {
        // Given
        let sampleRate = 44100
        let samples: [Int16] = [100, 200, 300, 400, 500]
        var data = Data()
        samples.forEach { data.append(contentsOf: withUnsafeBytes(of: $0) { Array($0) }) }
        
        // When
        let result = AudioFormatUtils.resampleAudio(
            data: data,
            fromSampleRate: sampleRate,
            toSampleRate: sampleRate,
            channels: 1,
            bitDepth: 16
        )
        
        // Then - Should return same data
        XCTAssertEqual(result, data)
    }
} 