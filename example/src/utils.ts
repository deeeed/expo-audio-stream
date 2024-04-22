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
