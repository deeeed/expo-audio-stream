/**
 * Internal utility function to clean file paths from Expo by removing file:// or file:/ prefixes
 */
export function cleanFilePath(path: string): string {
  if (path.startsWith('file://')) {
    return path.substring(7);
  } else if (path.startsWith('file:/')) {
    return path.substring(6);
  }
  return path;
}
