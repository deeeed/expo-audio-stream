export const convertPCMToFloat32 = (buffer: ArrayBuffer, bitDepth: number): {pcmValues: Float32Array, min: number, max: number} => {
  const dataView = new DataView(buffer);
  const length = buffer.byteLength / (bitDepth / 8);
  const float32Array = new Float32Array(length);
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < length; i++) {
    let value = 0;
    const offset = i * (bitDepth / 8);
    switch (bitDepth) {
      case 8:
        value = dataView.getInt8(offset) / 128;
        break;
      case 16:
        value = dataView.getInt16(offset, true) / 32768;
        break;
      case 24:
        value = (dataView.getInt8(offset) + (dataView.getInt8(offset + 1) << 8) + (dataView.getInt8(offset + 2) << 16)) / 8388608;
        break;
      case 32:
        value = dataView.getFloat32(offset, true);
        break;
      default:
        throw new Error(`Unsupported bit depth: ${bitDepth}`);
    }
    if (value < min) min = value;
    if (value > max) max = value;
    float32Array[i] = value;
  }

  return {pcmValues: float32Array, min, max};
};

interface WaveHeaderOptions {
  buffer: ArrayBuffer;
  sampleRate: number;
  numChannels: number;
  bitDepth: number;
}

export const writeWaveHeader = ({
  buffer,
  sampleRate,
  numChannels,
  bitDepth,
}: WaveHeaderOptions): ArrayBuffer => {
  const bytesPerSample = bitDepth / 8;
  const numSamples = buffer.byteLength / (numChannels * bytesPerSample);
  const view = new DataView(buffer);
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  // Write the WAV header
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + numSamples * blockAlign, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true); // AudioFormat (3 for float, 1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, numSamples * blockAlign, true); // Subchunk2Size

  return buffer;
};


// Helper method to generate a UUID
export const quickUUID = () => {
  // Implementation of UUID generation (use a library or custom method)
  return "xxxx-xxxx-xxxx-xxxx".replace(/[x]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
