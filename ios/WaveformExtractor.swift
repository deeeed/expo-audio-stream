// WaveformExtractor.swift

import Accelerate
import AVFoundation

/// This class is responsible for extracting waveform data from an audio file.
public class WaveformExtractor {
    public private(set) var audioFile: AVAudioFile?
    private var result: (Any) -> Void
    private var reject: (String, String) -> Void
    private var waveformData = Array<Float>()
    private var progress: Float = 0.0
    private var channelCount: Int = 1
    private var currentProgress: Float = 0.0
    private let extractionQueue = DispatchQueue(label: "WaveformExtractor", attributes: .concurrent)
    private var _abortWaveformExtraction: Bool = false

    /// Indicates whether the waveform extraction process should be aborted.
    public var abortWaveformExtraction: Bool {
        get { _abortWaveformExtraction }
        set { _abortWaveformExtraction = newValue }
    }

    /// Initializes the waveform extractor with an audio file URL, resolve, and reject callbacks.
    ///
    /// - Parameters:
    ///   - url: The URL of the audio file to be read.
    ///   - resolve: The callback to be called on successful extraction.
    ///   - reject: The callback to be called on extraction failure.
    public init(url: URL, resolve: @escaping (Any) -> Void, reject: @escaping (String, String) -> Void) throws {
        self.audioFile = try AVAudioFile(forReading: url)
        self.result = resolve
        self.reject = reject
    }

    deinit {
        audioFile = nil
    }

    /// Extracts the waveform data from the audio file.
    ///
    /// - Parameters:
    ///   - numberOfSamples: The number of samples to extract for the waveform.
    ///   - offset: The offset to start reading from.
    ///   - length: The length of the audio to read.
    /// - Returns: A 2D array of floats where each sub-array represents waveform data for a specific channel.
    public func extractWaveform(numberOfSamples: Int?, offset: Int? = 0, length: UInt? = nil) -> [[Float]]? {
        guard let audioFile = audioFile else { return nil }
        
        let numberOfSamples = max(1, numberOfSamples ?? 100)
        let totalFrameCount = AVAudioFrameCount(audioFile.length)
        var framesPerBuffer = totalFrameCount / AVAudioFrameCount(numberOfSamples)
        
        guard let rmsBuffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: AVAudioFrameCount(framesPerBuffer)) else { return nil }
        
        channelCount = Int(audioFile.processingFormat.channelCount)
        var data = Array(repeating: [Float](repeating: 0, count: numberOfSamples), count: channelCount)
        
        var startFrame: AVAudioFramePosition = offset == nil ? audioFile.framePosition : Int64(offset! * Int(framesPerBuffer))
        var end = numberOfSamples
        if let length = length {
            end = Int(length)
        }
        
        for i in 0..<end {
            if abortWaveformExtraction {
                audioFile.framePosition = startFrame
                abortWaveformExtraction = false
                return nil
            }
            
            do {
                audioFile.framePosition = startFrame
                try audioFile.read(into: rmsBuffer, frameCount: framesPerBuffer)
            } catch {
                reject("AUDIO_READ_ERROR", "Couldn't read into buffer")
                return nil
            }
            
            guard let floatData = rmsBuffer.floatChannelData else { return nil }
            
            for channel in 0..<channelCount {
                var rms: Float = 0.0
                vDSP_rmsqv(floatData[channel], 1, &rms, vDSP_Length(rmsBuffer.frameLength))
                data[channel][i] = rms
            }
            
            currentProgress += 1
            progress = currentProgress / Float(numberOfSamples)
            
            startFrame += AVAudioFramePosition(framesPerBuffer)
            if startFrame + AVAudioFramePosition(framesPerBuffer) > AVAudioFramePosition(totalFrameCount) {
                framesPerBuffer = totalFrameCount - AVAudioFrameCount(startFrame)
                if framesPerBuffer <= 0 { break }
            }
        }
        
        return data
    }

    /// Cancels the waveform extraction process.
    public func cancel() {
        abortWaveformExtraction = true
    }
}
