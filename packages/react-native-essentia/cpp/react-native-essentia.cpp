// packages/react-native-essentia/cpp/react-native-essentia.cpp
#include "react-native-essentia.h"
#include <string>
#include <android/log.h>
#include "essentia/essentia.h"
#include "essentia/version.h"

#define LOG_TAG "EssentiaWrapper"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace essentia {
	double multiply(double a, double b) {
		return a * b;
	}
}

JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_initializeEssentia(JNIEnv *env, jobject thiz) {
	try {
		// Initialize Essentia
		essentia::init();
		LOGI("Essentia initialized successfully");
		return JNI_TRUE;
	} catch (const std::exception& e) {
		LOGE("Failed to initialize Essentia: %s", e.what());
		return JNI_FALSE;
	}
}

JNIEXPORT jstring JNICALL
Java_com_essentia_EssentiaModule_getEssentiaVersion(JNIEnv *env, jobject thiz) {
	std::string version = essentia::version;
	return env->NewStringUTF(version.c_str());
}
