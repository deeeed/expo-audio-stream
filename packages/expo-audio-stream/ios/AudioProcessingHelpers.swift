// packages/expo-audio-stream/ios/AudioProcessingHelpers.swift

import Accelerate
import AVFoundation

// Add constant at the top level
private let FFT_LENGTH = 1024

// FFT Helper class
private class FFT {
    private let length: Int
    private var setup: vDSP_DFT_Setup?
    
    init(_ length: Int) {
        self.length = length
        self.setup = vDSP_DFT_zop_CreateSetup(
            nil,
            vDSP_Length(length),
            vDSP_DFT_Direction.FORWARD
        )
    }
    
    deinit {
        if let setup = setup {
            vDSP_DFT_DestroySetup(setup)
        }
    }
    
    func realForward(_ data: inout [Float]) {
        var realIn = data
        var imagIn = [Float](repeating: 0.0, count: length)
        var realOut = [Float](repeating: 0.0, count: length)
        var imagOut = [Float](repeating: 0.0, count: length)
        
        // Perform FFT
        vDSP_DFT_Execute(setup!,
                        &realIn,
                        &imagIn,
                        &realOut,
                        &imagOut)
        
        // Combine real and imaginary parts
        for i in 0..<length {
            data[2*i] = realOut[i]
            if 2*i + 1 < data.count {
                data[2*i + 1] = imagOut[i]
            }
        }
    }
    
    func processSegment(_ segment: [Float]) -> [Float] {
        var fftData = segment.count < length ? 
            segment + [Float](repeating: 0, count: length - segment.count) : 
            Array(segment.prefix(length))
        realForward(&fftData)
        return fftData
    }
}

// Main feature extraction functions
func extractMFCC(from segment: [Float], sampleRate: Float) -> [Float] {
    let nMFCC = 40
    
    // Apply Hann window and prepare for FFT
    let windowed = applyHannWindow(to: segment)
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(windowed)
    
    // Compute power spectrum
    let powerSpectrum = computePowerSpectrum(from: fftData)
    
    // Apply Mel filterbank
    let melFilters = computeMelFilterbank(numFilters: nMFCC, fftSize: FFT_LENGTH, sampleRate: sampleRate)
    var melEnergies = [Float](repeating: 0, count: nMFCC)
    
    for i in 0..<nMFCC {
        var energy: Float = 0
        for j in 0..<powerSpectrum.count {
            energy += powerSpectrum[j] * melFilters[i][j]
        }
        melEnergies[i] = log(max(energy, .leastNormalMagnitude))
    }
    
    // Apply DCT
    return computeDCT(from: melEnergies)
}

func extractSpectralCentroid(from segment: [Float], sampleRate: Float) -> Float {
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    let magnitudes = computeMagnitudeSpectrum(from: fftData)
    let frequencies = (0..<magnitudes.count).map { Float($0) * sampleRate / Float(2 * magnitudes.count) }
    
    let sumMagnitudes = magnitudes.reduce(0, +)
    guard sumMagnitudes > 0 else { return 0 }
    
    let weightedSum = zip(frequencies, magnitudes)
        .map { $0.0 * $0.1 }
        .reduce(0, +)
    
    return weightedSum / sumMagnitudes
}

func extractSpectralFlatness(from segment: [Float]) -> Float {
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    // Compute power spectrum
    let powerSpectrum = computePowerSpectrum(from: fftData)
    
    // Calculate geometric mean using log-space to avoid numerical issues
    var sumLogValues: Float = 0.0
    for value in powerSpectrum {
        sumLogValues += log(value + 1e-10) // Add small epsilon to avoid log(0)
    }
    let geometricMean = exp(sumLogValues / Float(powerSpectrum.count))
    
    // Calculate arithmetic mean
    let arithmeticMean = powerSpectrum.reduce(0, +) / Float(powerSpectrum.count)
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0.0
}

func extractSpectralRollOff(from segment: [Float], sampleRate: Float) -> Float {
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    let magnitudes = computeMagnitudeSpectrum(from: fftData)
    let totalEnergy = magnitudes.reduce(0, +)
    let threshold = 0.85 * totalEnergy // 85% rolloff point
    
    var cumulativeEnergy: Float = 0
    for (index, magnitude) in magnitudes.enumerated() {
        cumulativeEnergy += magnitude
        if cumulativeEnergy >= threshold {
            return Float(index) * sampleRate / Float(2 * magnitudes.count)
        }
    }
    
    return 0.0
}

