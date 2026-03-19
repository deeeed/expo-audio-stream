// packages/audio-studio/src/workers/InlineFeaturesExtractor.web.tsx
//
// The worker blob is assembled at runtime by concatenating:
//   1. The WASM glue JS string (defines createMelSpectrogramModule)
//   2. This inline worker code
//
// This keeps ONE C++ implementation for spectral/MFCC/chroma across all platforms.

export const InlineFeaturesExtractor = `
// --- Constants ---
const N_FFT = 1024;
const N_CHROMA = 12;
const STRUCT_SIZE = 32; // CAudioFeaturesResult

// --- WASM module state ---
let wasmModule = null;
let wasmInitPromise = null;
let wasmFramePtr = 0;
let wasmFrameCapacity = 0;
let wasmResultPtr = 0;

function initWasm(sampleRate) {
    if (wasmInitPromise) return wasmInitPromise;
    wasmInitPromise = (typeof createMelSpectrogramModule === 'function'
        ? createMelSpectrogramModule()
        : Promise.reject(new Error('WASM glue not loaded'))
    ).then(function(Module) {
        wasmModule = Module;
        Module._audio_features_init(sampleRate, N_FFT, 13, 26, 1, 1);
        wasmResultPtr = Module._malloc(STRUCT_SIZE);
        return Module;
    });
    return wasmInitPromise;
}

function readWasmResult(Module, ptr) {
    var getValue = Module.getValue;
    var HEAPF32 = Module.HEAPF32;
    var centroid = getValue(ptr, 'float');
    var flatness = getValue(ptr + 4, 'float');
    var rolloff  = getValue(ptr + 8, 'float');
    var bandwidth = getValue(ptr + 12, 'float');
    var mfccPtr = getValue(ptr + 16, 'i32');
    var mfccCount = getValue(ptr + 20, 'i32');
    var chromaPtr = getValue(ptr + 24, 'i32');
    var chromaCount = getValue(ptr + 28, 'i32');

    var mfcc = [];
    if (mfccPtr && mfccCount > 0) {
        var off = mfccPtr >> 2;
        for (var i = 0; i < mfccCount; i++) mfcc.push(HEAPF32[off + i]);
    }
    var chromagram = [];
    if (chromaPtr && chromaCount > 0) {
        var off2 = chromaPtr >> 2;
        for (var i = 0; i < chromaCount; i++) chromagram.push(HEAPF32[off2 + i]);
    }
    return { centroid: centroid, flatness: flatness, rolloff: rolloff, bandwidth: bandwidth, mfcc: mfcc, chromagram: chromagram };
}

// Compute spectral/MFCC/chroma features for a segment via WASM C++
function computeFeaturesWasm(segment, sampleRate, featureOptions) {
    if (!wasmModule || !wasmResultPtr) {
        return { centroid: 0, flatness: 0, rolloff: 0, bandwidth: 0, mfcc: [], chromagram: [] };
    }
    var Module = wasmModule;
    var needSpectral = featureOptions.spectralCentroid || featureOptions.spectralFlatness ||
                       featureOptions.spectralRolloff || featureOptions.spectralBandwidth;
    var needMfcc = !!featureOptions.mfcc;
    var needChroma = !!featureOptions.chromagram;

    if (!needSpectral && !needMfcc && !needChroma) {
        return { centroid: 0, flatness: 0, rolloff: 0, bandwidth: 0, mfcc: [], chromagram: [] };
    }

    // Re-init if needed (different feature flags)
    Module._audio_features_init(sampleRate, N_FFT, 13, 26, needMfcc ? 1 : 0, needChroma ? 1 : 0);

    // Allocate/grow input buffer on WASM heap
    if (segment.length > wasmFrameCapacity) {
        if (wasmFramePtr) Module._free(wasmFramePtr);
        wasmFramePtr = Module._malloc(segment.length * 4);
        wasmFrameCapacity = segment.length;
    }
    Module.HEAPF32.set(segment, wasmFramePtr >> 2);

    var ok = Module._audio_features_compute_frame(wasmFramePtr, segment.length, wasmResultPtr);
    if (!ok) {
        return { centroid: 0, flatness: 0, rolloff: 0, bandwidth: 0, mfcc: [], chromagram: [] };
    }
    var result = readWasmResult(Module, wasmResultPtr);
    Module._audio_features_free_arrays(wasmResultPtr);
    return result;
}

// --- JS fallback for HNR (autocorrelation, no FFT needed) ---
function extractHNR(segmentData) {
    var frameSize = segmentData.length;
    var autocorrelation = new Float32Array(frameSize);
    for (var i = 0; i < frameSize; i++) {
        var sum = 0;
        for (var j = 0; j < frameSize - i; j++) {
            sum += segmentData[j] * segmentData[j + i];
        }
        autocorrelation[i] = sum;
    }
    var maxAutocorrelation = -Infinity;
    for (var i = 1; i < autocorrelation.length; i++) {
        if (autocorrelation[i] > maxAutocorrelation) {
            maxAutocorrelation = autocorrelation[i];
        }
    }
    return autocorrelation[0] !== 0
        ? 10 * Math.log10(maxAutocorrelation / (autocorrelation[0] - maxAutocorrelation))
        : 0;
}

// --- JS fallback for pitch estimation (simple peak-picking) ---
function estimatePitch(segment, sampleRate) {
    if (!segment || segment.length < 2 || !sampleRate) return 0;
    // Simple autocorrelation-based pitch
    var minLag = Math.floor(sampleRate / 1000); // 1000 Hz max
    var maxLag = Math.floor(sampleRate / 50);   // 50 Hz min
    if (maxLag >= segment.length) maxLag = segment.length - 1;
    var bestCorr = -Infinity;
    var bestLag = 0;
    for (var lag = minLag; lag <= maxLag; lag++) {
        var corr = 0;
        for (var i = 0; i < segment.length - lag; i++) {
            corr += segment[i] * segment[i + lag];
        }
        if (corr > bestCorr) {
            bestCorr = corr;
            bestLag = lag;
        }
    }
    return bestLag > 0 ? sampleRate / bestLag : 0;
}

// --- Unique ID counter ---
let uniqueIdCounter = 0;

// --- Message handler ---
self.onmessage = function (event) {
    var enableLogging = event.data.enableLogging || false;

    // Reset command
    if (event.data.command === 'resetCounter') {
        var newValue = event.data.value;
        uniqueIdCounter = typeof newValue === 'number' ? newValue : 0;
        return;
    }

    var channelData = event.data.channelData;
    var sampleRate = event.data.sampleRate;
    var segmentDurationMs = event.data.segmentDurationMs;
    var bitDepth = event.data.bitDepth;
    var fullAudioDurationMs = event.data.fullAudioDurationMs;
    var numberOfChannels = event.data.numberOfChannels;
    var _features = event.data.features;
    var features = _features || {};
    var bytesPerSample = bitDepth / 8;

    var subChunkStartTime = (typeof fullAudioDurationMs === 'number' && !isNaN(fullAudioDurationMs) && fullAudioDurationMs >= 0)
                            ? fullAudioDurationMs / 1000 : 0;

    // Check if any C++-backed features are requested
    var needWasm = features.spectralCentroid || features.spectralFlatness ||
                   features.spectralRolloff || features.spectralBandwidth ||
                   features.mfcc || features.chromagram;

    function createFeaturesObject(maxAmp, rms, sumSquares, zeroCrossings, segLen, wasmResult, startIdx, endIdx) {
        if (!Object.values(features).some(function(v) { return v; })) return undefined;
        var result = {};
        if (features.energy) result.energy = sumSquares;
        if (features.rms) result.rms = rms;
        result.minAmplitude = -maxAmp;
        result.maxAmplitude = maxAmp;
        if (features.zcr) result.zcr = zeroCrossings / segLen;
        if (features.spectralCentroid) result.spectralCentroid = wasmResult.centroid;
        if (features.spectralFlatness) result.spectralFlatness = wasmResult.flatness;
        if (features.spectralRolloff) result.spectralRolloff = wasmResult.rolloff;
        if (features.spectralBandwidth) result.spectralBandwidth = wasmResult.bandwidth;
        if (features.mfcc) result.mfcc = wasmResult.mfcc;
        if (features.chromagram) result.chromagram = wasmResult.chromagram;
        if (features.hnr) result.hnr = extractHNR(channelData.slice(startIdx, endIdx));
        if (features.pitch) result.pitch = estimatePitch(channelData.slice(startIdx, endIdx), sampleRate);
        return result;
    }

    function processSegment(startIdx, endIdx, segLen) {
        var sumSquares = 0, maxAmp = 0, zeroCrossings = 0;
        for (var j = startIdx; j < endIdx; j++) {
            var value = channelData[j];
            sumSquares += value * value;
            if (Math.abs(value) > maxAmp) maxAmp = Math.abs(value);
            if (j > 0 && value * channelData[j - 1] < 0) zeroCrossings++;
        }
        var rms = Math.sqrt(sumSquares / segLen);
        var wasmResult = needWasm
            ? computeFeaturesWasm(channelData.slice(startIdx, endIdx), sampleRate, features)
            : { centroid: 0, flatness: 0, rolloff: 0, bandwidth: 0, mfcc: [], chromagram: [] };

        var dataPoint = {
            id: uniqueIdCounter++,
            amplitude: maxAmp,
            rms: rms,
            startTime: subChunkStartTime + (startIdx / sampleRate),
            endTime: subChunkStartTime + (endIdx / sampleRate),
            dB: 20 * Math.log10(rms + 1e-6),
            silent: rms < 0.01,
            startPosition: startIdx * (numberOfChannels || 1) * bytesPerSample,
            endPosition: endIdx * (numberOfChannels || 1) * bytesPerSample,
            samples: segLen,
        };
        var ef = createFeaturesObject(maxAmp, rms, sumSquares, zeroCrossings, segLen, wasmResult, startIdx, endIdx);
        if (ef) dataPoint.features = ef;
        return dataPoint;
    }

    function extractWaveform() {
        var totalSamples = channelData.length;
        var durationMs = (totalSamples / sampleRate) * 1000;
        var samplesPerSegment = Math.floor(sampleRate * (segmentDurationMs / 1000));
        var numPoints = Math.floor(totalSamples / samplesPerSegment);
        var remainingSamples = totalSamples % samplesPerSegment;

        var min = Infinity, max = -Infinity;
        for (var i = 0; i < totalSamples; i++) {
            if (channelData[i] < min) min = channelData[i];
            if (channelData[i] > max) max = channelData[i];
        }

        var dataPoints = [];
        for (var i = 0; i < numPoints; i++) {
            var startIdx = i * samplesPerSegment;
            dataPoints.push(processSegment(startIdx, startIdx + samplesPerSegment, samplesPerSegment));
        }
        if (remainingSamples > samplesPerSegment / 4) {
            var startIdx = numPoints * samplesPerSegment;
            dataPoints.push(processSegment(startIdx, totalSamples, totalSamples - startIdx));
        }
        return {
            durationMs: durationMs,
            dataPoints: dataPoints,
            amplitudeRange: { min: min, max: max },
            rmsRange: { min: 0, max: Math.max(Math.abs(min), Math.abs(max)) }
        };
    }

    // Main: init WASM if needed, then process
    var doProcess = function() {
        try {
            var t0 = performance.now();
            var result = extractWaveform();
            var t1 = performance.now();
            self.postMessage({
                command: 'features',
                result: {
                    bitDepth: bitDepth,
                    samples: channelData.length,
                    numberOfChannels: numberOfChannels,
                    sampleRate: sampleRate,
                    segmentDurationMs: segmentDurationMs,
                    durationMs: result.durationMs,
                    dataPoints: result.dataPoints,
                    amplitudeRange: result.amplitudeRange,
                    rmsRange: result.rmsRange,
                    extractionTimeMs: t1 - t0,
                }
            });
        } catch (error) {
            console.error('[Worker] Error', { message: error.message, stack: error.stack });
            self.postMessage({ error: { message: error.message, stack: error.stack, name: error.name } });
        }
    };

    if (needWasm && !wasmModule) {
        initWasm(sampleRate).then(doProcess).catch(function(e) {
            console.error('[Worker] WASM init failed, processing without WASM:', e);
            needWasm = false;
            doProcess();
        });
    } else {
        doProcess();
    }
};
`
