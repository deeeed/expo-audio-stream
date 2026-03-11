export function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  const intSamples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0;
    const clamped = s < -1 ? -1 : s > 1 ? 1 : s;
    intSamples[i] = Math.round(clamped * 32767);
  }

  const buffer = new ArrayBuffer(44 + intSamples.length * 2);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, 36 + intSamples.length * 2, true);
  view.setUint32(8, 0x45564157, true);
  view.setUint32(12, 0x20746d66, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, true);
  view.setUint32(40, intSamples.length * 2, true);
  for (let i = 0; i < intSamples.length; i++) {
    view.setInt16(44 + i * 2, intSamples[i] ?? 0, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// Module-level references so stopAudioPlayback() can interrupt active playback.
let _activeSource: AudioBufferSourceNode | null = null;
let _activeContext: AudioContext | null = null;

/** Stop any audio currently playing via playAudioSamples(). No-op if nothing is playing. */
export function stopAudioPlayback(): void {
  if (_activeSource) {
    try { _activeSource.stop(); } catch (_) {}
    _activeSource = null;
  }
  if (_activeContext) {
    _activeContext.close().catch(() => {});
    _activeContext = null;
  }
}

export async function playAudioSamples(
  samples: Float32Array,
  sampleRate: number
): Promise<void> {
  // Stop any previous playback before starting new one.
  stopAudioPlayback();

  type AudioContextType = typeof window.AudioContext;
  const AudioContext: AudioContextType =
    window.AudioContext ||
    (window as { webkitAudioContext?: AudioContextType }).webkitAudioContext;

  if (!AudioContext) {
    throw new Error('AudioContext not supported in this browser');
  }

  const audioContext = new AudioContext({ sampleRate });
  const buf = audioContext.createBuffer(1, samples.length, sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < samples.length; i++) ch[i] = samples[i] ?? 0;

  const source = audioContext.createBufferSource();
  source.buffer = buf;
  source.connect(audioContext.destination);
  source.start();

  _activeSource = source;
  _activeContext = audioContext;

  return new Promise((resolve) => {
    source.onended = () => {
      _activeSource = null;
      _activeContext = null;
      resolve();
    };
  });
}

/**
 * Decode a 16-bit PCM WAV ArrayBuffer into Float32 samples.
 * Returns null if the format is not supported.
 */
export function decodeWav(
  buffer: ArrayBuffer
): { samples: Float32Array; sampleRate: number } | null {
  const view = new DataView(buffer);
  // Basic WAV header validation
  if (view.getUint32(0, false) !== 0x52494646) return null; // "RIFF"
  if (view.getUint32(8, false) !== 0x57415645) return null; // "WAVE"
  if (view.getUint32(12, false) !== 0x666d7420) return null; // "fmt "
  const audioFormat = view.getUint16(20, true);
  if (audioFormat !== 1) return null; // PCM only
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  if (bitsPerSample !== 16) return null;

  // Find "data" chunk
  let dataOffset = 36;
  while (dataOffset < buffer.byteLength - 8) {
    const tag = view.getUint32(dataOffset, false);
    const chunkSize = view.getUint32(dataOffset + 4, true);
    if (tag === 0x64617461) {
      // "data"
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }

  const numSamples = Math.floor(
    (buffer.byteLength - dataOffset) / 2 / channels
  );
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    // Take first channel only for mono ASR
    const pcm = view.getInt16(dataOffset + i * channels * 2, true);
    samples[i] = pcm / 32768.0;
  }
  return { samples, sampleRate };
}

/**
 * Fetch an audio file and decode it to Float32 samples.
 * Tries WAV decoding first, falls back to AudioContext.decodeAudioData.
 */
export async function fetchAndDecodeAudio(
  url: string
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  // Try WAV decoding first (faster, no async overhead)
  const wav = decodeWav(buffer);
  if (wav) return wav;

  // Fall back to Web Audio API for other formats
  type AudioContextType = typeof window.AudioContext;
  const AudioContext: AudioContextType =
    window.AudioContext ||
    (window as { webkitAudioContext?: AudioContextType }).webkitAudioContext;

  if (!AudioContext) {
    throw new Error('Cannot decode audio: no AudioContext available');
  }

  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(buffer);
  const samples = audioBuffer.getChannelData(0); // mono
  const sampleRate = audioBuffer.sampleRate;
  ctx.close();
  return { samples: new Float32Array(samples), sampleRate };
}