func extractSpectralBandwidth(from segment: [Float], sampleRate: Float) -> Float {
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    let centroid = extractSpectralCentroid(from: segment, sampleRate: sampleRate)
    
    let magnitudes = computeMagnitudeSpectrum(from: fftData)
    let frequencies = (0..<magnitudes.count).map { Float($0) * sampleRate / Float(2 * magnitudes.count) }
    
    let sumMagnitudes = magnitudes.reduce(0, +)
    guard sumMagnitudes > 0 else { return 0 }
    
    let variance = zip(frequencies, magnitudes)
        .map { pow($0.0 - centroid, 2) * $0.1 }
        .reduce(0, +)
    
    return sqrt(variance / sumMagnitudes)
}

func extractChromagram(from segment: [Float], sampleRate: Float) -> [Float] {
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    let nChroma = 12
    var chroma = [Float](repeating: 0, count: nChroma)
    let freqsPerBin = sampleRate / Float(FFT_LENGTH)
    
    for i in 0..<FFT_LENGTH/2 {
        let freq = Float(i) * freqsPerBin
        if freq > 0 {
            let pitchClass = Int((12 * log2(freq / 440.0)).truncatingRemainder(dividingBy: 12))
            if pitchClass >= 0 && pitchClass < nChroma {
                let magnitude = sqrt(fftData[2*i] * fftData[2*i] + 
                    (2*i+1 < fftData.count ? fftData[2*i+1] * fftData[2*i+1] : 0))
                chroma[pitchClass] += magnitude
            }
        }
    }
    
    return chroma
}

func extractTempo(from segment: [Float], sampleRate: Float) -> Float {
    let hopLength = 512
    let frameLength = 2048
    
    // Compute onset strength signal using spectral flux
    var onsetEnvelope = [Float]()
    var previousSpectrum = [Float](repeating: 0, count: frameLength / 2)
    
    for i in stride(from: 0, to: segment.count - frameLength, by: hopLength) {
        let frame = Array(segment[i..<min(i + frameLength, segment.count)])
        let fft = FFT(frameLength)
        var fftData = frame + [Float](repeating: 0, count: frameLength - frame.count)
        fft.realForward(&fftData)
        
        let magnitudes = computeMagnitudeSpectrum(from: fftData)
        var flux: Float = 0
        for j in 0..<magnitudes.count {
            flux += max(magnitudes[j] - previousSpectrum[j], 0)
        }
        onsetEnvelope.append(flux)
        previousSpectrum = magnitudes
    }
    
    // Find peaks in onset envelope
    var peaks = [Int]()
    for i in 1..<onsetEnvelope.count-1 {
        if onsetEnvelope[i] > onsetEnvelope[i-1] && onsetEnvelope[i] > onsetEnvelope[i+1] {
            peaks.append(i)
        }
    }
    
    // Calculate tempo from peak intervals
    if peaks.count > 1 {
        let intervals = zip(peaks, peaks.dropFirst()).map { $1 - $0 }
        let averageInterval = Float(intervals.reduce(0, +)) / Float(intervals.count)
        let tempo = 60.0 * sampleRate / Float(hopLength) / averageInterval
        return tempo
    }
    
    return 120.0 // Default tempo if no clear peaks found
}

private func findPeaks(in data: [Float], minProminence: Float) -> [Int] {
    var peaks = [Int]()
    for i in 1..<data.count - 1 {
        if data[i] > data[i - 1] && data[i] > data[i + 1] {
            let prominence = data[i] - max(data[i - 1], data[i + 1])
            if prominence >= minProminence {
                peaks.append(i)
            }
        }
    }
    return peaks
}

