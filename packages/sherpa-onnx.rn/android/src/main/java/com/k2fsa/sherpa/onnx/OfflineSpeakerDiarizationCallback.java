package com.k2fsa.sherpa.onnx;

/**
 * Callback interface for offline speaker diarization progress.
 *
 * Package placement note:
 * This interface lives in com.k2fsa.sherpa.onnx to co-locate with
 * OfflineSpeakerDiarization.kt, which is the Kotlin wrapper for the
 * upstream sherpa-onnx JNI layer.
 *
 * The JNI C++ code (sherpa-onnx/jni/offline-speaker-diarization.cc,
 * processWithCallback) uses GetObjectClass(callback) — not FindClass —
 * so the package name is NOT a JNI constraint. The interface could
 * technically live in any package. It is kept here because:
 *   1. It belongs conceptually with the upstream wrapper class.
 *   2. Moving it would require import changes in both
 *      OfflineSpeakerDiarization.kt and DiarizationHandler.kt
 *      with zero functional benefit.
 *   3. If upstream sherpa-onnx adds this callback natively,
 *      same-namespace placement makes migration trivial.
 *
 * Do not move this file without understanding these points.
 */
@FunctionalInterface
public interface OfflineSpeakerDiarizationCallback {
    Integer invoke(int numProcessedChunks, int numTotalChunks, long arg);
}
