import type { ModelDownloadProgress } from '../../types/interfaces';

// Shared mixin utility type used by all feature mixins.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Runs an async operation with a scoped download progress callback.
 * Saves/restores the previous global callback to avoid race conditions
 * when multiple features initialize concurrently.
 */
export async function withDownloadProgress<T>(
  onProgress: ((info: ModelDownloadProgress) => void) | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const prev = window.SherpaOnnx?.onDownloadProgress ?? null;
  if (onProgress && window.SherpaOnnx) {
    window.SherpaOnnx.onDownloadProgress = onProgress;
  }
  try {
    return await fn();
  } finally {
    if (window.SherpaOnnx) {
      window.SherpaOnnx.onDownloadProgress = prev;
    }
  }
}