func extractHNR(from segment: [Float]) -> Float {
    let frameSize = segment.count
    var autocorrelation = [Float](repeating: 0, count: frameSize)
    
    // Compute autocorrelation
    vDSP_conv(segment, 1, segment.reversed(), 1, &autocorrelation, 1, vDSP_Length(frameSize), vDSP_Length(frameSize))
    
    // Find peaks with minimum prominence
    if let maxValue = autocorrelation.max() {
        let peaks = findPeaks(in: autocorrelation, minProminence: 0.1 * maxValue)
        
        // Find first peak after zero lag
        if let firstPeakIndex = peaks.first(where: { $0 > 0 }) {
            let harmonicEnergy = autocorrelation[firstPeakIndex]
            let noiseEnergy = autocorrelation[0] - harmonicEnergy
            if noiseEnergy > 0 {
                return 10 * log10(harmonicEnergy / noiseEnergy)
            }
        }
    }
    
    return 0.0
}

// Helper functions
private func computeMagnitudeSpectrum(from fftData: [Float]) -> [Float] {
    var magnitudes = [Float]()
    for i in 0...(fftData.count/2) {
        let re = fftData[2*i]
        let im = 2*i+1 < fftData.count ? fftData[2*i+1] : 0
        magnitudes.append(sqrt(re*re + im*im))
    }
    return magnitudes
}

private func applyHannWindow(to segment: [Float]) -> [Float] {
    var window = [Float](repeating: 0, count: segment.count)
    vDSP_hann_window(&window, vDSP_Length(segment.count), Int32(vDSP_HANN_NORM))
    
    var result = [Float](repeating: 0, count: segment.count)
    vDSP_vmul(segment, 1, window, 1, &result, 1, vDSP_Length(segment.count))
    
    return result
}

private func computePowerSpectrum(from fftData: [Float]) -> [Float] {
    var powerSpectrum = [Float]()
    for i in 0...(fftData.count/2) {
        let re = fftData[2*i]
        let im = 2*i+1 < fftData.count ? fftData[2*i+1] : 0
        powerSpectrum.append(re*re + im*im)
    }
    return powerSpectrum
}

private func computeMelFilterbank(numFilters: Int, fftSize: Int, sampleRate: Float) -> [[Float]] {
    let fMin: Float = 0
    let fMax = sampleRate / 2
    
    let melMin = hzToMel(fMin)
    let melMax = hzToMel(fMax)
    let melStep = (melMax - melMin) / Float(numFilters + 1)
    
    let melPoints = (0...numFilters+1).map { melMin + Float($0) * melStep }
    let hzPoints = melPoints.map { melToHz($0) }
    let bins = hzPoints.map { Int(($0 * Float(fftSize) / sampleRate).rounded()) }
    
    var filterbank = [[Float]](repeating: [Float](repeating: 0, count: 1 + fftSize/2), count: numFilters)
    
    for i in 0..<numFilters {
        for j in bins[i]..<bins[i+2] {
            if j < bins[i+1] {
                filterbank[i][j] = Float(j - bins[i]) / Float(bins[i+1] - bins[i])
            } else {
                filterbank[i][j] = Float(bins[i+2] - j) / Float(bins[i+2] - bins[i+1])
            }
        }
    }
    
    return filterbank
}

private func hzToMel(_ hz: Float) -> Float {
    return 2595 * log10(1 + hz/700)
}

private func melToHz(_ mel: Float) -> Float {
    return 700 * (pow(10, mel/2595) - 1)
}

private func computeDCT(from input: [Float]) -> [Float] {
    let N = input.count
    var output = [Float](repeating: 0, count: N)
    let scale = sqrt(2.0 / Float(N))
    
    for i in 0..<N {
        var sum: Float = 0
        for j in 0..<N {
            sum += input[j] * cos(.pi * Float(i) * (2 * Float(j) + 1) / (2 * Float(N)))
        }
        output[i] = scale * sum
    }
    
    return output
}

func computeMelSpectrogram(from segment: [Float], sampleRate: Float) -> [Float] {
    let nMels = 128
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    let powerSpectrum = computePowerSpectrum(from: fftData)
    let melFilters = computeMelFilterbank(numFilters: nMels, fftSize: FFT_LENGTH, sampleRate: sampleRate)
    
    return melFilters.map { filter in
        zip(filter, powerSpectrum)
            .map { $0 * $1 }
            .reduce(0, +)
    }
}

