// packages/expo-audio-stream/ios/AudioProcessor.swift

import Foundation
import Accelerate
import AVFoundation
import QuartzCore

public struct TrimResult {
    let uri: String
    let filename: String
    let durationMs: Double
    let size: Int64
    let sampleRate: Int
    let channels: Int
    let bitDepth: Int
    let mimeType: String
    let requestedFormat: String
    let actualFormat: String
    let compression: [String: Any]?

    init(
        uri: String,
        filename: String,
        durationMs: Double,
        size: Int64,
        sampleRate: Int,
        channels: Int,
        bitDepth: Int,
        mimeType: String,
        requestedFormat: String,
        actualFormat: String,
        compression: [String: Any]?
    ) {
        self.uri = uri
        self.filename = filename
        self.durationMs = durationMs
        self.size = size
        self.sampleRate = sampleRate
        self.channels = channels
        self.bitDepth = bitDepth
        self.mimeType = mimeType
        self.requestedFormat = requestedFormat
        self.actualFormat = actualFormat
        self.compression = compression
    }

    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "uri": uri,
            "filename": filename,
            "durationMs": durationMs,
            "size": size,
            "sampleRate": sampleRate,
            "channels": channels,
            "bitDepth": bitDepth,
            "mimeType": mimeType,
            "requestedFormat": requestedFormat,
            "actualFormat": actualFormat
        ]
        if let compression = compression {
            dict["compression"] = compression
        }
        return dict
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
    
    private func computeFeatures(
        segmentData: [Float], 
        sampleRate: Float,
        sumSquares: Float,
        zeroCrossings: Int,
        segmentLength: Int,
        featureOptions: [String: Bool]
    ) -> Features {
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
        
        let crc32Value = featureOptions["crc32"] == true ? 
            calculateCRC32(from: segmentData, count: segmentData.count) : nil
        
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
            crc32: crc32Value
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
        mode: String,
        startTimeMs: Double?,
        endTimeMs: Double?,
        ranges: [[String: Double]]?,
        outputFileName: String?,
        outputFormat: [String: Any]?,
        decodingOptions: [String: Any]?,
        progressCallback: ((Float, Int64, Int64) -> Void)? = nil
    ) -> TrimResult? {
        // Log the input parameters
        Logger.debug("Starting audio trim operation:")
        Logger.debug("- Mode: \(mode)")
        if let start = startTimeMs, let end = endTimeMs {
            Logger.debug("- Time range: \(start)ms to \(end)ms")
        }
        if let ranges = ranges {
            Logger.debug("- Ranges count: \(ranges.count)")
        }
        
        // Log output format details
        if let format = outputFormat {
            let formatType = format["format"] as? String ?? "unknown"
            let bitrate = format["bitrate"] as? Int ?? 0
            Logger.debug("- Output format: \(formatType), bitrate: \(bitrate)")
        }
        
        guard let audioFile = audioFile else { return nil }

        let inputFormat = audioFile.processingFormat
        let inputSampleRate = inputFormat.sampleRate
        let inputChannels = Int(inputFormat.channelCount)
        let totalDurationMs = Double(audioFile.length) / inputSampleRate * 1000

        // Compute ranges to keep
        let keepRanges = computeKeepRanges(
            mode: mode,
            startTimeMs: startTimeMs,
            endTimeMs: endTimeMs,
            ranges: ranges,
            totalDurationMs: totalDurationMs
        )

        guard !keepRanges.isEmpty else { return nil }

        // Output format setup
        let requestedFormat = outputFormat?["format"] as? String ?? "wav"
        let validFormats = ["wav", "aac", "opus"]
        let formatStr = validFormats.contains(requestedFormat.lowercased()) ? requestedFormat.lowercased() : "aac"

        if formatStr != requestedFormat.lowercased() {
            Logger.debug("Unsupported format '\(requestedFormat)', falling back to 'aac'")
        }

        let targetSampleRate = outputFormat?["sampleRate"] as? Double ?? inputSampleRate
        let targetChannels = outputFormat?["channels"] as? Int ?? inputChannels
        let targetBitDepth = outputFormat?["bitDepth"] as? Int ?? 16
        let bitrate = outputFormat?["bitrate"] as? Int ?? 128000

        let fileExtension = formatStr == "wav" ? "wav" : (formatStr == "aac" ? "aac" : "opus")
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(outputFileName ?? UUID().uuidString)
            .appendingPathExtension(fileExtension)

        let decodingConfig = DecodingConfig.fromDictionary(decodingOptions ?? [:])
        let needFormatChange = decodingConfig.targetSampleRate != nil || decodingConfig.targetChannels != nil || decodingConfig.targetBitDepth != nil
        let isWavInput = audioFile.fileFormat.settings[AVFormatIDKey] as? UInt32 == kAudioFormatLinearPCM

        do {
            if isWavInput && formatStr == "wav" && !needFormatChange {
                // Fast path: WAV-to-WAV with no format changes
                let outputFile = try AVAudioFile(forWriting: outputURL, settings: inputFormat.settings)
                var totalFrames: Int64 = 0
                for range in keepRanges {
                    // Break down complex expression
                    let startTimeInSeconds = range[0] / 1000
                    let endTimeInSeconds = range[1] / 1000
                    let startFramePosition = startTimeInSeconds * inputSampleRate
                    let endFramePosition = endTimeInSeconds * inputSampleRate
                    totalFrames += Int64(endFramePosition - startFramePosition)
                }
                var cumulativeFrames: Int64 = 0

                for range in keepRanges {
                    // Break down complex expressions
                    let startTimeInSeconds = range[0] / 1000
                    let startFrame = AVAudioFramePosition(startTimeInSeconds * inputSampleRate)
                    
                    let endTimeInSeconds = range[1] / 1000
                    let endFramePosition = endTimeInSeconds * inputSampleRate
                    let frameCount = AVAudioFrameCount(endFramePosition - Double(startFrame))
                    
                    let buffer = AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: frameCount)!
                    audioFile.framePosition = startFrame
                    try audioFile.read(into: buffer, frameCount: frameCount)
                    try outputFile.write(from: buffer)
                    cumulativeFrames += Int64(frameCount)
                    let progress = Float(cumulativeFrames) / Float(totalFrames) * 100
                    progressCallback?(progress, Int64(frameCount) * Int64(inputFormat.streamDescription.pointee.mBytesPerFrame), totalFrames * Int64(inputFormat.streamDescription.pointee.mBytesPerFrame))
                }

                // When creating the output file
                Logger.debug("Creating output file at: \(outputURL.path)")
                
                // After processing is complete
                Logger.debug("Trim operation completed")
                Logger.debug("- Output file: \(outputURL.path)")
                Logger.debug("- File exists: \(FileManager.default.fileExists(atPath: outputURL.path))")
                Logger.debug("- File size: \(try? FileManager.default.attributesOfItem(atPath: outputURL.path)[.size] as? Int64 ?? 0) bytes")
                Logger.debug("- File extension: \(outputURL.pathExtension)")
                
                return createTrimResult(from: outputURL, keepRanges: keepRanges, formatStr: formatStr, sampleRate: Int(inputSampleRate), channels: inputChannels, bitDepth: 16, bitrate: bitrate)
            } else {
                // Non-fast path: Decode and re-encode
                let targetFormat = AVAudioFormat(
                    commonFormat: .pcmFormatFloat32,
                    sampleRate: targetSampleRate,
                    channels: AVAudioChannelCount(targetChannels),
                    interleaved: false
                )!

                var totalFrames: Int64 = 0
                for range in keepRanges {
                    // Break down complex expression
                    let startTimeInSeconds = range[0] / 1000
                    let endTimeInSeconds = range[1] / 1000
                    let startFramePosition = startTimeInSeconds * inputSampleRate
                    let endFramePosition = endTimeInSeconds * inputSampleRate
                    totalFrames += Int64(endFramePosition - startFramePosition)
                }
                var cumulativeFrames: Int64 = 0

                if formatStr == "wav" {
                    let outputFile = try AVAudioFile(forWriting: outputURL, settings: [
                        AVFormatIDKey: kAudioFormatLinearPCM,
                        AVSampleRateKey: targetSampleRate,
                        AVNumberOfChannelsKey: targetChannels,
                        AVLinearPCMBitDepthKey: targetBitDepth,
                        AVLinearPCMIsFloatKey: false,
                        AVLinearPCMIsBigEndianKey: false
                    ])

                    for range in keepRanges {
                        // Break down complex expressions
                        let startTimeInSeconds = range[0] / 1000
                        let startFrame = AVAudioFramePosition(startTimeInSeconds * inputSampleRate)
                        
                        let endTimeInSeconds = range[1] / 1000
                        let endFramePosition = endTimeInSeconds * inputSampleRate
                        let frameCount = AVAudioFrameCount(endFramePosition - Double(startFrame))
                        
                        let buffer = AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: frameCount)!
                        audioFile.framePosition = startFrame
                        try audioFile.read(into: buffer, frameCount: frameCount)
                        let converter = AVAudioConverter(from: inputFormat, to: targetFormat)!
                        let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount)!
                        try converter.convert(to: convertedBuffer, from: buffer)
                        try outputFile.write(from: convertedBuffer)
                        cumulativeFrames += Int64(frameCount)
                        let progress = Float(cumulativeFrames) / Float(totalFrames) * 100
                        progressCallback?(progress, 0, totalFrames * Int64(inputFormat.streamDescription.pointee.mBytesPerFrame))
                    }
                    return createTrimResult(from: outputURL, keepRanges: keepRanges, formatStr: formatStr, sampleRate: Int(targetSampleRate), channels: targetChannels, bitDepth: targetBitDepth, bitrate: bitrate)
                } else {
                    // AAC or Opus output
                    let outputSettings: [String: Any]
                    let fileType: AVFileType
                    
                    if formatStr == "aac" {
                        // AAC settings
                        let outputExtension = "m4a"
                        let tempOutputURL = FileManager.default.temporaryDirectory
                            .appendingPathComponent(outputFileName ?? UUID().uuidString)
                            .appendingPathExtension(outputExtension)
                        
                        // Validate and adjust sample rate for AAC
                        // AAC typically supports: 8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000 Hz
                        let supportedSampleRates = [8000.0, 11025.0, 12000.0, 16000.0, 22050.0, 24000.0, 32000.0, 44100.0, 48000.0]
                        
                        // Default to 44100 if not specified
                        var sampleRate = outputFormat?["sampleRate"] as? Double ?? 44100.0
                        
                        // Find closest supported sample rate
                        if !supportedSampleRates.contains(sampleRate) {
                            let closestRate = supportedSampleRates.min(by: { abs($0 - sampleRate) < abs($1 - sampleRate) }) ?? 44100.0
                            Logger.debug("Unsupported sample rate \(sampleRate)Hz for AAC, using closest supported rate: \(closestRate)Hz")
                            sampleRate = closestRate
                        }
                        
                        // Validate channels (AAC typically supports 1 or 2 channels)
                        var channels = outputFormat?["channels"] as? Int ?? 2
                        if channels > 2 {
                            Logger.debug("AAC encoding doesn't support \(channels) channels, limiting to 2 channels")
                            channels = 2
                        } else if channels < 1 {
                            channels = 1
                        }
                        
                        // Validate bitrate (AAC typically supports 8000-320000 bps)
                        var bitrate = outputFormat?["bitrate"] as? Int ?? 128000
                        if bitrate < 8000 {
                            Logger.debug("AAC bitrate too low, setting to minimum 8000 bps")
                            bitrate = 8000
                        } else if bitrate > 320000 {
                            Logger.debug("AAC bitrate too high, setting to maximum 320000 bps")
                            bitrate = 320000
                        }
                        
                        // Set up proper audio settings for AAC
                        outputSettings = [
                            AVFormatIDKey: kAudioFormatMPEG4AAC,
                            AVSampleRateKey: sampleRate,
                            AVNumberOfChannelsKey: channels,
                            AVEncoderBitRateKey: bitrate,
                            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
                        ]
                        fileType = .m4a
                        
                        Logger.debug("""
                            Configuring AAC output:
                            - Container: m4a
                            - Format: AAC
                            - Sample rate: \(sampleRate)Hz
                            - Channels: \(channels)
                            - Bitrate: \(bitrate) bps
                            - Output path: \(tempOutputURL.path)
                            - File type: \(fileType)
                            """)
                    } else {
                        // Opus settings - use CAF container which can hold Opus
                        outputSettings = [
                            AVFormatIDKey: kAudioFormatOpus,
                            AVSampleRateKey: targetSampleRate,
                            AVNumberOfChannelsKey: targetChannels,
                            AVEncoderBitRateKey: bitrate
                        ]
                        fileType = .caf // Core Audio Format can contain Opus
                    }
                    
                    // Use proper file extension for the container format
                    let tempFileExtension = formatStr == "aac" ? "m4a" : "caf"
                    let tempOutputURL = FileManager.default.temporaryDirectory
                        .appendingPathComponent(outputFileName ?? UUID().uuidString)
                        .appendingPathExtension(tempFileExtension)
                    
                    // Create the asset writer with the appropriate file type
                    let assetWriter = try AVAssetWriter(
                        outputURL: tempOutputURL, 
                        fileType: fileType
                    )
                    
                    // Configure the writer input with better settings
                    let writerInput = AVAssetWriterInput(mediaType: .audio, outputSettings: outputSettings)
                    writerInput.expectsMediaDataInRealTime = false
                    assetWriter.add(writerInput)
                    
                    // Start the writing session
                    assetWriter.startWriting()
                    assetWriter.startSession(atSourceTime: CMTime.zero)
                    
                    // Improved buffer handling
                    let bufferSize = 32768 // Use a larger buffer for better performance
                    let pcmBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: AVAudioFrameCount(bufferSize))!

                    for range in keepRanges {
                        let startTimeInSeconds = range[0] / 1000
                        let startFrame = AVAudioFramePosition(startTimeInSeconds * inputSampleRate)
                        
                        let endTimeInSeconds = range[1] / 1000
                        let endFramePosition = endTimeInSeconds * inputSampleRate
                        let totalFramesToProcess = AVAudioFrameCount(endFramePosition - Double(startFrame))
                        
                        // Process in chunks for better memory management
                        var framesProcessed: AVAudioFrameCount = 0
                        audioFile.framePosition = startFrame
                        
                        while framesProcessed < totalFramesToProcess {
                            let framesToRead = min(AVAudioFrameCount(bufferSize), totalFramesToProcess - framesProcessed)
                            let buffer = AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: framesToRead)!
                            
                            do {
                                try audioFile.read(into: buffer, frameCount: framesToRead)
                                
                                // Convert the buffer to the target format
                                let converter = AVAudioConverter(from: inputFormat, to: targetFormat)!
                                let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: framesToRead)!
                                
                                var error: NSError?
                                let conversionStatus = converter.convert(to: convertedBuffer, error: &error) { inNumPackets, outStatus in
                                    outStatus.pointee = .haveData
                                    return buffer
                                }
                                
                                if let error = error {
                                    Logger.debug("Conversion error: \(error)")
                                    continue
                                }
                                
                                // Create a sample buffer and append to writer
                                if let sampleBuffer = createSampleBuffer(from: convertedBuffer) {
                                    // Wait until the writer is ready
                                    while !writerInput.isReadyForMoreMediaData {
                                        Thread.sleep(forTimeInterval: 0.01)
                                    }
                                    
                                    if !writerInput.append(sampleBuffer) {
                                        Logger.debug("Failed to append sample buffer: \(assetWriter.error?.localizedDescription ?? "Unknown error")")
                                    }
                                }
                                
                                framesProcessed += framesToRead
                                cumulativeFrames += Int64(framesToRead)
                                let progress = Float(cumulativeFrames) / Float(totalFrames) * 100
                                progressCallback?(progress, 0, totalFrames * Int64(inputFormat.streamDescription.pointee.mBytesPerFrame))
                                
                                if framesProcessed % 10000 == 0 { // Log every 10000 frames to avoid excessive logging
                                    Logger.debug("Processed \(framesProcessed)/\(totalFramesToProcess) frames")
                                }
                                
                            } catch {
                                Logger.debug("Error reading audio: \(error)")
                                break
                            }
                        }
                    }

                    // Finish writing properly
                    writerInput.markAsFinished()
                    let finishSemaphore = DispatchSemaphore(value: 0)
                    assetWriter.finishWriting { 
                        if let error = assetWriter.error {
                            Logger.debug("Error finishing writing: \(error)")
                        } else {
                            Logger.debug("Writing finished successfully")
                            
                            // Verify the output file
                            let fileExists = FileManager.default.fileExists(atPath: tempOutputURL.path)
                            let fileSize = (try? FileManager.default.attributesOfItem(atPath: tempOutputURL.path)[.size] as? Int64) ?? 0
                            
                            Logger.debug("""
                                Output file verification:
                                - Path: \(tempOutputURL.path)
                                - Exists: \(fileExists)
                                - Size: \(fileSize) bytes
                                - Extension: \(tempOutputURL.pathExtension)
                                """)
                        }
                        finishSemaphore.signal() 
                    }
                    finishSemaphore.wait()
                    
                    // Verify the file was created successfully
                    guard FileManager.default.fileExists(atPath: tempOutputURL.path) else {
                        reject("FILE_CREATION_FAILED", "Failed to create output file")
                        return nil
                    }
                    
                    // Create compression info
                    var compressionInfo: [String: Any] = [
                        "format": formatStr,
                        "bitrate": bitrate,
                        "size": (try? FileManager.default.attributesOfItem(atPath: tempOutputURL.path)[.size] as? Int64) ?? 0
                    ]
                    
                    // Add fallback information if applicable
                    if formatStr != requestedFormat.lowercased() {
                        compressionInfo["requestedFormat"] = requestedFormat
                        compressionInfo["fallbackReason"] = "Unsupported format"
                    }
                    
                    // Use the correct MIME type
                    let mimeType = formatStr == "aac" ? "audio/mp4" : "audio/opus"
                    
                    return TrimResult(
                        uri: tempOutputURL.absoluteString,
                        filename: tempOutputURL.lastPathComponent,
                        durationMs: keepRanges.map { $0[1] - $0[0] }.reduce(0, +),
                        size: (try? FileManager.default.attributesOfItem(atPath: tempOutputURL.path)[.size] as? Int64) ?? 0,
                        sampleRate: Int(targetSampleRate),
                        channels: targetChannels,
                        bitDepth: 16,
                        mimeType: mimeType,
                        requestedFormat: formatStr,
                        actualFormat: tempFileExtension,
                        compression: compressionInfo
                    )
                }
            }
        } catch {
            reject("TRIM_ERROR", "Failed to trim audio: \(error.localizedDescription)")
            return nil
        }
    }
    
    private func computeKeepRanges(mode: String, startTimeMs: Double?, endTimeMs: Double?, ranges: [[String: Double]]?, totalDurationMs: Double) -> [[Double]] {
        switch mode {
        case "single":
            guard let start = startTimeMs, let end = endTimeMs else { return [] }
            return [[start, end]]
        case "keep":
            return ranges?.map { [$0["startTimeMs"] ?? 0, $0["endTimeMs"] ?? totalDurationMs] } ?? []
        case "remove":
            let removeRanges = ranges?.map { [$0["startTimeMs"] ?? 0, $0["endTimeMs"] ?? totalDurationMs] }.sorted { $0[0] < $1[0] } ?? []
            var keepRanges: [[Double]] = []
            var lastEnd = 0.0
            for range in removeRanges {
                if range[0] > lastEnd {
                    keepRanges.append([lastEnd, range[0]])
                }
                lastEnd = max(lastEnd, range[1])
            }
            if lastEnd < totalDurationMs {
                keepRanges.append([lastEnd, totalDurationMs])
            }
            return keepRanges
        default:
            return []
        }
    }

    private func createTrimResult(from url: URL, keepRanges: [[Double]], formatStr: String, sampleRate: Int, channels: Int, bitDepth: Int, bitrate: Int, compression: [String: Any]? = nil) -> TrimResult {
        let durationMs = keepRanges.map { $0[1] - $0[0] }.reduce(0, +)
        let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64 ?? 0) ?? 0
        let fileExtension = formatStr == "wav" ? "wav" : (formatStr == "aac" ? "aac" : "opus")
        return TrimResult(
            uri: url.absoluteString,
            filename: url.lastPathComponent,
            durationMs: durationMs,
            size: size,
            sampleRate: sampleRate,
            channels: channels,
            bitDepth: bitDepth,
            mimeType: "audio/\(fileExtension)",
            requestedFormat: formatStr,
            actualFormat: fileExtension,
            compression: compression
        )
    }

    private func createSampleBuffer(from buffer: AVAudioPCMBuffer) -> CMSampleBuffer? {
        var formatDesc: CMAudioFormatDescription?
        CMAudioFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            asbd: buffer.format.streamDescription,
            layoutSize: 0,
            layout: nil,
            magicCookieSize: 0,
            magicCookie: nil,
            extensions: nil,
            formatDescriptionOut: &formatDesc
        )
        guard let format = formatDesc else { return nil }

        var sampleBuffer: CMSampleBuffer?
        var timingInfo = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: CMTimeScale(buffer.format.sampleRate)),
            presentationTimeStamp: .zero,
            decodeTimeStamp: .invalid
        )

        CMSampleBufferCreate(
            allocator: kCFAllocatorDefault,
            dataBuffer: nil,
            dataReady: false,
            makeDataReadyCallback: nil,
            refcon: nil,
            formatDescription: format,
            sampleCount: CMItemCount(buffer.frameLength),
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timingInfo,
            sampleSizeEntryCount: 0,
            sampleSizeArray: nil,
            sampleBufferOut: &sampleBuffer
        )
        guard let sampleBuf = sampleBuffer else { return nil }

        var dataBuffer: CMBlockBuffer?
        CMBlockBufferCreateWithMemoryBlock(
            allocator: kCFAllocatorDefault,
            memoryBlock: UnsafeMutableRawPointer(buffer.floatChannelData![0]),
            blockLength: Int(buffer.frameLength * buffer.format.streamDescription.pointee.mBytesPerFrame),
            blockAllocator: kCFAllocatorNull,
            customBlockSource: nil,
            offsetToData: 0,
            dataLength: Int(buffer.frameLength * buffer.format.streamDescription.pointee.mBytesPerFrame),
            flags: 0,
            blockBufferOut: &dataBuffer
        )
        guard let blockBuf = dataBuffer else { return nil }
        
        CMSampleBufferSetDataBuffer(sampleBuf, newValue: blockBuf)
        
        return sampleBuf
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

    // Add this helper function to the AudioProcessor class
    private func getDocumentsDirectory() -> URL {
        return FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
}
