/**
 * Dummy C++ file containing empty implementations of all JNI functions.
 * These implementations are only for Android Studio's code analysis and won't be used at runtime.
 * The actual implementations come from the prebuilt libsherpa-onnx-jni.so library.
 */

#include <jni.h>

// ======== OfflineStream JNI Functions ========
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineStream_delete(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineStream_acceptWaveform(JNIEnv *env, jclass clazz, jlong ptr, jfloatArray samples, jint sampleRate) {
    // Empty implementation
    return JNI_TRUE;
}

// ======== OfflineTts JNI Functions ========
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_newFromAsset(JNIEnv *env, jclass clazz, jobject assetManager, jobject config) {
    return 0;
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_newFromFile(JNIEnv *env, jclass clazz, jobject config) {
    return 0;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_generateImpl(JNIEnv *env, jclass clazz, jlong ptr, jstring text, jint sid, jfloat speed) {
    return NULL;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_generateWithCallbackImpl(JNIEnv *env, jclass clazz, jlong ptr, jstring text, jint sid, jfloat speed, jobject callback) {
    return NULL;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_getSampleRate(JNIEnv *env, jclass clazz, jlong ptr) {
    return 0;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_getNumSpeakers(JNIEnv *env, jclass clazz, jlong ptr) {
    return 0;
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_delete(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

// ======== Vad JNI Functions ========
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_newFromAsset(JNIEnv *env, jclass clazz, jobject assetManager, jobject config) {
    return 0;
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_newFromFile(JNIEnv *env, jclass clazz, jobject config) {
    return 0;
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_delete(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_acceptWaveform(JNIEnv *env, jclass clazz, jlong ptr, jfloatArray samples) {
    // Empty implementation
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_empty(JNIEnv *env, jclass clazz, jlong ptr) {
    return JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_pop(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_clear(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_front(JNIEnv *env, jclass clazz, jlong ptr) {
    return NULL;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_isSpeechDetected(JNIEnv *env, jclass clazz, jlong ptr) {
    return JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_reset(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_flush(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

// ======== AudioTagging JNI Functions ========
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_newFromAsset(JNIEnv *env, jclass clazz, jobject assetManager, jobject config) {
    return 0;
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_newFromFile(JNIEnv *env, jclass clazz, jobject config) {
    return 0;
}

extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_delete(JNIEnv *env, jclass clazz, jlong ptr) {
    // Empty implementation
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_createStream(JNIEnv *env, jclass clazz, jlong ptr) {
    return 0;
}

extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_compute(JNIEnv *env, jclass clazz, jlong ptr, jlong streamPtr, jint topK) {
    return NULL;
}

// ======== Add additional JNI function stubs as needed ========
// You can add more JNI functions from your list following the same pattern

// Example: If you have more unresolved functions, add them here:
/*
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_newFromAsset(JNIEnv *env, jclass clazz, jobject assetManager, jobject config) {
    return 0;
}
*/
