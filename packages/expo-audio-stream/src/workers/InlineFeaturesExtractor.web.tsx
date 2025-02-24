export const InlineFeaturesExtractor = `
// Unique ID counter
let uniqueIdCounter = 0
let accumulatedDataPoints = [] // Move outside message handler
let lastEmitTime = Date.now() // Move outside message handler

self.onmessage = function (event) {
    const {
        channelData, // this is only the newly recorded data when live recording.
        sampleRate,
        segmentDurationMs, // Keep this as is
        algorithm,
        bitDepth,
        fullAudioDurationMs,
        numberOfChannels,
        features: _features,
        intervalAnalysis = 500, // Use intervalAnalysis instead of interval
        enableLogging, // Replace logger with enableLogging flag
    } = event.data
    
    // Create a simple logger that only logs when enabled
    const logger = enableLogging ? {
        debug: (...args) => console.debug('[Worker]', ...args),
        log: (...args) => console.log('[Worker]', ...args),
        error: (...args) => console.error('[Worker]', ...args)
    } : {
        debug: () => {},
        log: () => {},
        error: () => {}
    }
    
    const features = _features || {}

    const SILENCE_THRESHOLD = 0.01
    const MIN_SILENCE_DURATION = 1.5 * sampleRate // 1.5 seconds of silence
    const SPEECH_INERTIA_DURATION = 0.1 * sampleRate // Speech inertia duration in samples
    const RMS_THRESHOLD = 0.01
    const ZCR_THRESHOLD = 0.1

    // Placeholder functions for feature extraction
    const extractMFCC = (segmentData, sampleRate) => {
        // Implement MFCC extraction logic here
        return []
    }

    const extractSpectralCentroid = (segmentData, sampleRate) => {
        const magnitudeSpectrum = segmentData.map((v) => v * v)
        const sum = magnitudeSpectrum.reduce((a, b) => a + b, 0)
        if (sum === 0) return 0

        const weightedSum = magnitudeSpectrum.reduce(
            (acc, value, index) => acc + index * value,
            0
        )
        return (
            ((weightedSum / sum) * (sampleRate / 2)) / magnitudeSpectrum.length
        )
    }

    const extractSpectralFlatness = (segmentData) => {
        const magnitudeSpectrum = segmentData.map((v) => Math.abs(v))
        const geometricMean = Math.exp(
            magnitudeSpectrum
                .map((v) => Math.log(v + Number.MIN_VALUE))
                .reduce((a, b) => a + b) / magnitudeSpectrum.length
        )
        const arithmeticMean =
            magnitudeSpectrum.reduce((a, b) => a + b) / magnitudeSpectrum.length
        return arithmeticMean === 0 ? 0 : geometricMean / arithmeticMean
    }

    const extractSpectralRollOff = (segmentData, sampleRate) => {
        const magnitudeSpectrum = segmentData.map((v) => Math.abs(v))
        const totalEnergy = magnitudeSpectrum.reduce((a, b) => a + b, 0)
        const rollOffThreshold = totalEnergy * 0.85
        let cumulativeEnergy = 0

        for (let i = 0; i < magnitudeSpectrum.length; i++) {
            cumulativeEnergy += magnitudeSpectrum[i]
            if (cumulativeEnergy >= rollOffThreshold) {
                return (i / magnitudeSpectrum.length) * (sampleRate / 2)
            }
        }

        return 0
    }

    const extractSpectralBandwidth = (segmentData, sampleRate) => {
        const centroid = extractSpectralCentroid(segmentData, sampleRate)
        const magnitudeSpectrum = segmentData.map((v) => Math.abs(v))
        const sum = magnitudeSpectrum.reduce((a, b) => a + b, 0)
        if (sum === 0) return 0

        const weightedSum = magnitudeSpectrum.reduce(
            (acc, value, index) => acc + value * Math.pow(index - centroid, 2),
            0
        )
        return Math.sqrt(weightedSum / sum)
    }

    const extractChromagram = (segmentData, sampleRate) => {
        return [] // TODO implement
    }

    const extractHNR = (segmentData) => {
        const frameSize = segmentData.length
        const autocorrelation = new Float32Array(frameSize)

        // Compute the autocorrelation of the segment data
        for (let i = 0; i < frameSize; i++) {
            let sum = 0
            for (let j = 0; j < frameSize - i; j++) {
                sum += segmentData[j] * segmentData[j + i]
            }
            autocorrelation[i] = sum
        }

        // Find the maximum autocorrelation value (excluding the zero lag)
        const maxAutocorrelation = Math.max(...autocorrelation.subarray(1))

        // Compute the HNR
        return autocorrelation[0] !== 0
            ? 10 *
                  Math.log10(
                      maxAutocorrelation /
                          (autocorrelation[0] - maxAutocorrelation)
                  )
            : 0
    }

    const extractWaveform = (
        channelData,
        sampleRate,
        segmentDurationMs,
    ) => {
        const logger = enableLogging ? {
            debug: (...args) => console.debug('[Worker]', ...args),
            log: (...args) => console.log('[Worker]', ...args),
            error: (...args) => console.error('[Worker]', ...args)
        } : {
            debug: () => {},
            log: () => {},
            error: () => {}
        }

        // Add hex value logging for first and last 10 samples
        if (enableLogging) {
            const firstHexValues = Array.from(channelData.slice(0, 10)).map(value => 
                '0x' + Math.round(value * 32768).toString(16).padStart(4, '0')
            );
            const lastHexValues = Array.from(channelData.slice(-10)).map(value => 
                '0x' + Math.round(value * 32768).toString(16).padStart(4, '0')
            );
            logger.debug('First 10 audio samples as hex:', firstHexValues);
            logger.debug('Last 10 audio samples as hex:', lastHexValues);
        }

        // Calculate amplitude range
        let min = Infinity
        let max = -Infinity
        for (let i = 0; i < channelData.length; i++) {
            min = Math.min(min, channelData[i])
            max = Math.max(max, channelData[i])
        }

        const totalSamples = channelData.length
        const durationMs = (totalSamples / sampleRate) * 1000
        
        // Match the original point and sample calculations exactly
        const numPoints = Math.max(
            1,
            Math.ceil(durationMs / (segmentDurationMs || 100))
        )
        // Calculate samplesPerPoint based on total samples and number of points
        const samplesPerPoint = Math.floor(totalSamples / numPoints)

        const dataPoints = []

        for (let i = 0; i < numPoints; i++) {
            const startIdx = i * samplesPerPoint
            const endIdx = Math.min((i + 1) * samplesPerPoint, channelData.length)
            
            let sumSquares = 0
            let maxAmp = 0

            // Calculate segment features
            for (let j = startIdx; j < endIdx; j++) {
                const value = channelData[j]
                sumSquares += value * value
                maxAmp = Math.max(maxAmp, Math.abs(value))
            }

            const rms = Math.sqrt(sumSquares / (endIdx - startIdx))
            const startPosition = startIdx * 2
            const endPosition = endIdx * 2

            dataPoints.push({
                id: i,
                amplitude: maxAmp,
                rms,
                startTime: (i * segmentDurationMs) / 1000,
                endTime: ((i + 1) * segmentDurationMs) / 1000,
                dB: 20 * Math.log10(rms + 1e-6),
                silent: rms < 0.01,
                startPosition,
                endPosition,
                samples: endIdx - startIdx,
                features: {
                    energy: sumSquares,
                    rms,
                    minAmplitude: -maxAmp,
                    maxAmplitude: maxAmp,
                    mfcc: [],
                    zcr: 0,
                    spectralCentroid: 0,
                    spectralFlatness: 0,
                    spectralRolloff: 0,
                    spectralBandwidth: 0,
                    chromagram: [],
                    tempo: 0,
                    hnr: 0,
                    melSpectrogram: [],
                    spectralContrast: [],
                    tonnetz: [],
                    pitch: 0,
                }
            })
        }

        return {
            durationMs,
            dataPoints,
            amplitudeRange: { min, max },
            rmsRange: {
                min: 0,
                max: Math.max(Math.abs(min), Math.abs(max))
            },
            extractionTimeMs: Date.now() - lastEmitTime
        }
    }

    try {
        const result = extractWaveform(
            channelData,
            sampleRate,
            segmentDurationMs
        )

        // Send complete result immediately
        self.postMessage({
            command: 'features',
            result: {
                bitDepth,
                samples: channelData.length,
                numberOfChannels,
                sampleRate,
                segmentDurationMs,
                durationMs: result.durationMs,
                dataPoints: result.dataPoints,
                amplitudeRange: result.amplitudeRange,
                rmsRange: result.rmsRange,
            }
        })
    } catch (error) {
        console.error('[InlineFeaturesExtractor] Error in processing:', error)
        self.postMessage({ error: error.message })
    }
}
`
