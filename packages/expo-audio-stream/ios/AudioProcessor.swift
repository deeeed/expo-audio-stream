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
    ///   - segmentDurationMs: The duration of each segment in milliseconds.
    ///   - featureOptions: The features to extract.
    ///   - bitDepth: The bit depth of the audio data.
    ///   - numberOfChannels: The number of channels in the audio data.
    ///   - position: The position to start reading from (in bytes).
    ///   - byteLength: The length of the audio to read (in bytes).
    /// - Returns: An `AudioAnalysisData` object containing the extracted features.
    public func processAudioData(
        numberOfSamples: Int?, 
        offset: Int? = 0, 
        length: UInt? = nil, 
        segmentDurationMs: Int = 100, // Default 100ms
        featureOptions: [String: Bool],
        bitDepth: Int,
        numberOfChannels: Int,
        position: Int? = nil,
        byteLength: Int? = nil
    ) -> AudioAnalysisData? {
        guard let audioFile = audioFile else {
            reject("FILE_NOT_INITIALIZED", "Audio file is not initialized.")
            return nil
        }
        
        let totalFrameCount = AVAudioFrameCount(audioFile.length)
        var framesPerBuffer: AVAudioFrameCount
        let actualPointsPerSecond: Int
        
        NSLog("""
            [AudioProcessor] Starting audio processing:
            - totalFrameCount: \(totalFrameCount)
            - bitDepth: \(bitDepth)
            - numberOfChannels: \(numberOfChannels)
            - position: \(position ?? -1)
            - byteLength: \(byteLength ?? -1)
            - offset: \(offset ?? -1)
            - length: \(length ?? 0)
        """)
        
        // Use position/byteLength if provided, otherwise fall back to offset/length
        let effectiveOffset: Int64 = if let position = position {
            Int64(position / (bitDepth / 8) / numberOfChannels)
        } else {
            Int64(offset ?? 0)
        }
        
        let effectiveLength: Int64 = if let byteLength = byteLength {
            Int64(byteLength / (bitDepth / 8) / numberOfChannels)
        } else if let length = length {
            Int64(length)
        } else {
            Int64(totalFrameCount) - effectiveOffset
        }
        
        NSLog("""
            [AudioProcessor] Calculated frame positions:
            - effectiveOffset: \(effectiveOffset)
            - effectiveLength: \(effectiveLength)
            - expectedEndFrame: \(effectiveOffset + effectiveLength)
            - totalFrameCount: \(totalFrameCount)
        """)
        
        // Validate frame boundaries
        if effectiveOffset < 0 || effectiveOffset >= Int64(totalFrameCount) {
            NSLog("[AudioProcessor] ERROR: Invalid offset value")
            reject("INVALID_OFFSET", "Offset value (\(effectiveOffset)) is outside valid range [0, \(totalFrameCount)]")
            return nil
        }
        
        if effectiveLength <= 0 {
            NSLog("[AudioProcessor] ERROR: Invalid length value")
            reject("INVALID_LENGTH", "Length value (\(effectiveLength)) must be positive")
            return nil
        }
        
        if effectiveOffset + effectiveLength > Int64(totalFrameCount) {
            NSLog("[AudioProcessor] ERROR: Requested range exceeds file length")
            reject("INVALID_RANGE", "Requested range [\(effectiveOffset), \(effectiveOffset + effectiveLength)] exceeds file length \(totalFrameCount)")
            return nil
        }
        
        var startFrame: AVAudioFramePosition = effectiveOffset
        let endFrame: AVAudioFramePosition = effectiveOffset + effectiveLength
        
        // Calculate frames per segment based on segment duration
        let framesPerSegment = AVAudioFrameCount(Float(audioFile.fileFormat.sampleRate) * Float(segmentDurationMs) / 1000.0)
        
        if let numberOfSamples = numberOfSamples {
            framesPerBuffer = AVAudioFrameCount(max(1, effectiveLength / Int64(numberOfSamples)))
        } else {
            framesPerBuffer = framesPerSegment
        }
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: framesPerBuffer) else {
            reject("BUFFER_CREATION_FAILED", "Failed to create AVAudioPCMBuffer.")
            return nil
        }
        
        channelCount = Int(audioFile.processingFormat.channelCount)
        var data = Array(repeating: [Float](repeating: 0, count: Int(framesPerBuffer)), count: channelCount)
        
        var channelData = [Float]()
        while startFrame < endFrame {
            let remainingFrames = endFrame - startFrame
            let currentFramesPerBuffer = min(AVAudioFrameCount(framesPerBuffer), AVAudioFrameCount(remainingFrames))
            
            if currentFramesPerBuffer <= 0 {
                break
            }
            
            if abortExtraction {
                audioFile.framePosition = startFrame
                abortExtraction = false
                return nil
            }
            
            do {
                audioFile.framePosition = startFrame
                try audioFile.read(into: buffer, frameCount: currentFramesPerBuffer)
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
            
            startFrame += AVAudioFramePosition(currentFramesPerBuffer)
        }
        
        NSLog("""
            [AudioProcessor] Audio processing completed:
            - processedFrames: \(endFrame - startFrame)
            - framesPerBuffer: \(framesPerBuffer)
        """)
        
        return processChannelData(
            channelData: channelData,
            sampleRate: Float(audioFile.fileFormat.sampleRate),
            segmentDurationMs: segmentDurationMs,
            featureOptions: featureOptions,
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels
        )
    }
    
    /// Processes audio data from a buffer.
    /// - Parameters:
    ///   - data: The audio data buffer.
    ///   - sampleRate: The sample rate of the audio data.
    ///   - segmentDurationMs: The duration of each segment in milliseconds.
    ///   - featureOptions: The features to extract.
    ///   - bitDepth: The bit depth of the audio data.
    ///   - numberOfChannels: The number of channels in the audio data.
    /// - Returns: An `AudioAnalysisData` object containing the extracted features.
    public func processAudioBuffer(
        data: Data,
        sampleRate: Float,
        segmentDurationMs: Int,
        featureOptions: [String: Bool],
        bitDepth: Int,
        numberOfChannels: Int
    ) -> AudioAnalysisData? {
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

        return processChannelData(
            channelData: floatData,
            sampleRate: sampleRate,
            segmentDurationMs: segmentDurationMs,
            featureOptions: featureOptions,
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels
        )
    }

    /// Processes the given audio channel data to extract features.
    /// - Parameters:
    ///   - channelData: The audio channel data to process.
    ///   - sampleRate: The sample rate of the audio data.
    ///   - segmentDurationMs: The duration of each segment in milliseconds.
    ///   - featureOptions: The features to extract.
    ///   - bitDepth: The bit depth of the audio data.
    ///   - numberOfChannels: The number of channels in the audio data.
    /// - Returns: An `AudioAnalysisData` object containing the extracted features.
    private func processChannelData(
        channelData: [Float],
        sampleRate: Float,
        segmentDurationMs: Int,
        featureOptions: [String: Bool],
        bitDepth: Int,
        numberOfChannels: Int
    ) -> AudioAnalysisData? {
        Logger.debug("Processing audio data with sample rate: \(sampleRate), segmentDurationMs: \(segmentDurationMs), bitDepth: \(bitDepth), numberOfChannels: \(numberOfChannels)")
        
        let startTime = CACurrentMediaTime()

        let length = channelData.count
        // Calculate points per segment based on segment duration
        let samplesPerSegment = Int(Float(segmentDurationMs) * sampleRate / 1000.0)
        var dataPoints = [DataPoint]()
        var minAmplitude: Float = .greatestFiniteMagnitude
        var maxAmplitude: Float = -.greatestFiniteMagnitude
        
        // Calculate bytes per sample
        let bytesPerSample = bitDepth / 8
        
        // Process data in segments
        var i = 0
        while i < length {
            let segmentEnd = min(i + samplesPerSegment, length)
            let segment = Array(channelData[i..<segmentEnd])
            
            // Calculate byte positions and timing
            let startPosition = i * bytesPerSample * numberOfChannels
            let endPosition = segmentEnd * bytesPerSample * numberOfChannels
            let startTime = Float(i) / sampleRate
            let endTime = Float(segmentEnd) / sampleRate
            
            // Process segment and create data point
            let dataPoint = processSegment(
                segment,
                sampleRate: sampleRate,
                featureOptions: featureOptions,
                startTime: startTime,
                endTime: endTime,
                startPosition: startPosition,
                endPosition: endPosition
            )
            dataPoints.append(dataPoint)
            
            // Update min/max amplitudes
            minAmplitude = min(minAmplitude, segment.min() ?? minAmplitude)
            maxAmplitude = max(maxAmplitude, segment.max() ?? maxAmplitude)
            
            i += samplesPerSegment
        }
        
        let endTime = CACurrentMediaTime()
        let processingTimeMs = Float((endTime - startTime) * 1000)

        Logger.debug("Processed \(dataPoints.count) data points in \(processingTimeMs) ms")

        return AudioAnalysisData(
            segmentDurationMs: segmentDurationMs,
            durationMs: Int(Float(length) / sampleRate * 1000),
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels,
            sampleRate: Int(sampleRate),
            samples: length,
            dataPoints: dataPoints,
            amplitudeRange: AudioAnalysisData.AmplitudeRange(
                min: minAmplitude,
                max: maxAmplitude
            ),
            rmsRange: AudioAnalysisData.AmplitudeRange(
                min: 0,
                max: 1
            ),
            speechAnalysis: nil,
            extractionTimeMs: processingTimeMs
        )
    }
    
    private func processSegment(
        _ segment: [Float],
        sampleRate: Float,
        featureOptions: [String: Bool],
        startTime: Float,
        endTime: Float,
        startPosition: Int,
        endPosition: Int
    ) -> DataPoint {
        let sumSquares: Float = segment.reduce(0) { $0 + $1 * $1 }
        let rms = sqrt(sumSquares / Float(segment.count))
        let silent = rms < 0.01
        let dB = Float(20 * log10(Double(rms)))
        
        let features = computeFeatures(
            segmentData: segment,
            sampleRate: sampleRate,
            sumSquares: sumSquares,
            zeroCrossings: 0,
            segmentLength: segment.count,
            featureOptions: featureOptions
        )
        
        let dataPoint = DataPoint(
            id: Int(uniqueIdCounter),
            amplitude: segment.max() ?? 0,
            rms: rms,
            dB: dB,
            silent: silent,
            features: features,
            speech: SpeechFeatures(isActive: !silent),
            startTime: startTime,
            endTime: endTime,
            startPosition: startPosition,
            endPosition: endPosition,
            samples: segment.count
        )
        uniqueIdCounter += 1
        return dataPoint
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
    
    /// Processes audio data with time range support
    public func processAudioData(
        startTimeMs: Double? = nil,
        endTimeMs: Double? = nil,
        segmentDurationMs: Int = 100, // Default 100ms
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

        // Calculate frames per buffer based on segment duration
        let framesPerBuffer = AVAudioFrameCount(Float(sampleRate) * Float(segmentDurationMs) / 1000.0)
        
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
                
                // Calculate both peak amplitude and RMS
                var localMax: Float = 0
                var rms: Float = 0
                vDSP_maxmgv(summedData, 1, &localMax, vDSP_Length(framesToRead))

                // Calculate RMS using vDSP
                var meanSquare: Float = 0
                vDSP_measqv(summedData, 1, &meanSquare, vDSP_Length(framesToRead))
                rms = sqrt(meanSquare)
                
                minAmplitude = min(minAmplitude, localMax)
                maxAmplitude = max(maxAmplitude, localMax)
                
                // Create data point
                let startTime = Float(currentFrame) / Float(sampleRate)
                let endTime = Float(currentFrame + Int64(framesToRead)) / Float(sampleRate)
                
                let dataPoint = DataPoint(
                    id: currentId,
                    amplitude: localMax,      // Always use peak amplitude
                    rms: rms,                // Use calculated RMS value
                    dB: Float(20 * log10(Double(rms))),  // Use RMS for dB calculation
                    silent: rms < 0.01,      // Use RMS for silence detection
                    features: computeFeatures(
                        segmentData: Array(UnsafeBufferPointer(start: summedData, count: Int(framesToRead))),
                        sampleRate: sampleRate,
                        sumSquares: rms * rms,
                        zeroCrossings: 0,
                        segmentLength: Int(framesToRead),
                        featureOptions: featureOptions
                    ),
                    speech: SpeechFeatures(isActive: rms >= 0.01),
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
            segmentDurationMs: segmentDurationMs,
            durationMs: Int(Float(endFrame - startFrame) * 1000 / sampleRate),
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels,
            sampleRate: Int(sampleRate),
            samples: Int(endFrame - startFrame),
            dataPoints: dataPoints,
            amplitudeRange: AudioAnalysisData.AmplitudeRange(
                min: minAmplitude,
                max: maxAmplitude
            ),
            rmsRange: AudioAnalysisData.AmplitudeRange(
                min: 0,
                max: 1
            ),
            speechAnalysis: nil,
            extractionTimeMs: extractionTime
        )
    }

    /// Trims audio file to specified range
    public func trimAudio(
        startTimeMs: Double,
        endTimeMs: Double,
        outputFormat: [String: Any]?
    ) -> TrimResult? {
        guard let currentAudioFile = audioFile else {
            Logger.debug("No audio file loaded")
            return nil
        }

        let sampleRate = currentAudioFile.fileFormat.sampleRate
        let startFrame = AVAudioFramePosition(startTimeMs * sampleRate / 1000.0)
        let endFrame = AVAudioFramePosition(endTimeMs * sampleRate / 1000.0)
        
        // Create output format
        let outputSettings = createOutputSettings(from: outputFormat, originalFormat: currentAudioFile.fileFormat)
        
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
                pcmFormat: currentAudioFile.processingFormat,
                frameCapacity: AVAudioFrameCount(bufferSize)
            )!
            
            currentAudioFile.framePosition = startFrame
            var currentFrame = startFrame
            
            while currentFrame < endFrame {
                let framesToRead = min(
                    AVAudioFrameCount(bufferSize),
                    AVAudioFrameCount(endFrame - currentFrame)
                )
                
                try currentAudioFile.read(into: buffer, frameCount: framesToRead)
                try outputFile.write(from: buffer)
                
                currentFrame += Int64(framesToRead)
            }
            
            // Get file size
            let attributes = try FileManager.default.attributesOfItem(atPath: outputURL.path)
            let fileSize = attributes[.size] as! Int64
            
            // After successful trim, update the class property
            audioFile = try AVAudioFile(forReading: outputURL)
            
            // After successful trim, create the result
            let trimmedDuration = (endTimeMs - startTimeMs) / 1000.0 // Convert to seconds
            let result = TrimResult(
                uri: outputURL.absoluteString,
                duration: trimmedDuration, // Use actual trimmed duration
                size: fileSize
            )
            
            return result
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
    ///   - featureOptions: The features to extract
    /// - Returns: An `AudioAnalysisData` object containing the extracted features
    public func extractPreview(
        numberOfPoints: Int,
        startTimeMs: Double? = nil,
        endTimeMs: Double? = nil,
        featureOptions: [String: Bool]
    ) -> AudioAnalysisData? {
        guard let audioFile = audioFile else {
            reject("FILE_NOT_INITIALIZED", "Audio file is not initialized.")
            return nil
        }
        
        let sampleRate = Float(audioFile.fileFormat.sampleRate)
        let totalDurationMs = Double(audioFile.length) / Double(sampleRate) * 1000
        
        // Calculate effective time range
        let effectiveStartMs = startTimeMs ?? 0.0
        let effectiveEndMs = min(endTimeMs ?? totalDurationMs, totalDurationMs)
        let durationMs = effectiveEndMs - effectiveStartMs // This is the actual duration we want to use
        
        // Convert time to frames with proper offset
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
        
        let bytesPerSample = audioFile.fileFormat.settings[AVLinearPCMBitDepthKey] as? Int ?? 16 / 8
        
        for i in 0..<numberOfPoints {
            let pointStartFrame = startFrame + Int64(i * samplesPerPoint)
            let pointEndFrame = startFrame + Int64((i + 1) * samplesPerPoint)
            let framesToRead = AVAudioFrameCount(pointEndFrame - pointStartFrame)
            
            // Calculate byte positions
            let startPosition = Int(pointStartFrame) * bytesPerSample * Int(audioFile.fileFormat.channelCount)
            let endPosition = Int(pointEndFrame) * bytesPerSample * Int(audioFile.fileFormat.channelCount)
            let segmentStartTime = Float(pointStartFrame) / sampleRate
            let segmentEndTime = Float(pointEndFrame) / sampleRate
            
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
                
                let dataPoint = DataPoint(
                    id: Int(uniqueIdCounter),
                    amplitude: localMaxAmplitude,
                    rms: rms,
                    dB: dB,
                    silent: silent,
                    features: features,
                    speech: SpeechFeatures(isActive: !silent),
                    startTime: segmentStartTime,
                    endTime: segmentEndTime,
                    startPosition: startPosition,
                    endPosition: endPosition,
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
            segmentDurationMs: 100, // Default 100ms
            durationMs: Int(durationMs), // Use actual duration of trimmed section
            bitDepth: bitDepth,
            numberOfChannels: numberOfChannels,
            sampleRate: Int(sampleRate),
            samples: samplesInRange,
            dataPoints: dataPoints,
            amplitudeRange: AudioAnalysisData.AmplitudeRange(
                min: minAmplitude,
                max: maxAmplitude
            ),
            rmsRange: AudioAnalysisData.AmplitudeRange(
                min: 0,
                max: 1
            ),
            speechAnalysis: nil,
            extractionTimeMs: extractionTimeMs
        )
    }
}