func computeSpectralContrast(from segment: [Float], sampleRate: Float) -> [Float] {
    let nBands = 7
    let fft = FFT(FFT_LENGTH)
    let fftData = fft.processSegment(segment)
    
    let magnitudeSpectrum = computeMagnitudeSpectrum(from: fftData)
    var contrast = [Float]()
    
    // Define standard octave-based frequency bands
    let bandFrequencies = [
        (20.0, 125.0),    // Sub-bass
        (125.0, 250.0),   // Bass
        (250.0, 500.0),   // Low-mids
        (500.0, 1000.0),  // Mids
        (1000.0, 2000.0), // High-mids
        (2000.0, 4000.0), // Presence
        (4000.0, min(8000.0, Double(sampleRate) / 2.0)) // Brilliance
    ]
    
    // Calculate frequency resolution
    let freqResolution = Float(sampleRate) / Float(FFT_LENGTH)
    
    for (lowFreq, highFreq) in bandFrequencies {
        // Convert frequencies to FFT bin indices
        let startBin = Int(Float(lowFreq) / freqResolution)
        let endBin = min(Int(Float(highFreq) / freqResolution), magnitudeSpectrum.count - 1)
        
        if startBin < endBin {
            let bandSpectrum = Array(magnitudeSpectrum[startBin...endBin])
            
            // Sort magnitudes for percentile calculation
            let sortedMagnitudes = bandSpectrum.sorted()
            let length = sortedMagnitudes.count
            
            // Calculate peak (95th percentile) and valley (5th percentile)
            let peakIndex = Int(Float(length) * 0.95)
            let valleyIndex = Int(Float(length) * 0.05)
            let peak = sortedMagnitudes[peakIndex]
            let valley = sortedMagnitudes[valleyIndex]
            
            // Calculate contrast in dB scale
            let contrastValue = 20 * log10(peak / max(valley, .leastNormalMagnitude))
            contrast.append(contrastValue)
        } else {
            contrast.append(0)
        }
    }
    
    return contrast
}

func computeTonnetz(from segment: [Float], sampleRate: Float) -> [Float] {
    // First compute chroma features
    let chroma = extractChromagram(from: segment, sampleRate: sampleRate)
    
    // Tonnetz transformation matrix (6x12)
    let tonnetzMatrix: [[Float]] = [
        [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // Perfect fifth
        [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0], // Minor third
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], // Major third
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0], // Perfect fifth
        [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1], // Minor third
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]  // Major third
    ]
    
    // Compute tonnetz features
    return tonnetzMatrix.map { row in
        zip(row, chroma).map { $0 * $1 }.reduce(0, +)
    }
}

struct AudioData {
    let samples: [Float]
    let sampleRate: Int
}

