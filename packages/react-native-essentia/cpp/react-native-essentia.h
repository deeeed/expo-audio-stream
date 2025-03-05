// packages/react-native-essentia/cpp/react-native-essentia.h
#ifndef CPPSRC_REACT_NATIVE_ESSENTIA_H_
#define CPPSRC_REACT_NATIVE_ESSENTIA_H_

#include <jni.h>
#include "essentia/essentia.h"

#ifdef __cplusplus
extern "C" {
#endif

// Core functionality
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_initializeEssentia(JNIEnv *env, jobject thiz);
JNIEXPORT jstring JNICALL Java_com_essentia_EssentiaModule_getEssentiaVersion(JNIEnv *env, jobject thiz);

// Algorithm execution
JNIEXPORT jstring JNICALL Java_com_essentia_EssentiaModule_executeEssentiaAlgorithm(
    JNIEnv *env, jobject thiz, jstring category, jstring algorithm, jstring paramsJson);

// Audio file handling
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_loadAudioFile(
    JNIEnv *env, jobject thiz, jstring audioPath, jdouble sampleRate);
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_unloadAudioFile(
    JNIEnv *env, jobject thiz);
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_processAudioFrames(
    JNIEnv *env, jobject thiz, jint frameSize, jint hopSize);

// Audio data handling
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_setAudioData(
    JNIEnv *env, jobject thiz, jfloatArray pcmData, jdouble sampleRate);
JNIEXPORT void JNICALL Java_com_essentia_EssentiaModule_nativeClearAudioBuffer(
    JNIEnv *env, jobject thiz);
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_nativeSetAudioDataChunk(
    JNIEnv *env, jobject thiz, jdoubleArray chunk, jint startIdx, jint totalSize, jdouble sampleRate);

// Testing methods
JNIEXPORT jstring JNICALL Java_com_essentia_EssentiaModule_testMFCC(
    JNIEnv *env, jobject thiz);

#ifdef __cplusplus
}
#endif

namespace essentia {
  double multiply(double a, double b);
}

#endif  // CPPSRC_REACT_NATIVE_ESSENTIA_H_
