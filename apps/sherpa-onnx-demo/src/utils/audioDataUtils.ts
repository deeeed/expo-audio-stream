import { convertPCMToFloat32, type AudioDataEvent } from '@siteed/expo-audio-studio';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Convert any AudioDataEvent.data format to a PCM samples array in [-1, 1].
 * Returns null if the format is unrecognised (caller should skip the chunk).
 *
 * TODO: remove Int16Array branch once expo-audio-studio normalises web
 * delivery to Float32Array unconditionally.
 */
export async function audioDataToSamples(
  data: AudioDataEvent['data']
): Promise<number[] | null> {
  if (data instanceof Float32Array) {
    return Array.from(data);
  }
  if (data instanceof Int16Array) {
    const out = new Array<number>(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] / 32768;
    return out;
  }
  if (typeof data === 'string') {
    const buffer = base64ToArrayBuffer(data);
    const { pcmValues } = await convertPCMToFloat32({ buffer, bitDepth: 16, skipWavHeader: true });
    return Array.from(pcmValues);
  }
  if (data instanceof ArrayBuffer) {
    const { pcmValues } = await convertPCMToFloat32({ buffer: data, bitDepth: 16, skipWavHeader: true });
    return Array.from(pcmValues);
  }
  return null;
}