func loadAudioFile(_ fileUri: String) throws -> AudioData {
    guard let url = URL(string: fileUri) else {
        throw NSError(domain: "AudioProcessing", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid file URL"])
    }
    
    let file = try AVAudioFile(forReading: url)
    let format = file.processingFormat
    let frameCount = UInt32(file.length)
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
    
    try file.read(into: buffer)
    
    // Convert buffer to float array
    let samples: [Float]
    if let floatData = buffer.floatChannelData?[0] {
        samples = Array(UnsafeBufferPointer(start: floatData, count: Int(frameCount)))
    } else {
        throw NSError(domain: "AudioProcessing", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to read audio data"])
    }
    
    return AudioData(samples: samples, sampleRate: Int(format.sampleRate))
}

func computeEnergy(from samples: [Float]) -> Float {
    var energy: Float = 0
    vDSP_measqv(samples, 1, &energy, vDSP_Length(samples.count))
    return energy / Float(samples.count)
}

func computeRMS(from samples: [Float]) -> Float {
    let energy = computeEnergy(from: samples)
    return sqrt(energy)
}

func computeZCR(from samples: [Float]) -> Float {
    var zeroCrossings: Int = 0
    for i in 1..<samples.count {
        if (samples[i-1] * samples[i]) < 0 {
            zeroCrossings += 1
        }
    }
    return Float(zeroCrossings) / Float(samples.count)
}

// Keep in AudioProcessingHelpers.swift
private let N_MFCC = 40
private let N_FFT = 1024
private let N_MELS = 128
private let N_CHROMA = 12
private let N_BANDS = 7

// Core audio processing functions
func calculateZeroCrossingRate(_ data: [Float]) -> Float {
    var count: Float = 0
    for i in 1..<data.count {
        if (data[i] >= 0 && data[i-1] < 0) || (data[i] < 0 && data[i-1] >= 0) {
            count += 1
        }
    }
    return count / Float(data.count)
}

func calculateEnergy(_ data: [Float]) -> Float {
    var energy: Float = 0
    vDSP_svesq(data, 1, &energy, vDSP_Length(data.count))
    return energy / Float(data.count)
}

// Feature extraction functions
func computeFeatures(segmentData: [Float], sampleRate: Float, sumSquares: Float, zeroCrossings: Int, segmentLength: Int, featureOptions: [String: Bool]) -> Features {
    let rms = sqrt(sumSquares / Float(segmentLength))
    let energy = featureOptions["energy"] == true ? sumSquares : 0
    let zcr = featureOptions["zcr"] == true ? Float(zeroCrossings) / Float(segmentLength) : 0
    
    // Compute min and max amplitudes
    let minAmplitude = segmentData.min() ?? 0
    let maxAmplitude = segmentData.max() ?? 0
    
    // Call feature extraction functions
    let mfcc = featureOptions["mfcc"] == true ? extractMFCC(from: segmentData, sampleRate: sampleRate) : []
    let melSpectrogram = featureOptions["melSpectrogram"] == true ? computeMelSpectrogram(from: segmentData, sampleRate: sampleRate) : []
    let chromagram = featureOptions["chromagram"] == true ? extractChromagram(from: segmentData, sampleRate: sampleRate) : []
    let spectralContrast = featureOptions["spectralContrast"] == true ? computeSpectralContrast(from: segmentData, sampleRate: sampleRate) : []
    let tonnetz = featureOptions["tonnetz"] == true ? computeTonnetz(from: segmentData, sampleRate: sampleRate) : []
    
    // Add pitch calculation
    let pitch = featureOptions["pitch"] == true ? estimatePitch(from: segmentData, sampleRate: sampleRate) : nil
    
    return Features(
        energy: energy,
        mfcc: mfcc,
        rms: rms,
        minAmplitude: minAmplitude,
        maxAmplitude: maxAmplitude,
        zcr: zcr,
        spectralCentroid: extractSpectralCentroid(from: segmentData, sampleRate: sampleRate),
        spectralFlatness: extractSpectralFlatness(from: segmentData),
        spectralRollOff: extractSpectralRollOff(from: segmentData, sampleRate: sampleRate),
        spectralBandwidth: extractSpectralBandwidth(from: segmentData, sampleRate: sampleRate),
        chromagram: chromagram,
        tempo: extractTempo(from: segmentData, sampleRate: sampleRate),
        hnr: extractHNR(from: segmentData),
        melSpectrogram: melSpectrogram,
        spectralContrast: spectralContrast,
        tonnetz: tonnetz,
        pitch: pitch
    )
}

private func nextPowerOfTwo(_ n: Int) -> Int {
    var power = 1
    while power < n {
        power *= 2
    }
    return power
}

func estimatePitch(from segment: [Float], sampleRate: Float) -> Float {
    guard segment.count >= 2 else { return 0.0 }
    
    // Apply a Hann window to reduce edge effects
    let windowed = applyHannWindow(to: segment)
    
    // Pad the signal for FFT
    let fftLength = nextPowerOfTwo(segment.count * 2 - 1)
    var padded = windowed + [Float](repeating: 0, count: fftLength - windowed.count)
    let fft = FFT(fftLength)
    fft.realForward(&padded)
    
    // Compute autocorrelation using FFT
    var autocorrelation = [Float](repeating: 0, count: fftLength)
    vDSP_conv(segment, 1, segment.reversed(), 1, &autocorrelation, 1, vDSP_Length(segment.count), vDSP_Length(segment.count))
    
    // Find the first peak within the pitch range (50-500 Hz)
    let minLag = Int(sampleRate / 500.0) // Max frequency
    let maxLag = Int(sampleRate / 50.0)  // Min frequency
    var maxCorr: Float = -1.0
    var pitchLag = 0
    
    // Skip the first few samples to avoid the zero-lag peak
    for lag in minLag...maxLag {
        if autocorrelation[lag] > maxCorr {
            maxCorr = autocorrelation[lag]
            pitchLag = lag
        }
    }
    
    // Convert lag to frequency (sampleRate / lag)
    return pitchLag > 0 ? sampleRate / Float(pitchLag) : 0.0
}
