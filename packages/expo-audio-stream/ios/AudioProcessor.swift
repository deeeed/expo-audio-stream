// packages/expo-audio-stream/ios/AudioProcessor.swift

import Foundation
import Accelerate
import AVFoundation
import QuartzCore

public struct TrimResult {
    public let uri: String
    public let duration: Double
    public let size: Int64
    
    public init(uri: String, duration: Double, size: Int64) {
        self.uri = uri
        self.duration = duration
        self.size = size
    }
}

public class AudioProcessor {
    public private(set) var audioFile: AVAudioFile?
    private var result: (Any) -> Void
    private var reject: (String, String) -> Void
    private var waveformData = Array<Float>()
    private var progress: Float = 0.0
    private var channelCount: Int = 1
    private var currentProgress: Float = 0.0
    private let extractionQueue = DispatchQueue(label: "AudioProcessor", attributes: .concurrent)
    private var _abortExtraction: Bool = false
        
    // Add a counter for unique IDs
    private var uniqueIdCounter = 0

    public var abortExtraction: Bool {
        get { _abortExtraction }
        set { _abortExtraction = newValue }
    }
    
    // Initializer for file-based processing
    public init(url: URL, resolve: @escaping (Any) -> Void, reject: @escaping (String, String) -> Void) throws {
        self.audioFile = try AVAudioFile(forReading: url)
        self.result = resolve
        self.reject = reject
    }
    
    // Initializer for buffer-based processing
    public init(resolve: @escaping (Any) -> Void, reject: @escaping (String, String) -> Void) {
        self.result = resolve
        self.reject = reject
    }
    
    
    deinit {
        audioFile = nil
    }
    
    /// Error types for AudioProcessor
    public enum AudioProcessorError: Error {
        case fileInitializationFailed(String)
        case bufferCreationFailed
        case audioReadError(String)
    }
    
    
    /// Extracts and processes audio data from the audio file.
    /// - Parameters:
    ///   - numberOfSamples: The number of samples to extract (for waveform).
    ///   - offset: The offset to start reading from (in samples).
    ///   - length: The length of the audio to read (in samples).
    ///   - pointsPerSecond: The number of data points to extract per second (for features).
    ///   - algorithm: The algorithm to use for feature extraction.
    ///   - featureOptions: The features to extract.
    ///   - bitDepth: The bit depth of the audio data.
    ///   - numberOfChannels: The number of channels in the audio data.
    /// - Returns: An `AudioAnalysisData` object containing the extracted features.
    public func processAudioData(numberOfSamples: Int?, offset: Int? = 0, length: UInt? = nil, pointsPerSecond: Int?, algorithm: String, featureOptions: [String: Bool], bitDepth: Int, numberOfChannels: Int) -> AudioAnalysisData? {
     
        guard let audioFile = audioFile else {
            reject("FILE_NOT_INITIALIZED", "Audio file is not initialized.")
            return nil
        }
        
        let totalFrameCount = AVAudioFrameCount(audioFile.length)
        var framesPerBuffer: AVAudioFrameCount
        let actualPointsPerSecond: Int
        
        if let numberOfSamples = numberOfSamples {
            framesPerBuffer = totalFrameCount / AVAudioFrameCount(numberOfSamples)
            actualPointsPerSecond = Int(Double(totalFrameCount) / audioFile.fileFormat.sampleRate)
        } else if let pointsPerSecond = pointsPerSecond {
            actualPointsPerSecond = pointsPerSecond
            framesPerBuffer = totalFrameCount / AVAudioFrameCount(actualPointsPerSecond)
        } else {
            // Default behavior: set pointsPerSecond to 1000
            actualPointsPerSecond = 1000
            framesPerBuffer = totalFrameCount / AVAudioFrameCount(actualPointsPerSecond)
        }
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: framesPerBuffer) else {
            reject("BUFFER_CREATION_FAILED", "Failed to create AVAudioPCMBuffer.")
            return nil
        }
        
        channelCount = Int(audioFile.processingFormat.channelCount)
        var data = Array(repeating: [Float](repeating: 0, count: Int(framesPerBuffer)), count: channelCount)
        
        var startFrame: AVAudioFramePosition = offset == nil ? audioFile.framePosition : Int64(offset! * Int(framesPerBuffer))
        var endFrame: AVAudioFramePosition = length == nil ? audioFile.length : min(audioFile.length, startFrame + Int64(length!))
        
