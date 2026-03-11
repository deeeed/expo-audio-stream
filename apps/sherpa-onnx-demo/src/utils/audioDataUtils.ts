import { convertPCMToFloat32, type AudioDataEvent } from '@siteed/expo-audio-studio';

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Convert any AudioDataEvent.data format to a float32 samples array [-1, 1].
 * Returns null if the format is unrecognised (caller should skip the chunk).
 */
export async function audioDataToSamples(
  data: AudioDataEvent['data']
): Promise<number[] | null> {
  if (data instanceof Float32Array) {
    return Array.from(data);
  }
  if ((data as unknown) instanceof Int16Array) {
    const i16 = data as unknown as Int16Array;
    const out = new Array<number>(i16.length);
    for (let i = 0; i < i16.length; i++) out[i] = i16[i] / 32768;
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
