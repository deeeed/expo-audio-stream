// example/public/audio-features-extractor.js

// Unique ID counter
let uniqueIdCounter = 0;

self.onmessage = function (event) {
  const {
    channelData, // this is only the newly recorded data when live recording.
    sampleRate,
    pointsPerSecond,
    algorithm,
    bitDepth,
    fullAudioDurationMs,
    numberOfChannels,
    features,
  } = event.data;

  console.log("[AudioFeaturesExtractor] Worker received message", event.data);

  const SILENCE_THRESHOLD = 0.01;
  const MIN_SILENCE_DURATION = 1.5 * sampleRate; // 1.5 seconds of silence
  const SPEECH_INERTIA_DURATION = 0.1 * sampleRate; // Speech inertia duration in samples
  const RMS_THRESHOLD = 0.01;
  const ZCR_THRESHOLD = 0.1;

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
    let silenceStart = null;
    let lastSpeechEnd = -Infinity;
    let isSpeech = false;

    const segmentDuration = length / sampleRate;
    console.log(
      `[AudioFeaturesExtractor] Extracting waveform with ${length} samples and ${pointsPerSecond} points per second --> ${pointInterval} samples per point`,
    );
    console.log(
      `[AudioFeaturesExtractor] segmentDuration: ${segmentDuration} seconds VS fullAudioDurationMs=${fullAudioDurationMs} ms`,
    );
    const expectedPoints = segmentDuration * pointsPerSecond;
    const samplesPerPoint = Math.floor(channelData.length / expectedPoints);
    console.log(
      `[AudioFeaturesExtractor] Extracting waveform with expectedPoints=${expectedPoints} , samplesPerPoints=${samplesPerPoint}`,
    );

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

      const silent = rms < SILENCE_THRESHOLD;
      const dB = 20 * Math.log10(rms);

      if (silent) {
        if (silenceStart === null) {
          silenceStart = start;
        } else if (start - silenceStart > MIN_SILENCE_DURATION) {
          // Silence detected for longer than the threshold, set amplitude to 0
          localMaxAmplitude = 0;
          localMinAmplitude = 0;
          isSpeech = false;
        }
      } else {
        silenceStart = null;
        if (!isSpeech && start - lastSpeechEnd < SPEECH_INERTIA_DURATION) {
          isSpeech = true;
        }
        lastSpeechEnd = end;
      }

      const activeSpeech =
        (rms > RMS_THRESHOLD && zcr > ZCR_THRESHOLD) ||
        (isSpeech && start - lastSpeechEnd < SPEECH_INERTIA_DURATION);

      if (activeSpeech) {
        isSpeech = true;
        lastSpeechEnd = end;
      } else {
        isSpeech = false;
      }

      dataPoints.push({
        id: uniqueIdCounter++, // Assign unique ID and increment the counter
        amplitude: algorithm === "peak" ? localMaxAmplitude : rms,
        activeSpeech,
        dB,
        silent,
        features: {
          energy,
          rms,
          zcr,
          mfcc: [], // Placeholder for MFCC features
          spectralCentroid: 0, // Placeholder for spectral centroid
          spectralFlatness: 0, // Placeholder for spectral flatness
        },
        timestamp: start / sampleRate,
        speaker: 0, // Assuming speaker detection is to be handled later
      });
    }

    return {
      pointsPerSecond,
      durationMs: fullAudioDurationMs,
      bitDepth,
      numberOfChannels,
      sampleRate,
      dataPoints,
      amplitudeRange: {
        min: minAmplitude,
        max: maxAmplitude,
      },
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
    self.postMessage({
      command: "features",
      result,
    });
  } catch (error) {
    console.error("[AudioFeaturesExtractor] Error in processing", error);
    self.postMessage({ error: error.message });
  } finally {
    // Do not close the worker so it can be re-used for subsequent messages
    // self.close();
  }
};
