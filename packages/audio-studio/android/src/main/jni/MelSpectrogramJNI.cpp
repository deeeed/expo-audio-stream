#include <jni.h>
#include <android/log.h>
#include "MelSpectrogram.h"
#include <memory>
#include <cmath>
#include <mutex>

#define LOG_TAG "MelSpectrogramJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Cache processor across JNI calls — avoids rebuilding FFT plan,
// window, and filterbank when config is unchanged.
static std::unique_ptr<MelSpectrogramProcessor> cachedProcessor;
static std::mutex cachedMutex;

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
    std::lock_guard<std::mutex> lock(cachedMutex);
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

extern "C" JNIEXPORT void JNICALL
Java_net_siteed_audiostudio_MelSpectrogramNative_init(
    JNIEnv* env, jobject /* thiz */,
    jint sampleRate, jint fftLength, jint windowSizeSamples,
    jint hopLengthSamples, jint nMels, jfloat fMin, jfloat fMax,
    jint windowType)
{
    MelSpectrogramConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.windowSizeSamples = windowSizeSamples;
    config.hopLengthSamples = hopLengthSamples;
    config.nMels = nMels;
    config.fMin = fMin;
    config.fMax = fMax;
    config.windowType = windowType;
    config.logScale = false;
    config.normalize = false;

    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<MelSpectrogramProcessor>(config);
    }
    LOGI("init: sampleRate=%d, fftLength=%d, nMels=%d", sampleRate, fftLength, nMels);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_net_siteed_audiostudio_MelSpectrogramNative_computeFrame(
    JNIEnv* env, jobject /* thiz */,
    jfloatArray jFrame, jfloatArray jMelOutput)
{
    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor) {
        LOGE("computeFrame: processor not initialized, call init() first");
        return JNI_FALSE;
    }

    jfloat* frame = env->GetFloatArrayElements(jFrame, nullptr);
    if (!frame) {
        LOGE("computeFrame: failed to get frame array");
        return JNI_FALSE;
    }
    jint frameSize = env->GetArrayLength(jFrame);

    jfloat* melOutput = env->GetFloatArrayElements(jMelOutput, nullptr);
    if (!melOutput) {
        env->ReleaseFloatArrayElements(jFrame, frame, JNI_ABORT);
        LOGE("computeFrame: failed to get melOutput array");
        return JNI_FALSE;
    }

    cachedProcessor->computeFrame(frame, frameSize, melOutput);

    // Always apply log scaling (log(max(1e-10, val))) regardless of config.logScale
    const int nMels = cachedProcessor->config().nMels;
    for (int i = 0; i < nMels; ++i) {
        melOutput[i] = std::log(std::max(1e-10f, melOutput[i]));
    }

    env->ReleaseFloatArrayElements(jFrame, frame, JNI_ABORT);
    env->ReleaseFloatArrayElements(jMelOutput, melOutput, 0); // 0 = copy back

    return JNI_TRUE;
}

extern "C" JNIEXPORT jint JNICALL
Java_net_siteed_audiostudio_MelSpectrogramNative_getNMels(
    JNIEnv* env, jobject /* thiz */)
{
    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor) {
        return 0;
    }
    return cachedProcessor->config().nMels;
}
