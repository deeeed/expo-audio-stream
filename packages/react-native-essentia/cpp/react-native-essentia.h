// packages/react-native-essentia/cpp/react-native-essentia.h
#ifndef REACT_NATIVE_ESSENTIA_H
#define REACT_NATIVE_ESSENTIA_H

#include <jni.h>
#include "essentia/essentia.h"

#ifdef __cplusplus
extern "C" {
#endif

// JNI method declarations
JNIEXPORT jlong JNICALL Java_com_essentia_EssentiaModule_nativeCreateEssentiaWrapper(JNIEnv* env, jobject thiz);
JNIEXPORT void JNICALL Java_com_essentia_EssentiaModule_nativeDestroyEssentiaWrapper(JNIEnv* env, jobject thiz, jlong handle);
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_nativeInitializeEssentia(JNIEnv* env, jobject thiz, jlong handle);
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_nativeSetAudioData(JNIEnv* env, jobject thiz, jlong handle, jfloatArray jpcmData, jdouble jsampleRate);
JNIEXPORT jstring JNICALL Java_com_essentia_EssentiaModule_nativeExecuteAlgorithm(JNIEnv* env, jobject thiz, jlong handle, jstring jalgorithm, jstring jparamsJson);

// JNI_OnLoad function
JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved);

// Core functionality
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_initializeEssentia(JNIEnv *env, jobject thiz);

// Algorithm execution
JNIEXPORT jstring JNICALL Java_com_essentia_EssentiaModule_executeEssentiaAlgorithm(
    JNIEnv *env, jobject thiz, jstring algorithm, jstring paramsJson);

// Audio data handling
JNIEXPORT jboolean JNICALL Java_com_essentia_EssentiaModule_setAudioData(
    JNIEnv *env, jobject thiz, jfloatArray pcmData, jdouble sampleRate);

#ifdef __cplusplus
}
#endif

namespace essentia {
  double multiply(double a, double b);
}

#endif  // REACT_NATIVE_ESSENTIA_H