        var channelData = [Float]()
        while startFrame < endFrame {
            if abortExtraction {
                audioFile.framePosition = startFrame
                abortExtraction = false
                return nil
            }
            
            do {
                audioFile.framePosition = startFrame
                try audioFile.read(into: buffer, frameCount: framesPerBuffer)
            } catch {
                reject("AUDIO_READ_ERROR", "Couldn't read into buffer: \(error.localizedDescription)")
                return nil
            }
            
            //TODO: check if we need conversion based on bitDepth here
            guard let floatData = buffer.floatChannelData else {
                reject("BUFFER_DATA_ERROR", "Failed to retrieve float data from buffer.")
                return nil
            }
            for frame in 0..<Int(buffer.frameLength) {
                channelData.append(floatData[0][frame])
            }
            
            startFrame += AVAudioFramePosition(framesPerBuffer)
            if startFrame + AVAudioFramePosition(framesPerBuffer) > endFrame {
                framesPerBuffer = AVAudioFrameCount(endFrame - startFrame)
            }
        }
        
        return processChannelData(channelData: channelData, sampleRate: Float(audioFile.fileFormat.sampleRate), pointsPerSecond: actualPointsPerSecond, algorithm: algorithm, featureOptions: featureOptions, bitDepth: bitDepth, numberOfChannels: numberOfChannels)
    }
    
    /// Processes audio data from a buffer.
    /// - Parameters:
    ///   - data: The audio data buffer.
    ///   - sampleRate: The sample rate of the audio data.
    ///   - pointsPerSecond: The number of data points to extract per second (for features).
    ///   - algorithm: The algorithm to use for feature extraction.
    ///   - featureOptions: The features to extract.
    ///   - bitDepth: The bit depth of the audio data.
    ///   - numberOfChannels: The number of channels in the audio data.
    /// - Returns: An `AudioAnalysisData` object containing the extracted features.
    public func processAudioBuffer(data: Data, sampleRate: Float, pointsPerSecond: Int, algorithm: String, featureOptions: [String: Bool], bitDepth: Int, numberOfChannels: Int) -> AudioAnalysisData? {
        guard !data.isEmpty else {
            Logger.debug("Data is empty, rejecting")
            reject("DATA_EMPTY", "The audio data is empty.")
            return nil
        }

        // Convert Data to Float array based on bit depth
        let floatData: [Float]
        switch bitDepth {
        case 16:
            floatData = data.withUnsafeBytes { bufferPointer in
                let int16Pointer = bufferPointer.bindMemory(to: Int16.self)
                return int16Pointer.map { Float($0) / Float(Int16.max) }
            }
        case 32:
            floatData = data.withUnsafeBytes { bufferPointer in
                let int32Pointer = bufferPointer.bindMemory(to: Int32.self)
                return int32Pointer.map { Float($0) / Float(Int32.max) }
            }
        default:
            Logger.debug("Unsupported bit depth. Rejecting")
            reject("UNSUPPORTED_BIT_DEPTH", "Unsupported bit depth: \(bitDepth)")
            return nil
        }

        return processChannelData(channelData: floatData, sampleRate: sampleRate, pointsPerSecond: pointsPerSecond, algorithm: algorithm, featureOptions: featureOptions, bitDepth: bitDepth, numberOfChannels: numberOfChannels)
    }

    /// Processes the given audio channel data to extract features.
    /// - Parameters:
    ///   - channelData: The audio channel data to process.
    ///   - sampleRate: The sample rate of the audio data.
    ///   - pointsPerSecond: The number of data points to extract per second (for features).
    ///   - algorithm: The algorithm to use for feature extraction.
    ///   - featureOptions: The features to extract.
    ///   - bitDepth: The bit depth of the audio data.
    ///   - numberOfChannels: The number of channels in the audio data.
    /// - Returns: An `AudioAnalysisData` object containing the extracted features.
    private func processChannelData(channelData: [Float], sampleRate: Float, pointsPerSecond: Int, algorithm: String, featureOptions: [String: Bool], bitDepth: Int, numberOfChannels: Int) -> AudioAnalysisData? {
        Logger.debug("Processing audio data with sample rate: \(sampleRate), points per second: \(pointsPerSecond), algorithm: \(algorithm), bitDepth: \(bitDepth), numberOfChannels: \(numberOfChannels)")
        
        let startTime = CACurrentMediaTime() // Start the timer with high precision

        let length = channelData.count
        let pointInterval = Int(sampleRate) / pointsPerSecond
        var dataPoints = [DataPoint]()
        var minAmplitude: Float = .greatestFiniteMagnitude
        var maxAmplitude: Float = -.greatestFiniteMagnitude
        let durationMs = Float(length) / sampleRate * 1000
        
        var sumSquares: Float = 0
        var zeroCrossings = 0
        var prevValue: Float = 0
        var localMinAmplitude: Float = .greatestFiniteMagnitude
        var localMaxAmplitude: Float = -.greatestFiniteMagnitude
        var segmentData = [Float]()
        var currentPosition = 0 // Track the current byte position

        for i in 0..<length {
            updateSegmentData(channelData: channelData, index: i, sumSquares: &sumSquares, zeroCrossings: &zeroCrossings, prevValue: &prevValue, localMinAmplitude: &localMinAmplitude, localMaxAmplitude: &localMaxAmplitude, segmentData: &segmentData)
            
            if (i + 1) % pointInterval == 0 || i == length - 1 {
                var features = computeFeatures(segmentData: segmentData, sampleRate: sampleRate, sumSquares: sumSquares, zeroCrossings: zeroCrossings, segmentLength: (i % pointInterval) + 1, featureOptions: featureOptions)
                features.minAmplitude = localMinAmplitude
                features.maxAmplitude = localMaxAmplitude
                let rms = features.rms
                let silent = rms < 0.01
                let dB = Float(20 * log10(Double(rms)))
                minAmplitude = min(minAmplitude, localMinAmplitude)
                maxAmplitude = max(maxAmplitude, localMaxAmplitude)
                
                let segmentSize = segmentData.count
                let segmentDuration = Float(segmentSize) / sampleRate
                
                // Calculate start time and end time
                let segmentStartTime = Float(i - segmentSize + 1) / sampleRate
                let segmentEndTime = Float(i + 1) / sampleRate
               
                // Calculate start position and end position in bytes
               let bytesPerSample = bitDepth / 8
               let startPosition = currentPosition
               let endPosition = startPosition + (segmentSize * bytesPerSample * numberOfChannels)
               
                dataPoints.append(DataPoint(
                    id: uniqueIdCounter,
                    amplitude: algorithm == "peak" ? localMaxAmplitude : rms,
                    activeSpeech: nil,
                    dB: dB,
                    silent: silent,
                    features: features,
                    startTime: segmentStartTime,
                    endTime: segmentEndTime,
                    startPosition: startPosition,
                    endPosition: endPosition,
                    speaker: 0,
                    samples: segmentData.count
                ))
                uniqueIdCounter += 1 // Increment the unique ID counter

                resetSegmentData(&sumSquares, &zeroCrossings, &localMinAmplitude, &localMaxAmplitude, &segmentData)
                
                // Update the current byte position
                currentPosition = endPosition
            }
        }
        
        let endTime = CACurrentMediaTime() // End the timer with high precision
        let processingTimeMs = Float((endTime - startTime) * 1000)

        Logger.debug("Processed \(dataPoints.count) data points in \(processingTimeMs) ms")

        return AudioAnalysisData(
            pointsPerSecond: pointsPerSecond,
            durationMs: Float(durationMs),
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels,
            sampleRate: sampleRate,
            samples: channelData.count,
            dataPoints: dataPoints,
            amplitudeRange: (min: minAmplitude, max: maxAmplitude),
            speakerChanges: [],
            extractionTimeMs: processingTimeMs
        )
    }
    
    private func updateSegmentData(channelData: [Float], index: Int, sumSquares: inout Float, zeroCrossings: inout Int, prevValue: inout Float, localMinAmplitude: inout Float, localMaxAmplitude: inout Float, segmentData: inout [Float]) {
        let value = channelData[index]
        sumSquares += value * value
        if index > 0 && value * prevValue < 0 {
            zeroCrossings += 1
        }
        prevValue = value
        
        let absValue = abs(value)
        localMinAmplitude = min(localMinAmplitude, absValue)
        localMaxAmplitude = max(localMaxAmplitude, absValue)
        
        segmentData.append(value)
    }
    
    private func computeFeatures(segmentData: [Float], sampleRate: Float, sumSquares: Float, zeroCrossings: Int, segmentLength: Int, featureOptions: [String: Bool]) -> Features {
        let rms = sqrt(sumSquares / Float(segmentLength))
        let energy = featureOptions["energy"] == true ? sumSquares : 0
        let zcr = featureOptions["zcr"] == true ? Float(zeroCrossings) / Float(segmentLength) : 0
        let mfcc = featureOptions["mfcc"] == true ? extractMFCC(from: segmentData, sampleRate: sampleRate) : []
        let spectralCentroid = featureOptions["spectralCentroid"] == true ? extractSpectralCentroid(from: segmentData, sampleRate: sampleRate) : 0
        let spectralFlatness = featureOptions["spectralFlatness"] == true ? extractSpectralFlatness(from: segmentData) : 0
        let spectralRollOff = featureOptions["spectralRollOff"] == true ? extractSpectralRollOff(from: segmentData, sampleRate: sampleRate) : 0
        let spectralBandwidth = featureOptions["spectralBandwidth"] == true ? extractSpectralBandwidth(from: segmentData, sampleRate: sampleRate) : 0
        let chromagram = featureOptions["chromagram"] == true ? extractChromagram(from: segmentData, sampleRate: sampleRate) : []
        let tempo = featureOptions["tempo"] == true ? extractTempo(from: segmentData, sampleRate: sampleRate) : 0
        let hnr = featureOptions["hnr"] == true ? extractHNR(from: segmentData) : 0
        let melSpectrogram = featureOptions["melSpectrogram"] == true ? computeMelSpectrogram(from: segmentData, sampleRate: sampleRate) : []
        let spectralContrast = featureOptions["spectralContrast"] == true ? computeSpectralContrast(from: segmentData, sampleRate: sampleRate) : []
        let tonnetz = featureOptions["tonnetz"] == true ? computeTonnetz(from: segmentData, sampleRate: sampleRate) : []
        let pitch = featureOptions["pitch"] == true ? estimatePitch(from: segmentData, sampleRate: sampleRate) : 0
        
        // Calculate min and max amplitudes from the segment data
        let minAmplitude = segmentData.map(abs).min() ?? 0
        let maxAmplitude = segmentData.map(abs).max() ?? 0
        
        // Simple checksum computation
        let checksum = segmentData.reduce(0) { ($0 &+ Int32(bitPattern: $1.bitPattern)) }
        
        return Features(
            energy: energy,
            mfcc: mfcc,
            rms: rms,
            minAmplitude: minAmplitude,
            maxAmplitude: maxAmplitude,
            zcr: zcr,
            spectralCentroid: spectralCentroid,
            spectralFlatness: spectralFlatness,
            spectralRollOff: spectralRollOff,
            spectralBandwidth: spectralBandwidth,
            chromagram: chromagram,
            tempo: tempo,
            hnr: hnr,
            melSpectrogram: melSpectrogram,
            spectralContrast: spectralContrast,
            tonnetz: tonnetz,
            pitch: pitch,
            dataChecksum: checksum
        )
    }
    
    private func resetSegmentData(_ sumSquares: inout Float, _ zeroCrossings: inout Int, _ localMinAmplitude: inout Float, _ localMaxAmplitude: inout Float, _ segmentData: inout [Float]) {
        sumSquares = 0
        zeroCrossings = 0
        localMinAmplitude = .greatestFiniteMagnitude
        localMaxAmplitude = -.greatestFiniteMagnitude
        segmentData.removeAll()
    }

    /// Processes audio data with time range support
    public func processAudioData(
        startTimeMs: Double? = nil,
        endTimeMs: Double? = nil,
        pointsPerSecond: Int? = nil,
        algorithm: String,
        featureOptions: [String: Bool]
    ) -> AudioAnalysisData? {
        guard let audioFile = audioFile else {
            Logger.debug("No audio file loaded")
            return nil
        }

        let startTime = CACurrentMediaTime()
        let sampleRate = Float(audioFile.fileFormat.sampleRate)
        let totalFrameCount = AVAudioFrameCount(audioFile.length)
        let bitDepth = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16
        let numberOfChannels = Int(audioFile.fileFormat.channelCount)
        
        // Convert time to frames
        let startFrame = startTimeMs.map { AVAudioFramePosition(Double($0) * Double(sampleRate) / 1000.0) } ?? 0
        let endFrame = endTimeMs.map { AVAudioFramePosition(Double($0) * Double(sampleRate) / 1000.0) } ?? audioFile.length
        
        // Validate frame range
        guard startFrame >= 0 && endFrame <= audioFile.length && startFrame < endFrame else {
            Logger.debug("Invalid time range")
            return nil
        }

        // Calculate frames per buffer based on points per second
        let actualPointsPerSecond = pointsPerSecond ?? 20
        let framesPerBuffer = AVAudioFrameCount((endFrame - startFrame) / Int64(actualPointsPerSecond))
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: framesPerBuffer) else {
            Logger.debug("Failed to create buffer")
            return nil
        }

        var dataPoints: [DataPoint] = []
        var minAmplitude: Float = .greatestFiniteMagnitude
        var maxAmplitude: Float = -.greatestFiniteMagnitude
        var currentId = 0

        audioFile.framePosition = startFrame
        var currentFrame = startFrame

        while currentFrame < endFrame {
            let framesToRead = min(framesPerBuffer, AVAudioFrameCount(endFrame - currentFrame))
            
            do {
                try audioFile.read(into: buffer, frameCount: framesToRead)
                
                guard let channelData = buffer.floatChannelData else {
                    continue
                }
                
                // Process each channel's data
                var summedData = [Float](repeating: 0, count: Int(framesToRead))
                for channel in 0..<numberOfChannels {
                    let channelBuffer = UnsafeBufferPointer(start: channelData[channel], count: Int(framesToRead))
                    for (index, sample) in channelBuffer.enumerated() {
                        summedData[index] += sample
                    }
                }
                
                // Average across channels
                for i in 0..<summedData.count {
                    summedData[i] /= Float(numberOfChannels)
                }
                
                // Calculate amplitude based on algorithm
                let amplitude: Float
                if algorithm.lowercased() == "peak" {
                    var localMax: Float = 0
                    vDSP_maxmgv(summedData, 1, &localMax, vDSP_Length(framesToRead))
                    amplitude = localMax
                } else {
                    var rms: Float = 0
                    vDSP_rmsqv(summedData, 1, &rms, vDSP_Length(framesToRead))
                    amplitude = rms
                }
                
                minAmplitude = min(minAmplitude, amplitude)
                maxAmplitude = max(maxAmplitude, amplitude)
                
                // Create data point
                let startTime = Float(currentFrame) / Float(sampleRate)
                let endTime = Float(currentFrame + Int64(framesToRead)) / Float(sampleRate)
                
                let dataPoint = DataPoint(
                    id: currentId,
                    amplitude: amplitude,
                    startTime: startTime,
                    endTime: endTime,
                    startPosition: Int(currentFrame),
                    endPosition: Int(currentFrame + Int64(framesToRead)),
                    samples: Int(framesToRead)
                )
                
                dataPoints.append(dataPoint)
                currentId += 1
            } catch {
                Logger.debug("Error reading audio data: \(error)")
                return nil
            }
            
            currentFrame += Int64(framesToRead)
        }
        
        let endTime = CACurrentMediaTime()
        let extractionTime = Float(endTime - startTime) * 1000 // Convert to milliseconds
        
        return AudioAnalysisData(
            pointsPerSecond: actualPointsPerSecond,
            durationMs: Float(endFrame - startFrame) * 1000 / Float(sampleRate),
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels,
            sampleRate: sampleRate,
            samples: Int(endFrame - startFrame),
            dataPoints: dataPoints,
            amplitudeRange: (min: minAmplitude, max: maxAmplitude),
            extractionTimeMs: extractionTime
        )
    }

    /// Trims audio file to specified range
    public func trimAudio(
        startTimeMs: Double,
        endTimeMs: Double,
        outputFormat: [String: Any]?
    ) -> TrimResult? {
        guard let audioFile = audioFile else {
            Logger.debug("No audio file loaded")
            return nil
        }

        let sampleRate = audioFile.fileFormat.sampleRate
        let startFrame = AVAudioFramePosition(startTimeMs * sampleRate / 1000.0)
        let endFrame = AVAudioFramePosition(endTimeMs * sampleRate / 1000.0)
        
        // Create output format
        let outputSettings = createOutputSettings(from: outputFormat, originalFormat: audioFile.fileFormat)
        
        // Create temporary output file
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("wav")
        
        do {
            let outputFile = try AVAudioFile(
                forWriting: outputURL,
                settings: outputSettings,
                commonFormat: .pcmFormatFloat32,
                interleaved: false
            )
            
            // Read and write in chunks
            let bufferSize = 32768
            let buffer = AVAudioPCMBuffer(
                pcmFormat: audioFile.processingFormat,
                frameCapacity: AVAudioFrameCount(bufferSize)
            )!
            
            audioFile.framePosition = startFrame
            var currentFrame = startFrame
            
            while currentFrame < endFrame {
                let framesToRead = min(
                    AVAudioFrameCount(bufferSize),
                    AVAudioFrameCount(endFrame - currentFrame)
                )
                
                try audioFile.read(into: buffer, frameCount: framesToRead)
                try outputFile.write(from: buffer)
                
                currentFrame += Int64(framesToRead)
            }
            
            // Get file size
            let attributes = try FileManager.default.attributesOfItem(atPath: outputURL.path)
            let fileSize = attributes[.size] as! Int64
            
            return TrimResult(
                uri: outputURL.absoluteString,
                duration: Double(endFrame - startFrame) / sampleRate,
                size: fileSize
            )
            
        } catch {
            Logger.debug("Error trimming audio: \(error)")
            return nil
        }
    }

    private func createOutputSettings(
        from options: [String: Any]?,
        originalFormat: AVAudioFormat
    ) -> [String: Any] {
        var settings: [String: Any] = [:]
        
        // Use original format settings as defaults
        settings[AVFormatIDKey] = kAudioFormatLinearPCM
        settings[AVSampleRateKey] = options?["sampleRate"] as? Double ?? originalFormat.sampleRate
        settings[AVNumberOfChannelsKey] = options?["channels"] as? Int ?? originalFormat.channelCount
        settings[AVLinearPCMBitDepthKey] = options?["bitDepth"] as? Int ?? 16
        settings[AVLinearPCMIsFloatKey] = false
        settings[AVLinearPCMIsBigEndianKey] = false
        settings[AVLinearPCMIsNonInterleaved] = false
        
        return settings
    }

    /// Extracts a preview of the audio data with consistent time range support
    /// - Parameters:
    ///   - numberOfPoints: The number of points to extract
    ///   - startTimeMs: Optional start time in milliseconds
    ///   - endTimeMs: Optional end time in milliseconds
    ///   - algorithm: The algorithm to use for feature extraction
    ///   - featureOptions: The features to extract
    /// - Returns: An `AudioAnalysisData` object containing the extracted features
    public func extractPreview(numberOfPoints: Int, startTimeMs: Double? = nil, endTimeMs: Double? = nil, algorithm: String, featureOptions: [String: Bool]) -> AudioAnalysisData? {
        guard let audioFile = audioFile else {
            reject("FILE_NOT_INITIALIZED", "Audio file is not initialized.")
            return nil
        }
        
        let sampleRate = Float(audioFile.fileFormat.sampleRate)
        let totalDurationMs = Double(audioFile.length) / Double(sampleRate) * 1000
        
        // Calculate effective time range
        let effectiveStartMs = startTimeMs ?? 0.0
        let effectiveEndMs = min(endTimeMs ?? totalDurationMs, totalDurationMs)
        let durationMs = effectiveEndMs - effectiveStartMs
        
        // Convert time to frames
        let startFrame = AVAudioFramePosition(effectiveStartMs * Double(sampleRate) / 1000.0)
        let endFrame = AVAudioFramePosition(effectiveEndMs * Double(sampleRate) / 1000.0)
        let samplesInRange = Int(endFrame - startFrame)
        
        guard samplesInRange > 0 else {
            reject("INVALID_RANGE", "Invalid sample range: contains no samples")
            return nil
        }
        
        // Calculate exact samples per point to get the requested number of points
        let samplesPerPoint = samplesInRange / numberOfPoints
        var dataPoints = [DataPoint]()
        dataPoints.reserveCapacity(numberOfPoints)
        
        var minAmplitude: Float = .greatestFiniteMagnitude
        var maxAmplitude: Float = -.greatestFiniteMagnitude
        
        for i in 0..<numberOfPoints {
            let pointStartFrame = startFrame + Int64(i * samplesPerPoint)
            let pointEndFrame = startFrame + Int64((i + 1) * samplesPerPoint)
            let framesToRead = AVAudioFrameCount(pointEndFrame - pointStartFrame)
            
            do {
                audioFile.framePosition = pointStartFrame
                let buffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: framesToRead)!
                try audioFile.read(into: buffer, frameCount: framesToRead)
                
                guard let floatData = buffer.floatChannelData else { continue }
                
                var sumSquares: Float = 0
                var zeroCrossings = 0
                var prevValue: Float = 0
                var localMinAmplitude: Float = .greatestFiniteMagnitude
                var localMaxAmplitude: Float = -.greatestFiniteMagnitude
                
                // Process samples for this point
                for frame in 0..<Int(framesToRead) {
                    let value = floatData[0][frame]
                    sumSquares += value * value
                    if frame > 0 && value * prevValue < 0 {
                        zeroCrossings += 1
                    }
                    prevValue = value
                    
                    let absValue = abs(value)
                    localMinAmplitude = min(localMinAmplitude, absValue)
                    localMaxAmplitude = max(localMaxAmplitude, absValue)
                }
                
                let features = computeFeatures(segmentData: Array(UnsafeBufferPointer(start: floatData[0], count: Int(framesToRead))), 
                                            sampleRate: sampleRate,
                                            sumSquares: sumSquares,
                                            zeroCrossings: zeroCrossings,
                                            segmentLength: Int(framesToRead),
                                            featureOptions: featureOptions)
                
                let rms = features.rms
                let silent = rms < 0.01
                let dB = Float(20 * log10(Double(rms)))
                
                let segmentStartTime = Float(pointStartFrame) / sampleRate
                let segmentEndTime = Float(pointEndFrame) / sampleRate
                
                let dataPoint = DataPoint(
                    id: uniqueIdCounter,
                    amplitude: algorithm == "peak" ? localMaxAmplitude : rms,
                    activeSpeech: nil,
                    dB: dB,
                    silent: silent,
                    features: features,
                    startTime: segmentStartTime,
                    endTime: segmentEndTime,
                    startPosition: Int(pointStartFrame),
                    endPosition: Int(pointEndFrame),
                    speaker: 0,
                    samples: Int(framesToRead)
                )
                dataPoints.append(dataPoint)
                uniqueIdCounter += 1
                
                minAmplitude = min(minAmplitude, localMinAmplitude)
                maxAmplitude = max(maxAmplitude, localMaxAmplitude)
            } catch {
                reject("AUDIO_READ_ERROR", "Error reading audio data: \(error.localizedDescription)")
                return nil
            }
        }
        
        let startTime = CACurrentMediaTime() // Start timing
        
        let bitDepth = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16
        let numberOfChannels = Int(audioFile.processingFormat.channelCount)
        
        NSLog("""
            [AudioProcessor] Starting preview extraction:
            - numberOfPoints: \(numberOfPoints)
            - startTimeMs: \(String(describing: startTimeMs))
            - endTimeMs: \(String(describing: endTimeMs))
            - durationMs: \(durationMs)
            - sampleRate: \(sampleRate)
            - bitDepth: \(bitDepth)
            - channels: \(numberOfChannels)
            - samplesInRange: \(samplesInRange)
            - samplesPerPoint: \(samplesPerPoint)
        """)
        
        let endTime = CACurrentMediaTime()
        let extractionTimeMs = Float((endTime - startTime) * 1000)
        
        NSLog("""
            [AudioProcessor] Preview extraction completed:
            - dataPoints generated: \(dataPoints.count)
            - extractionTimeMs: \(String(format: "%.2f", extractionTimeMs))ms
            - amplitudeRange: (min: \(String(format: "%.6f", minAmplitude)), max: \(String(format: "%.6f", maxAmplitude)))
        """)
        
        return AudioAnalysisData(
            pointsPerSecond: numberOfPoints,
            durationMs: Float(durationMs),
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels,
            sampleRate: sampleRate,
            samples: samplesInRange,
            dataPoints: dataPoints,
            amplitudeRange: (min: minAmplitude, max: maxAmplitude),
            speakerChanges: [],
            extractionTimeMs: extractionTimeMs
        )
    }
}
