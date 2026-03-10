/**
 * Cross-platform file reading utilities.
 *
 * On web, we use fetch() because expo-file-system is not available.
 * On native, we use expo-file-system with Base64 decoding.
 */
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/** Normalize a URI so it's fetchable on web or readable by expo-file-system on native. */
function toNativeUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('http')) return uri;
  return `file://${uri}`;
}

/**
 * Read a file as ArrayBuffer.
 * On web: fetch the URL.
 * On native: read as Base64, decode to ArrayBuffer.
 */
export async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch ${uri}: ${response.status}`);
    return response.arrayBuffer();
  }
  const expoUri = toNativeUri(uri);
  const base64 = await FileSystem.readAsStringAsync(expoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Read a file as a UTF-8 string.
 * On web: fetch the URL.
 * On native: use FileSystem.readAsStringAsync (UTF-8).
 */
export async function readFileAsText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch ${uri}: ${response.status}`);
    // Expo's SPA fallback returns HTML for missing files — detect and reject
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`Expected text file but got HTML for ${uri} (SPA fallback?)`);
    }
    return response.text();
  }
  return FileSystem.readAsStringAsync(toNativeUri(uri));
}

/**
 * Check if a file/directory exists.
 * On web: HEAD request (falls back to GET on error).
 * On native: FileSystem.getInfoAsync.
 */
export async function fileExists(uri: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      const r = await fetch(uri, { method: 'HEAD' });
      if (!r.ok) return false;
      // Expo SPA fallback returns 200 + text/html for missing files
      const ct = r.headers.get('content-type') || '';
      return !ct.includes('text/html');
    } catch {
      return false;
    }
  }
  const info = await FileSystem.getInfoAsync(toNativeUri(uri));
  return info.exists;
}
