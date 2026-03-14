// packages/expo-audio-studio/src/workers/InlineFeaturesExtractor.web.tsx
export const InlineFeaturesExtractor = `
// Constants
const N_FFT = 1024;  // Default FFT size
const MAX_FFT_SIZE = 8192;  // Maximum FFT size to prevent memory issues
const N_CHROMA = 12;

// FFT Implementation with normalized Hann window
function FFT(n) {
    this.n = n;
    this.cosTable = new Float32Array(n / 2);
    this.sinTable = new Float32Array(n / 2);
    this.hannWindow = new Float32Array(n);
    
    // Match Android implementation with precomputed tables
    const normalizationFactor = Math.sqrt(2.0 / n);
    for (var i = 0; i < n / 2; i++) {
        this.cosTable[i] = Math.cos(2.0 * Math.PI * i / n);
        this.sinTable[i] = Math.sin(2.0 * Math.PI * i / n);
    }
    
    // Precompute normalized Hann window to match Android
    for (var i = 0; i < n; i++) {
        this.hannWindow[i] = normalizationFactor * 0.5 * (1 - Math.cos(2.0 * Math.PI * i / (n - 1)));
    }
}

FFT.prototype.transform = function(data) {
    const n = data.length;
    
    // Validate input length is power of 2
    if ((n & (n - 1)) !== 0) {
        throw new Error('FFT length must be power of 2');
    }

    // Use iterative bit reversal instead of recursive
    const bitReversedIndices = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        let reversed = 0;
        let j = i;
        let bits = Math.log2(n);
        while (bits--) {
            reversed = (reversed << 1) | (j & 1);
            j >>= 1;
        }
        bitReversedIndices[i] = reversed;
    }

    // Apply bit reversal
    for (let i = 0; i < n; i++) {
        const j = bitReversedIndices[i];
        if (i < j) {
            const temp = data[i];
            data[i] = data[j];
            data[j] = temp;
        }
    }

    // Iterative FFT computation with optimized memory usage
    for (let step = 1; step < n; step <<= 1) {
        const jump = step << 1;
        const angleStep = Math.PI / step;

        for (let group = 0; group < n; group += jump) {
            for (let pair = group; pair < group + step; pair++) {
                const match = pair + step;
                const angle = angleStep * (pair - group);
                
                const currentCos = Math.cos(angle);
                const currentSin = Math.sin(angle);

                const real = currentCos * data[match] - currentSin * data[match + 1];
                const imag = currentCos * data[match + 1] + currentSin * data[match];

                data[match] = data[pair] - real;
                data[match + 1] = data[pair + 1] - imag;
                data[pair] += real;
                data[pair + 1] += imag;
            }
        }
    }
};

// Add realInverse method
FFT.prototype.realInverse = function(powerSpectrum, output) {
    const n = powerSpectrum.length;
    const complexData = new Float32Array(n * 2);
    
    // Copy power spectrum to complex format
    for (let i = 0; i < n/2 + 1; i++) {
        complexData[2 * i] = powerSpectrum[i];
        if (2 * i + 1 < complexData.length) {
            complexData[2 * i + 1] = 0;
        }
    }
    
    // Conjugate for inverse FFT
    for (let i = 0; i < n; i++) {
        if (2 * i + 1 < complexData.length) {
            complexData[2 * i + 1] = -complexData[2 * i + 1];
        }
    }
    
    this.transform(complexData);
    
    // Copy real part to output and scale
    for (let i = 0; i < n; i++) {
        output[i] = complexData[2 * i] / n;
    }
};

// Add helper functions to match Android
function nextPowerOfTwo(n) {
    let value = 1;
    while (value < n) {
        value *= 2;
    }
    return value;
}

function applyHannWindow(samples) {
    const output = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        const multiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / (samples.length - 1)));
        output[i] = samples[i] * multiplier;
    }
    return output;
}

// Update spectral feature computation to match Android
function computeSpectralFeatures(segment, sampleRate, featureOptions = {}) {
    try {
        // Early return if no spectral features are requested
        if (!featureOptions.spectralCentroid && 
            !featureOptions.spectralFlatness && 
            !featureOptions.spectralRollOff && 
            !featureOptions.spectralBandwidth &&
            !featureOptions.magnitudeSpectrum) {
            return {
                centroid: 0,
                flatness: 0,
                rollOff: 0,
                bandwidth: 0,
                magnitudeSpectrum: []
            };
        }

        // Ensure we have valid data
        if (!segment || segment.length === 0) {
            throw new Error('Invalid segment data');
        }

        // Process in fixed-size chunks
        const chunkSize = N_FFT;
        const numChunks = Math.ceil(segment.length / chunkSize);
        
        let results = {
            centroid: 0,
            flatness: 0,
            rollOff: 0,
            bandwidth: 0,
            magnitudeSpectrum: new Float32Array(N_FFT / 2 + 1).fill(0)
        };
        
        let validChunks = 0;
        
        // Iterate through chunks
        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, segment.length);
            const chunk = segment.slice(start, end);
            
            if (chunk.length < N_FFT / 4) continue; // Skip very small chunks

            // Process the chunk
            const paddedChunk = new Float32Array(N_FFT);
            paddedChunk.set(applyHannWindow(chunk));

            const fft = new FFT(N_FFT);
            fft.transform(paddedChunk);

            // Calculate magnitude spectrum
            const chunkMagnitudeSpectrum = new Float32Array(N_FFT / 2 + 1);
            let hasSignal = false;
            
            for (let j = 0; j < N_FFT / 2; j++) {
                const re = paddedChunk[2 * j];
                const im = paddedChunk[2 * j + 1];
                const magnitude = Math.sqrt(re * re + im * im);
                chunkMagnitudeSpectrum[j] = magnitude;
                if (magnitude > Number.EPSILON) hasSignal = true;
            }
            
            if (!hasSignal) continue;
            validChunks++;

            // Accumulate results
            if (featureOptions.spectralCentroid) {
                const centroid = computeSpectralCentroid(chunkMagnitudeSpectrum, sampleRate);
                if (!isNaN(centroid)) results.centroid += centroid;
            }
            
            if (featureOptions.spectralFlatness) {
                const flatness = computeSpectralFlatness(chunkMagnitudeSpectrum);
                if (!isNaN(flatness)) results.flatness += flatness;
            }
            
            if (featureOptions.spectralRollOff) {
                const rolloff = computeSpectralRollOff(chunkMagnitudeSpectrum, sampleRate);
                if (!isNaN(rolloff)) results.rollOff += rolloff;
            }
            
            if (featureOptions.spectralBandwidth && !isNaN(results.centroid)) {
                const bandwidth = computeSpectralBandwidth(chunkMagnitudeSpectrum, sampleRate, results.centroid);
                if (!isNaN(bandwidth)) results.bandwidth += bandwidth;
            }
            
            if (featureOptions.magnitudeSpectrum) {
                for (let j = 0; j < results.magnitudeSpectrum.length; j++) {
                    results.magnitudeSpectrum[j] += chunkMagnitudeSpectrum[j];
                }
            }
        }

        // Average the accumulated results
        if (validChunks > 0) {
            results.centroid /= validChunks;
            results.flatness /= validChunks;
            results.rollOff /= validChunks;
            results.bandwidth /= validChunks;
            
            if (featureOptions.magnitudeSpectrum) {
                for (let i = 0; i < results.magnitudeSpectrum.length; i++) {
                    results.magnitudeSpectrum[i] /= validChunks;
                }
            }
        }

        return results;
    } catch (error) {
        console.error('[Worker] Spectral feature computation error:', error);
        return {
            centroid: 0,
            flatness: 0,
            rollOff: 0,
            bandwidth: 0,
            magnitudeSpectrum: []
        };
    }
}

function computeSpectralCentroid(magnitudeSpectrum, sampleRate) {
    const sum = magnitudeSpectrum.reduce((a, b) => a + (b || 0), 0);
    if (sum <= Number.EPSILON) return 0;
    
    const weightedSum = magnitudeSpectrum.reduce((acc, value, index) => 
        acc + (index * (sampleRate / N_FFT) * (value || 0)), 0);
    
    return weightedSum / sum;
}

function computeSpectralFlatness(powerSpectrum) {
    // Add small epsilon to avoid log(0)
    const epsilon = Number.EPSILON;
    const validSpectrum = powerSpectrum.map(v => Math.max(v, epsilon));
    
    const geometricMean = Math.exp(
        validSpectrum
            .map(v => Math.log(v))
            .reduce((a, b) => a + b) / validSpectrum.length
    );
    
    const arithmeticMean =
        validSpectrum.reduce((a, b) => a + b) / validSpectrum.length;
        
    return geometricMean / arithmeticMean;
}

function computeSpectralRollOff(magnitudeSpectrum, sampleRate) {
    const totalEnergy = magnitudeSpectrum.reduce((a, b) => a + b, 0);
    const rollOffThreshold = totalEnergy * 0.85;
    let cumulativeEnergy = 0;

    for (let i = 0; i < magnitudeSpectrum.length; i++) {
        cumulativeEnergy += magnitudeSpectrum[i];
        if (cumulativeEnergy >= rollOffThreshold) {
            return (i / magnitudeSpectrum.length) * (sampleRate / 2);
        }
    }

    return 0;
}

function computeSpectralBandwidth(magnitudeSpectrum, sampleRate, centroid) {
    const sum = magnitudeSpectrum.reduce((a, b) => a + (b || 0), 0);
    if (sum <= Number.EPSILON) return 0;

    const weightedSum = magnitudeSpectrum.reduce(
        (acc, value, index) => {
            const freq = index * sampleRate / (2 * magnitudeSpectrum.length);
            return acc + (value || 0) * Math.pow(freq - centroid, 2);
        }, 0
    );

    return Math.sqrt(weightedSum / sum);
}

function computeChroma(segmentData, sampleRate) {
    // Ensure we have valid input data
    if (!segmentData || segmentData.length === 0) {
        return new Array(N_CHROMA).fill(0);
    }

    const fftLength = nextPowerOfTwo(Math.max(segmentData.length, N_FFT));
    const windowed = applyHannWindow(segmentData);
    const padded = new Float32Array(fftLength);
    padded.set(windowed.slice(0, Math.min(windowed.length, fftLength)));

    const fft = new FFT(fftLength);
    try {
        fft.transform(padded);
    } catch (e) {
        console.error('[Worker] FFT transform failed in chromagram:', e);
        return new Array(N_CHROMA).fill(0);
    }

    const chroma = new Float32Array(N_CHROMA).fill(0);
    const freqsPerBin = sampleRate / fftLength;
    let totalEnergy = 0;

    // First pass: compute magnitudes and total energy
    for (let i = 0; i < fftLength / 2; i++) {
        const freq = i * freqsPerBin;
        if (freq > 20) { // Only consider frequencies above 20 Hz
            const re = padded[2 * i];
            const im = padded[2 * i + 1] || 0;
            const magnitude = Math.sqrt(re * re + im * im);
            
            if (magnitude > Number.EPSILON) {
                // Use a more stable pitch class calculation
                const midiNote = 69 + 12 * Math.log2(freq / 440.0);
                const pitchClass = Math.round(midiNote) % 12;
                
                if (pitchClass >= 0 && pitchClass < 12) {
                    chroma[pitchClass] += magnitude;
                    totalEnergy += magnitude;
                }
            }
        }
    }

    // Normalize chroma values only if we have energy
    if (totalEnergy > Number.EPSILON) {
        for (let i = 0; i < N_CHROMA; i++) {
            chroma[i] = chroma[i] / totalEnergy;
        }
    }

    // Convert to regular array and ensure no NaN values
    return Array.from(chroma, v => isNaN(v) ? 0 : v);
}

function extractHNR(segmentData) {
    const frameSize = segmentData.length;
    const autocorrelation = new Float32Array(frameSize);

    // Compute the autocorrelation iteratively
    for (let i = 0; i < frameSize; i++) {
        let sum = 0;
        for (let j = 0; j < frameSize - i; j++) {
            sum += segmentData[j] * segmentData[j + i];
        }
        autocorrelation[i] = sum;
    }

    // Find the maximum autocorrelation value iteratively
    let maxAutocorrelation = -Infinity;
    for (let i = 1; i < autocorrelation.length; i++) {
        if (autocorrelation[i] > maxAutocorrelation) {
            maxAutocorrelation = autocorrelation[i];
        }
    }

    // Compute the HNR
    return autocorrelation[0] !== 0
        ? 10 * Math.log10(maxAutocorrelation / (autocorrelation[0] - maxAutocorrelation))
        : 0;
}

function estimatePitch(segment, sampleRate) {
    // Early validation
    if (!segment || segment.length < 2 || !sampleRate) return 0;

    try {
        // Apply Hann window
        const windowed = applyHannWindow(segment);

        // Pad for FFT
        const fftLength = nextPowerOfTwo(segment.length * 2);
        const padded = new Float32Array(fftLength);
        padded.set(windowed);

        // Perform FFT
        const fft = new FFT(fftLength);
        fft.transform(padded);

        // Compute power spectrum
        const powerSpectrum = new Float32Array(fftLength / 2 + 1);
        for (let i = 0; i <= fftLength / 2; i++) {
            const re = padded[2 * i];
            const im = padded[2 * i + 1] || 0;
            powerSpectrum[i] = re * re + im * im;
        }

        // Find peak frequency
        let maxPower = 0;
        let peakIndex = 0;
        const minFreq = 50;  // Minimum frequency to consider (Hz)
        const maxFreq = 1000; // Maximum frequency to consider (Hz)
        const minBin = Math.floor(minFreq * fftLength / sampleRate);
        const maxBin = Math.ceil(maxFreq * fftLength / sampleRate);

        for (let i = minBin; i <= maxBin; i++) {
            if (powerSpectrum[i] > maxPower) {
                maxPower = powerSpectrum[i];
                peakIndex = i;
            }
        }

        // Convert peak index to frequency
        const fundamentalFreq = peakIndex * sampleRate / fftLength;

        // Return 0 if the detected frequency is outside reasonable bounds
        return (fundamentalFreq >= minFreq && fundamentalFreq <= maxFreq) ? 
            fundamentalFreq : 0;

    } catch (error) {
        console.error('[Worker] Pitch estimation error:', error);
        return 0;
    }
}

// Unique ID counter - the only state we need to maintain
let uniqueIdCounter = 0
let lastEmitTime = Date.now()

self.onmessage = function (event) {
    // Extract enableLogging early so we can use it consistently
    const enableLogging = event.data.enableLogging || false;
    
    // Create consistent logger that only logs when enabled
    const logger = enableLogging ? {
        debug: (...args) => console.debug('[Worker]', ...args),
        log: (...args) => console.log('[Worker]', ...args),
        warn: (...args) => console.warn('[Worker]', ...args),
        error: (...args) => console.error('[Worker]', ...args)
    } : {
        debug: () => {},
        log: () => {},
        warn: () => {},
        error: () => {}
    };
    
    // Check if this is a reset command
    if (event.data.command === 'resetCounter') {
        const newValue = event.data.value;
        logger.log('Reset counter request received with value:', newValue);
        
        // Always respect explicit resets through the resetCounter command
        uniqueIdCounter = typeof newValue === 'number' ? newValue : 0;
        logger.log('Counter explicitly set to:', uniqueIdCounter);
        
        return; // Exit early, don't process audio
    }

    // Regular audio processing
    const {
        channelData,
        sampleRate,
        segmentDurationMs,
        algorithm,
        bitDepth,
        fullAudioDurationMs,
        numberOfChannels,
        features: _features,
        intervalAnalysis = 500,
    } = event.data

    // Calculate subChunkStartTime safely, defaulting to 0 if fullAudioDurationMs is not a valid number
    const subChunkStartTime = (typeof fullAudioDurationMs === 'number' && !isNaN(fullAudioDurationMs) && fullAudioDurationMs >= 0)
                            ? fullAudioDurationMs / 1000
                            : 0;

    const features = _features || {}
    const bytesPerSample = bitDepth / 8; // Calculate bytes per sample

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

    /**
     * Creates a features object based on requested features
     */
    function createFeaturesObject(
        features,
        maxAmp,
        rms,
        sumSquares,
        zeroCrossings,
        remainingSamples,
        spectralFeatures,
        channelData,
        startIdx,
        endIdx,
        sampleRate,
        numberOfChannels,
        bytesPerSample
    ) {
        // If no features are requested, return undefined
        if (!Object.values(features).some(function(v) { return v; })) {
            return undefined;
        }

        const result = {};
        
        if (features.energy) {
            result.energy = sumSquares;
        }
        if (features.rms) {
            result.rms = rms;
        }
        // Always include min/max amplitude if any features are requested
        result.minAmplitude = -maxAmp;
        result.maxAmplitude = maxAmp;
        
        if (features.zcr) {
            result.zcr = zeroCrossings / remainingSamples;
        }
        if (features.spectralCentroid) {
            result.spectralCentroid = spectralFeatures.centroid;
        }
        if (features.spectralFlatness) {
            result.spectralFlatness = spectralFeatures.flatness;
        }
        if (features.spectralRolloff) {
            result.spectralRolloff = spectralFeatures.rollOff;
        }
        if (features.spectralBandwidth) {
            result.spectralBandwidth = spectralFeatures.bandwidth;
        }
        if (features.chromagram) {
            result.chromagram = computeChroma(channelData.slice(startIdx, endIdx), sampleRate);
        }
        if (features.hnr) {
            result.hnr = extractHNR(channelData.slice(startIdx, endIdx));
        }
        if (features.pitch) {
            result.pitch = estimatePitch(channelData.slice(startIdx, endIdx), sampleRate);
        }
        
        return result;
    }

    function extractWaveform(
        channelData,
        sampleRate,
        segmentDurationMs,
        numberOfChannels,
        bytesPerSample
    ) {
        const logger = enableLogging ? {
            debug: (...args) => console.debug('[Worker]', ...args),
            log: (...args) => console.log('[Worker]', ...args),
            error: (...args) => console.error('[Worker]', ...args)
        } : {
            debug: () => {},
            log: () => {},
            error: () => {}
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
        
        // Calculate fixed segment sizes
        const samplesPerSegment = Math.floor(sampleRate * (segmentDurationMs / 1000));
        const numPoints = Math.floor(totalSamples / samplesPerSegment);
        const remainingSamples = totalSamples % samplesPerSegment;

        const dataPoints = []

        // Process full segments
        for (let i = 0; i < numPoints; i++) {
            const startIdx = i * samplesPerSegment
            const endIdx = startIdx + samplesPerSegment
            
            let sumSquares = 0
            let maxAmp = 0
            let zeroCrossings = 0

            // Calculate segment features
            for (let j = startIdx; j < endIdx; j++) {
                const value = channelData[j]
                sumSquares += value * value
                maxAmp = Math.max(maxAmp, Math.abs(value))
                if (j > 0 && value * channelData[j - 1] < 0) {
                    zeroCrossings++
                }
            }

            const rms = Math.sqrt(sumSquares / samplesPerSegment)
            const startTime = subChunkStartTime + (startIdx / sampleRate)
            const endTime = subChunkStartTime + (endIdx / sampleRate)
            // Calculate byte positions correctly based on numberOfChannels and bytesPerSample
            const startPosition = startIdx * numberOfChannels * bytesPerSample
            const endPosition = endIdx * numberOfChannels * bytesPerSample

            var spectralFeatures = computeSpectralFeatures(channelData.slice(startIdx, endIdx), sampleRate, features);

            // Simply use the counter, increment after assigning
            const dataPoint = {
                id: uniqueIdCounter++,
                amplitude: maxAmp,
                rms,
                startTime,
                endTime,
                dB: 20 * Math.log10(rms + 1e-6),
                silent: rms < 0.01,
                startPosition,
                endPosition,
                samples: samplesPerSegment,
            }

            // Extract features if any are requested
            const extractedFeatures = createFeaturesObject(
                features,
                maxAmp,
                rms,
                sumSquares,
                zeroCrossings,
                samplesPerSegment,
                spectralFeatures,
                channelData,
                startIdx,
                endIdx,
                sampleRate,
                numberOfChannels,
                bytesPerSample
            );
            
            if (extractedFeatures) {
                dataPoint.features = extractedFeatures;
            }

            dataPoints.push(dataPoint)
        }

        // Handle remaining samples if they exist and are enough to process
        if (remainingSamples > samplesPerSegment / 4) { // Only process if we have at least 1/4 of a segment
            const startIdx = numPoints * samplesPerSegment
            const endIdx = totalSamples
            
            let sumSquares = 0
            let maxAmp = 0
            let zeroCrossings = 0

            for (let j = startIdx; j < endIdx; j++) {
                const value = channelData[j]
                sumSquares += value * value
                maxAmp = Math.max(maxAmp, Math.abs(value))
                if (j > 0 && value * channelData[j - 1] < 0) {
                    zeroCrossings++
                }
            }

            const rms = Math.sqrt(sumSquares / remainingSamples)
            const startTime = subChunkStartTime + (startIdx / sampleRate);
            const endTime = subChunkStartTime + (endIdx / sampleRate);
            // Calculate byte positions correctly based on numberOfChannels and bytesPerSample
            const startPosition = startIdx * numberOfChannels * bytesPerSample
            const endPosition = endIdx * numberOfChannels * bytesPerSample

            var spectralFeatures = computeSpectralFeatures(channelData.slice(startIdx, endIdx), sampleRate, features);

            // Simply use the counter, increment after assigning
            const dataPoint = {
                id: uniqueIdCounter++,
                amplitude: maxAmp,
                rms,
                startTime,
                endTime,
                dB: 20 * Math.log10(rms + 1e-6),
                silent: rms < 0.01,
                startPosition,
                endPosition,
                samples: remainingSamples,
            }

            logger.debug('extractWaveform - dataPoint', dataPoint);
            // Extract features if any are requested
            const extractedFeatures = createFeaturesObject(
                features,
                maxAmp,
                rms,
                sumSquares,
                zeroCrossings,
                remainingSamples,
                spectralFeatures,
                channelData,
                startIdx,
                endIdx,
                sampleRate,
                numberOfChannels,
                bytesPerSample
            );
            
            if (extractedFeatures) {
                dataPoint.features = extractedFeatures;
            }

            dataPoints.push(dataPoint)
        }

        return {
            durationMs,
            dataPoints,
            amplitudeRange: { min, max },
            rmsRange: {
                min: 0,
                max: Math.max(Math.abs(min), Math.abs(max))
            }
        }
    }

    try {
        // Measure actual processing time using performance.now() for higher precision
        const processingStartTime = performance.now()
        
        const result = extractWaveform(
            channelData,
            sampleRate,
            segmentDurationMs,
            numberOfChannels || 1, // Default to 1 channel if not provided
            bytesPerSample
        )
        
        const processingEndTime = performance.now()
        const actualExtractionTimeMs = processingEndTime - processingStartTime

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
                extractionTimeMs: actualExtractionTimeMs,
            }
        })
    } catch (error) {
        console.error('[Worker] Error', {
            message: error.message,
            stack: error.stack
        });
        
        self.postMessage({ 
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            }
        });
    }
}
`
