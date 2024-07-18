// packages/expo-audio-stream/src/utils/writeWavHeader.ts
interface WavHeaderOptions {
  buffer: ArrayBuffer;
  sampleRate: number;
  numChannels: number;
  bitDepth: number;
}

export const writeWavHeader = ({
  buffer,
  sampleRate,
  numChannels,
  bitDepth,
}: WavHeaderOptions): ArrayBuffer => {
  const bytesPerSample = bitDepth / 8;
  const numSamples = buffer.byteLength / (numChannels * bytesPerSample);
  const view = new DataView(buffer);
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  // Function to write a string to the DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Check if the buffer already has a WAV header by looking for "RIFF" at the start
  const existingHeader = view.getUint32(0, false) === 0x52494646; // "RIFF" in ASCII

  if (!existingHeader) {
    // Write the WAV header
    writeString(view, 0, "RIFF"); // ChunkID
    view.setUint32(4, 36 + numSamples * blockAlign, true); // ChunkSize
    writeString(view, 8, "WAVE"); // Format
    writeString(view, 12, "fmt "); // Subchunk1ID
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, bitDepth === 32 ? 3 : 1, true); // AudioFormat (3 for float, 1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitDepth, true); // BitsPerSample
    writeString(view, 36, "data"); // Subchunk2ID
    view.setUint32(40, numSamples * blockAlign, true); // Subchunk2Size
  } else {
    // Update the existing WAV header if necessary
    view.setUint32(4, 36 + numSamples * blockAlign, true); // Update ChunkSize
    view.setUint32(24, sampleRate, true); // Update SampleRate
    view.setUint32(28, byteRate, true); // Update ByteRate
    view.setUint16(32, blockAlign, true); // Update BlockAlign
    view.setUint32(40, numSamples * blockAlign, true); // Update Subchunk2Size
  }

  return buffer;
};
