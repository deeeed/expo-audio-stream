import type { ModelDownloadProgress } from '../../types/interfaces';

// Shared mixin utility type used by all feature mixins.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = {}> = new (...args: any[]) => T;

let _progressId = 0;
const _progressCallbacks = new Map<number, (info: ModelDownloadProgress) => void>();

/**
 * Dispatch a download progress event to the callback registered for the
 * current (most-recent) withDownloadProgress scope.  Called from the global
 * onDownloadProgress hook.
 */
function _dispatchProgress(info: ModelDownloadProgress) {
  // Deliver to the most recently registered callback (LIFO) so nested
  // scopes work correctly.
  if (_progressCallbacks.size === 0) return;
  const lastKey = Array.from(_progressCallbacks.keys()).pop()!;
  _progressCallbacks.get(lastKey)!(info);
}

/**
 * Runs an async operation with a scoped download progress callback.
 * Uses a per-call registration so concurrent feature initializations
 * each receive their own progress events without clobbering each other.
 */
export async function withDownloadProgress<T>(
  onProgress: ((info: ModelDownloadProgress) => void) | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!onProgress) return fn();

  const id = ++_progressId;
  _progressCallbacks.set(id, onProgress);

  // Install the global dispatcher if not yet set
  if (window.SherpaOnnx && !window.SherpaOnnx.onDownloadProgress) {
    window.SherpaOnnx.onDownloadProgress = _dispatchProgress;
  }
  try {
    return await fn();
  } finally {
    _progressCallbacks.delete(id);
    // Remove global hook when no callbacks remain
    if (_progressCallbacks.size === 0 && window.SherpaOnnx) {
      window.SherpaOnnx.onDownloadProgress = null;
    }
  }
}
