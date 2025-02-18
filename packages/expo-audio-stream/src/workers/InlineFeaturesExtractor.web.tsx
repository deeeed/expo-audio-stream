export const InlineFeaturesExtractor = `
// Unique ID counter
let uniqueIdCounter = 0
let accumulatedDataPoints = [] // Move outside message handler
let lastEmitTime = Date.now() // Move outside message handler

self.onmessage = function (event) {
    const {
        channelData, // this is only the newly recorded data when live recording.
        sampleRate,
        pointsPerSecond,
        algorithm,
        bitDepth,
        fullAudioDurationMs,
        numberOfChannels,
        features: _features,
        intervalAnalysis = 500, // Use intervalAnalysis instead of interval
    } = event.data
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
        channelData, // Float32Array
        sampleRate, // number
        pointsPerSecond, // number
        algorithm // string
    ) => {
        const totalSamples = channelData.length
        const segmentDuration = totalSamples / sampleRate
        const totalPoints = Math.max(
            Math.ceil(segmentDuration * pointsPerSecond),
            1
        )
        const pointInterval = Math.ceil(totalSamples / totalPoints)
        const dataPoints = []
        let minAmplitude = Infinity
        let maxAmplitude = -Infinity
        let silenceStart = null
        let lastSpeechEnd = -Infinity
        let isSpeech = false

        const expectedPoints = segmentDuration * pointsPerSecond
        const samplesPerPoint = Math.ceil(channelData.length / expectedPoints)

        for (let i = 0; i < expectedPoints; i++) {
            const start = i * samplesPerPoint
            const end = Math.min(start + samplesPerPoint, totalSamples)

            let sumSquares = 0
            let zeroCrossings = 0
            let prevValue = channelData[start]
            let localMinAmplitude = Infinity
            let localMaxAmplitude = -Infinity
            let hasNonZeroValue = false

            // compute values for the segment
            for (let j = start; j < end; j++) {
                const value = channelData[j]
                sumSquares += value * value
                if (j > start && value * prevValue < 0) {
                    zeroCrossings++
                }
                prevValue = value

                // We need to keep absolute value otherwise we cannot visualize properly
                const absValue = Math.abs(value)
                localMinAmplitude = Math.min(localMinAmplitude, absValue)
                localMaxAmplitude = Math.max(localMaxAmplitude, absValue)

                if (value !== 0) {
                    hasNonZeroValue = true
                }
            }

            // Post-processing checks
            if (!hasNonZeroValue) {
                // All values are zero
                localMinAmplitude = 0
                localMaxAmplitude = 0
            }

            const rms = Math.sqrt(sumSquares / (end - start))
            minAmplitude = Math.min(minAmplitude, localMinAmplitude)
            maxAmplitude = Math.max(maxAmplitude, localMaxAmplitude)

            const energy = sumSquares
            const zcr = zeroCrossings / (end - start)

            const silent = rms < SILENCE_THRESHOLD
            const dB = 20 * Math.log10(rms)

            if (silent) {
                if (silenceStart === null) {
                    silenceStart = start
                } else if (start - silenceStart > MIN_SILENCE_DURATION) {
                    // Silence detected for longer than the threshold, set amplitude to 0
                    localMaxAmplitude = 0
                    localMinAmplitude = 0
                    isSpeech = false
                }
            } else {
                silenceStart = null
                if (
                    !isSpeech &&
                    start - lastSpeechEnd < SPEECH_INERTIA_DURATION
                ) {
                    isSpeech = true
                }
                lastSpeechEnd = end
            }

            const activeSpeech =
                (rms > RMS_THRESHOLD && zcr > ZCR_THRESHOLD) ||
                (isSpeech && start - lastSpeechEnd < SPEECH_INERTIA_DURATION)

            if (activeSpeech) {
                isSpeech = true
                lastSpeechEnd = end
            } else {
                isSpeech = false
            }

            const bytesPerSample = bitDepth / 8
            const startPosition = start * bytesPerSample * numberOfChannels // Calculate start position in bytes
            const endPosition = end * bytesPerSample * numberOfChannels // Calculate end position in bytes

            // Compute features
            const segmentData = channelData.slice(start, end)
            const mfcc = features.mfcc
                ? extractMFCC(segmentData, sampleRate)
                : []
            const spectralCentroid = features.spectralCentroid
                ? extractSpectralCentroid(segmentData, sampleRate)
                : 0
            const spectralFlatness = features.spectralFlatness
                ? extractSpectralFlatness(segmentData)
                : 0
            const spectralRollOff = features.spectralRollOff
                ? extractSpectralRollOff(segmentData, sampleRate)
                : 0
            const spectralBandwidth = features.spectralBandwidth
                ? extractSpectralBandwidth(segmentData, sampleRate)
                : 0
            const chromagram = features.chromagram
                ? extractChromagram(segmentData, sampleRate)
                : []
            const hnr = features.hnr ? extractHNR(segmentData) : 0

            const peakAmp = Math.max(Math.abs(localMaxAmplitude), Math.abs(localMinAmplitude))
            const newData = {
                id: uniqueIdCounter++, // Assign unique ID and increment the counter
                amplitude: algorithm === 'peak' ? peakAmp : rms,
                activeSpeech,
                dB,
                silent,
                features: {
                    energy,
                    rms,
                    minAmplitude: localMinAmplitude,
                    maxAmplitude: localMaxAmplitude,
                    zcr,
                    mfcc: [], // Placeholder for MFCC features
                    spectralCentroid, // Computed spectral centroid
                    spectralFlatness, // Computed spectral flatness
                    spectralRollOff, // Computed spectral roll-off
                    spectralBandwidth, // Computed spectral bandwidth
                    chromagram, // Computed chromagram
                    hnr, // Computed HNR
                },
                startTime: start / sampleRate,
                endTime: end / sampleRate,
                startPosition,
                endPosition,
                samples: end - start,
                speaker: 0, // Assuming speaker detection is to be handled later
            }

            dataPoints.push(newData)
        }

        return {
            pointsPerSecond,
            amplitudeAlgorithm: algorithm,
            durationMs: fullAudioDurationMs,
            bitDepth,
            samples: totalSamples,
            numberOfChannels,
            sampleRate,
            dataPoints,
            amplitudeRange: {
                min: minAmplitude,
                max: maxAmplitude,
            },
            speakerChanges: [], // Placeholder for future speaker detection logic
        }
    }

    try {
        const result = extractWaveform(
            channelData,
            sampleRate,
            pointsPerSecond,
            algorithm
        )

        // Accumulate data points
        accumulatedDataPoints = accumulatedDataPoints.concat(result.dataPoints)
        
        const currentTime = Date.now()
        const shouldEmitAccumulated = currentTime - lastEmitTime >= intervalAnalysis

        if (shouldEmitAccumulated) {
            self.postMessage({
                command: 'features',
                result: {
                    ...result,
                    dataPoints: accumulatedDataPoints
                }
            })
            accumulatedDataPoints = [] // Reset accumulator
            lastEmitTime = currentTime
        }
    } catch (error) {
        console.error('[AudioFeaturesExtractor] Error in processing', error)
        self.postMessage({ error: error.message })
    } finally {
        // Do not close the worker so it can be re-used for subsequent messages
        // self.close();
    }
}
`
