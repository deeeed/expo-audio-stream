#include <jni.h>
#include <android/log.h>
#include "MelSpectrogram.h"
#include <memory>

#define LOG_TAG "MelSpectrogramJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Cache processor across JNI calls — avoids rebuilding FFT plan,
// window, and filterbank when config is unchanged.
static std::unique_ptr<MelSpectrogramProcessor> cachedProcessor;

extern "C" JNIEXPORT jobjectArray JNICALL
Java_net_siteed_audiostudio_MelSpectrogramNative_compute(
    JNIEnv* env, jobject /* thiz */,
    jfloatArray jSamples, jint sampleRate, jint fftLength,
    jint windowSizeSamples, jint hopLengthSamples,
    jint nMels, jfloat fMin, jfloat fMax,
    jint windowType, jboolean logScale, jboolean normalize)
{
    jfloat* samples = env->GetFloatArrayElements(jSamples, nullptr);
    if (!samples) {
        LOGE("Failed to get float array elements");
        return nullptr;
    }
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

    // Reuse processor if config matches
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<MelSpectrogramProcessor>(config);
    }

    MelSpectrogramResult result = cachedProcessor->compute(samples, numSamples);

    env->ReleaseFloatArrayElements(jSamples, samples, JNI_ABORT);

    LOGI("compute done: timeSteps=%d, nMels=%d", result.timeSteps, result.nMels);

    if (result.timeSteps <= 0) {
        return nullptr;
    }

    // Create float[][] result
    jclass floatArrayClass = env->FindClass("[F");
    if (!floatArrayClass) {
        LOGE("Failed to find float[] class");
        return nullptr;
    }

    jobjectArray jResult = env->NewObjectArray(result.timeSteps, floatArrayClass, nullptr);
    if (!jResult) {
        LOGE("Failed to allocate result array");
        return nullptr;
    }

    for (int i = 0; i < result.timeSteps; ++i) {
        jfloatArray row = env->NewFloatArray(result.nMels);
        if (!row) {
            LOGE("Failed to allocate row %d", i);
            return jResult;  // Return partial result rather than leak
        }
        env->SetFloatArrayRegion(row, 0, result.nMels,
                                 result.data.data() + i * result.nMels);
        env->SetObjectArrayElement(jResult, i, row);
        env->DeleteLocalRef(row);
    }

    return jResult;
}
