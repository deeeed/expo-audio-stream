package com.essentia

/**
 * Interface for native code to report progress updates
 */
interface ProgressCallback {
  /**
   * Called by native code to report progress
   * @param progress Progress value between 0.0 and 1.0
   */
  fun onProgress(progress: Float)
}
