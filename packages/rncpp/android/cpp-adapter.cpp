#include <jni.h>
#include "rncpp.h"

extern "C"
JNIEXPORT jdouble JNICALL
Java_com_rncpp_RncppModule_nativeMultiply(JNIEnv *env, jclass type, jdouble a, jdouble b) {
    return rncpp::multiply(a, b);
}
