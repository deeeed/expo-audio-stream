// packages/expo-audio-stream/src/utils/getWavFileInfo.ts

export interface WavFileInfo {
  sampleRate: number;
  numChannels: number;
  bitDepth: number;
  size: number; // in bytes
  durationMs: number; // in ms
}

export const getWavFileInfo = async (
  arrayBuffer: ArrayBuffer,
): Promise<WavFileInfo> => {
  const view = new DataView(arrayBuffer);

  // Check if the file is a valid RIFF/WAVE file
  const riffHeader = view.getUint32(0, false); // "RIFF"
  const waveHeader = view.getUint32(8, false); // "WAVE"
  if (riffHeader !== 0x52494646 || waveHeader !== 0x57415645) {
    throw new Error("Invalid WAV file");
  }

  // Locate the "fmt " chunk
  let fmtChunkOffset = 12;
  let sampleRate = 0;
  let numChannels = 0;
  let bitDepth = 0;
  let dataChunkSize = 0;
  let audioFormat = 0;

  while (fmtChunkOffset < view.byteLength) {
    const chunkId = view.getUint32(fmtChunkOffset, false);
    const chunkSize = view.getUint32(fmtChunkOffset + 4, true);
    if (chunkId === 0x666d7420) {
      // "fmt "
      audioFormat = view.getUint16(fmtChunkOffset + 8, true);
      if (audioFormat !== 1 && audioFormat !== 3) {
        throw new Error("Unsupported WAV file format");
      }
      numChannels = view.getUint16(fmtChunkOffset + 10, true);
      sampleRate = view.getUint32(fmtChunkOffset + 12, true);
      bitDepth = view.getUint16(fmtChunkOffset + 22, true);
    } else if (chunkId === 0x64617461) {
      // "data"
      dataChunkSize = chunkSize;
      break;
    }
    fmtChunkOffset += 8 + chunkSize;
  }

  if (!sampleRate || !numChannels || !bitDepth || !dataChunkSize) {
    throw new Error("Incomplete WAV file information");
  }

  // Calculate duration
  const bytesPerSample = bitDepth / 8;
  const numSamples = dataChunkSize / (numChannels * bytesPerSample);
  const durationMs = (numSamples / sampleRate) * 1000;

  return {
    sampleRate,
    numChannels,
    bitDepth,
    size: arrayBuffer.byteLength,
    durationMs,
  };
};
