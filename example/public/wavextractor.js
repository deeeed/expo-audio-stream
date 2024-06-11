// worker.js

self.onmessage = function (event) {
  const {
    channelData,
    sampleRate,
    pointsPerSecond,
    algorithm,
    bitDepth,
    durationMs,
    numberOfChannels,
  } = event.data;

  console.log("[WAVEXTRACTOR] Worker received message", event.data);

  const SILENCE_THRESHOLD = 1e-7;
  const MIN_SILENCE_DURATION = 2 * sampleRate; // 2 seconds of silence
  const SPEAKER_CHANGE_THRESHOLD = 0.5; // Threshold for detecting speaker change based on spectral features
  const MIN_SPEECH_DURATION = 0.2 * sampleRate; // Minimum speech duration in samples
  const SPEECH_INERTIA_DURATION = 0.1 * sampleRate; // Speech inertia duration in samples

  // Function to compute the waveform data
  const extractWaveform = (
    channelData, // Float32Array
    sampleRate, // number
    pointsPerSecond, // number
    algorithm, // string
  ) => {
    const length = channelData.length;
    const pointInterval = Math.floor(sampleRate / pointsPerSecond);
    const dataPoints = [];
    let minAmplitude = Infinity;
    let maxAmplitude = -Infinity;
    const speakerChanges = [];

    console.log(
      `[WAVEXTRACTOR] Extracting waveform with ${length} samples and ${pointsPerSecond} points per second --> ${pointInterval} samples per point`,
    );
    console.log(
      `[WAVEXTRACTOR] Duration: ${length / sampleRate} seconds VS ${durationMs} ms`,
    );
    const duration = durationMs / 1000;
    const expectedPoints = duration * pointsPerSecond;
    const samplesPerPoint = Math.floor(channelData.length / expectedPoints);
    console.log(
      `[WAVEXTRACTOR] Extracting waveform with expectedPoints=${expectedPoints} , samplesPerPoints=${samplesPerPoint}`,
    );

    const adaptiveRmsThreshold = 0.01;
    const adaptiveZcrThreshold = 0.1;

    for (let i = 0; i < expectedPoints; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, length);

      let sumSquares = 0;
      let zeroCrossings = 0;
      let prevValue = channelData[start];
      let localMinAmplitude = Infinity;
      let localMaxAmplitude = -Infinity;

      for (let j = start; j < end; j++) {
        const value = channelData[j];
        sumSquares += value * value;
        if (j > start && value * prevValue < 0) {
          zeroCrossings++;
        }
        prevValue = value;

        const absValue = Math.abs(value);
        localMinAmplitude = Math.min(localMinAmplitude, absValue);
        localMaxAmplitude = Math.max(localMaxAmplitude, absValue);
      }

      const rms = Math.sqrt(sumSquares / (end - start));
      minAmplitude = Math.min(minAmplitude, rms);
      maxAmplitude = Math.max(maxAmplitude, rms);

      const energy = sumSquares;
      const zcr = zeroCrossings / (end - start);

      const features = {
        rms,
        energy,
        zcr,
      };

      const dB = 20 * Math.log10(rms);
      const silent = energy < SILENCE_THRESHOLD;

      const activeSpeech =
        rms > adaptiveRmsThreshold && zcr > adaptiveZcrThreshold;

      console.log(`[WAVEXTRACTOR] Point ${i} - ${start} to ${end} samples`);
      console.log(
        `[WAVEXTRACTOR] RMS: ${rms} dB: ${dB} Silent: ${silent} zcr: ${zcr} Energy: ${energy} ActiveSpeech: ${activeSpeech}`,
      );
      console.log(
        `[WAVEXTRACTOR] detext speech zcr: ${zcr} > ${adaptiveZcrThreshold} rms: ${rms} > ${adaptiveRmsThreshold} && ${zcr} > ${adaptiveZcrThreshold}`,
      );
      dataPoints.push({
        amplitude: algorithm === "peak" ? localMaxAmplitude : rms,
        activeSpeech,
        dB,
        silent,
        features,
        timestamp: start / sampleRate,
        speaker: 0, // Assuming speaker detection is to be handled later
      });
    }

    return {
      pointsPerSecond,
      amplitudeRange: {
        min: minAmplitude,
        max: maxAmplitude,
      },
      bitDepth,
      numberOfChannels,
      durationMs,
      sampleRate,
      dataPoints,
      speakerChanges: [], // Placeholder for future speaker detection logic
    };
  };

  try {
    const result = extractWaveform(
      channelData,
      sampleRate,
      pointsPerSecond,
      algorithm,
    );
    self.postMessage(result);
  } catch (error) {
    console.error("[WAVEXTRACTOR] Error in processing", error);
    self.postMessage({ error: error.message });
  } finally {
    self.close();
  }
};
