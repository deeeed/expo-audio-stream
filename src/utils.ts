import { EncodingType } from "./ExpoAudioStream.types";

export const convertPCMToFloat32 = (
  buffer: ArrayBuffer,
  bitDepth: number,
): { pcmValues: Float32Array; min: number; max: number } => {
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
        value =
          (dataView.getInt8(offset) +
            (dataView.getInt8(offset + 1) << 8) +
            (dataView.getInt8(offset + 2) << 16)) /
          8388608;
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

  return { pcmValues: float32Array, min, max };
};

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

export interface WavFileInfo {
  sampleRate: number;
  numChannels: number;
  bitDepth: number;
  size: number; // in bytes
  durationMs: number; // in seconds
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

export const encodingToBitDepth = ({
  encoding,
}: {
  encoding: EncodingType;
}): number => {
  switch (encoding) {
    case "pcm_32bit":
      return 32;
    case "pcm_16bit":
      return 16;
    case "pcm_8bit":
      return 8;
    default:
      throw new Error(`Unsupported encoding type: ${encoding}`);
  }
};
