import Foundation
import AVFoundation
import Accelerate

class TestAudioGenerator {
    
    /// Generate a sine wave tone
    static func generateTone(frequency: Double, duration: TimeInterval, sampleRate: Double = 44100) -> AVAudioPCMBuffer? {
        let frameCount = AVAudioFrameCount(duration * sampleRate)
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!, frameCapacity: frameCount) else {
            return nil
        }
        
        buffer.frameLength = frameCount
        
        let channelData = buffer.floatChannelData![0]
        let angleIncrement = 2.0 * .pi * frequency / sampleRate
        
        for frame in 0..<Int(frameCount) {
            channelData[frame] = Float(sin(Double(frame) * angleIncrement))
        }
        
        return buffer
    }
    
    /// Generate white noise
    static func generateWhiteNoise(duration: TimeInterval, sampleRate: Double = 44100) -> AVAudioPCMBuffer? {
        let frameCount = AVAudioFrameCount(duration * sampleRate)
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!, frameCapacity: frameCount) else {
            return nil
        }
        
        buffer.frameLength = frameCount
        
        let channelData = buffer.floatChannelData![0]
        
        for frame in 0..<Int(frameCount) {
            channelData[frame] = Float.random(in: -1...1)
        }
        
        return buffer
    }
    
    /// Load test asset from bundle
    static func loadTestAsset(named name: String) -> AVAudioFile? {
        guard let url = Bundle(for: TestAudioGenerator.self).url(forResource: name, withExtension: "wav") else {
            return nil
        }
        
        return try? AVAudioFile(forReading: url)
    }
    
    /// Convert AVAudioPCMBuffer to Data
    static func bufferToData(_ buffer: AVAudioPCMBuffer) -> Data? {
        guard let channelData = buffer.floatChannelData else { return nil }
        
        let channelCount = Int(buffer.format.channelCount)
        let frameLength = Int(buffer.frameLength)
        let bytesPerFrame = 2 * channelCount // 16-bit audio
        
        var data = Data(capacity: frameLength * bytesPerFrame)
        
        for frame in 0..<frameLength {
            for channel in 0..<channelCount {
                let sample = channelData[channel][frame]
                let int16Sample = Int16(max(-32768, min(32767, sample * 32767)))
                data.append(contentsOf: withUnsafeBytes(of: int16Sample) { Array($0) })
            }
        }
        
        return data
    }
} 