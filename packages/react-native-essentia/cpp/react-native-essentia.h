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

#endif  // CPPSRC_REACT_NATIVE_ESSENTIA_H_
