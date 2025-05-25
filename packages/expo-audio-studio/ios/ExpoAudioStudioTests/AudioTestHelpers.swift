import Foundation
import AVFoundation
import Accelerate

extension AVAudioPCMBuffer {
    
    /// Convert buffer to Data
    func toData() -> Data {
        let audioFormat = self.format
        let channelCount = Int(audioFormat.channelCount)
        let frameLength = Int(self.frameLength)
        
        var data = Data()
        
        if let floatData = self.floatChannelData {
            // Convert float samples to 16-bit PCM
            for frame in 0..<frameLength {
                for channel in 0..<channelCount {
                    let sample = floatData[channel][frame]
                    let int16Sample = Int16(max(-32768, min(32767, sample * 32767)))
                    data.append(contentsOf: withUnsafeBytes(of: int16Sample) { Array($0) })
                }
            }
        } else if let int16Data = self.int16ChannelData {
            // Already 16-bit, just copy
            for frame in 0..<frameLength {
                for channel in 0..<channelCount {
                    let sample = int16Data[channel][frame]
                    data.append(contentsOf: withUnsafeBytes(of: sample) { Array($0) })
                }
            }
        }
        
        return data
    }
    
    /// Calculate RMS (Root Mean Square) of the buffer
    func rms() -> Float {
        guard let channelData = self.floatChannelData else { return 0 }
        
        let channelCount = Int(self.format.channelCount)
        let frameLength = Int(self.frameLength)
        
        var sum: Float = 0
        var sampleCount = 0
        
        for channel in 0..<channelCount {
            for frame in 0..<frameLength {
                let sample = channelData[channel][frame]
                sum += sample * sample
                sampleCount += 1
            }
        }
        
        return sqrt(sum / Float(sampleCount))
    }
    
    /// Calculate energy of the buffer
    func energy() -> Float {
        guard let channelData = self.floatChannelData else { return 0 }
        
        let channelCount = Int(self.format.channelCount)
        let frameLength = Int(self.frameLength)
        
        var sum: Float = 0
        
        for channel in 0..<channelCount {
            for frame in 0..<frameLength {
                let sample = channelData[channel][frame]
                sum += sample * sample
            }
        }
        
        return sum
    }
}

extension Data {
    
    /// Convert PCM data to float array
    func toFloatArray(bitDepth: Int = 16) -> [Float] {
        var floats = [Float]()
        
        switch bitDepth {
        case 16:
            let samples = self.withUnsafeBytes { $0.bindMemory(to: Int16.self) }
            for sample in samples {
                floats.append(Float(sample) / Float(Int16.max))
            }
        case 32:
            let samples = self.withUnsafeBytes { $0.bindMemory(to: Int32.self) }
            for sample in samples {
                floats.append(Float(sample) / Float(Int32.max))
            }
        default:
            break
        }
        
        return floats
    }
    
    /// Calculate RMS from PCM data
    func rms(bitDepth: Int = 16) -> Float {
        let floats = toFloatArray(bitDepth: bitDepth)
        guard !floats.isEmpty else { return 0 }
        
        let sum = floats.reduce(0) { $0 + $1 * $1 }
        return sqrt(sum / Float(floats.count))
    }
    
    /// Calculate energy from PCM data
    func energy(bitDepth: Int = 16) -> Float {
        let floats = toFloatArray(bitDepth: bitDepth)
        return floats.reduce(0) { $0 + $1 * $1 }
    }
}

// Test assertion helpers
extension XCTestCase {
    
    /// Assert two float values are approximately equal
    func XCTAssertApproximatelyEqual(_ value1: Float, _ value2: Float, tolerance: Float = 0.0001, _ message: String = "", file: StaticString = #file, line: UInt = #line) {
        XCTAssertLessThanOrEqual(abs(value1 - value2), tolerance, message, file: file, line: line)
    }
    
    /// Assert two double values are approximately equal
    func XCTAssertApproximatelyEqual(_ value1: Double, _ value2: Double, tolerance: Double = 0.0001, _ message: String = "", file: StaticString = #file, line: UInt = #line) {
        XCTAssertLessThanOrEqual(abs(value1 - value2), tolerance, message, file: file, line: line)
    }
} 