#include <jni.h>
#include <android/log.h>
#include "MelSpectrogram.h"

#define LOG_TAG "MelSpectrogramJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C" JNIEXPORT jobjectArray JNICALL
Java_net_siteed_audiostudio_MelSpectrogramNative_compute(
    JNIEnv* env, jobject /* thiz */,
    jfloatArray jSamples, jint sampleRate, jint fftLength,
    jint windowSizeSamples, jint hopLengthSamples,
    jint nMels, jfloat fMin, jfloat fMax,
    jint windowType, jboolean logScale, jboolean normalize)
{
    jfloat* samples = env->GetFloatArrayElements(jSamples, nullptr);
    jint numSamples = env->GetArrayLength(jSamples);

    LOGI("compute: numSamples=%d, sampleRate=%d, fftLength=%d, windowSize=%d, hop=%d, nMels=%d",
         numSamples, sampleRate, fftLength, windowSizeSamples, hopLengthSamples, nMels);

    MelSpectrogramConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.windowSizeSamples = windowSizeSamples;
    config.hopLengthSamples = hopLengthSamples;
    config.nMels = nMels;
    config.fMin = fMin;
    config.fMax = fMax;
    config.windowType = windowType;
    config.logScale = logScale;
    config.normalize = normalize;

    MelSpectrogramProcessor processor(config);
    MelSpectrogramResult result = processor.compute(samples, numSamples);

    env->ReleaseFloatArrayElements(jSamples, samples, JNI_ABORT);

    LOGI("compute done: timeSteps=%d, nMels=%d", result.timeSteps, result.nMels);

    // Create float[][] result
    jclass floatArrayClass = env->FindClass("[F");
    jobjectArray jResult = env->NewObjectArray(result.timeSteps, floatArrayClass, nullptr);

    for (int i = 0; i < result.timeSteps; ++i) {
        jfloatArray row = env->NewFloatArray(result.nMels);
        env->SetFloatArrayRegion(row, 0, result.nMels, result.spectrogram[i].data());
        env->SetObjectArrayElement(jResult, i, row);
        env->DeleteLocalRef(row);
    }

    return jResult;
}
