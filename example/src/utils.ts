import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
/**
 * Formats bytes into a human-readable format.
 *
 * @param bytes - The size in bytes.
 * @param decimals - The number of decimal places to include in the result.
 * @returns A formatted string representing the human-readable file size.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Formats a duration in milliseconds to a string in the format mm:ss.
 *
 * @param {number} ms The duration in milliseconds to format.
 * @returns {string} The formatted time string in mm:ss format.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Pad the minutes and seconds with leading zeros if needed
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return `${paddedMinutes}:${paddedSeconds}`;
}

const MAX_8BIT = 255;
const MAX_16BIT = 32768;
const MAX_24BIT = 8388608;
export const normalizeValue = (
  value: number,
  amplitude: number,
  bitDepth: number,
): number => {
  switch (bitDepth) {
    case 8:
      return (1 - value / MAX_8BIT) * amplitude;
    case 16:
      return (1 - value / MAX_16BIT) * amplitude;
    case 24:
      return (1 - value / MAX_24BIT) * amplitude;
    default:
      throw new Error("Unsupported bit depth");
  }
};

export const fetchArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  try {
    console.log(`Reading file from: ${uri}`);
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;
    } else {
      const fileUri = uri;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists) {
        throw new Error(`File does not exist at ${fileUri}`);
      }

      const fileData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(fileData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
  } catch (error) {
    console.error(`Failed to read file from ${uri}:`, error);
    throw error;
  }
};
