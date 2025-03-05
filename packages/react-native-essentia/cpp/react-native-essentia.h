// packages/react-native-essentia/cpp/react-native-essentia.h
#ifndef ESSENTIA_H
#define ESSENTIA_H

#include <jni.h>
#include "essentia/essentia.h"

extern "C" {
    JNIEXPORT jboolean JNICALL
    Java_com_essentia_EssentiaModule_initializeEssentia(JNIEnv *env, jobject thiz);

    JNIEXPORT jstring JNICALL
    Java_com_essentia_EssentiaModule_getEssentiaVersion(JNIEnv *env, jobject thiz);
}

namespace essentia {
  double multiply(double a, double b);
}

#endif /* ESSENTIA_H */
