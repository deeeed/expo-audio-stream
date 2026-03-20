#include <jni.h>
#include <android/log.h>
#include "AudioFeatures.h"
#include <memory>
#include <mutex>

#define LOG_TAG "AudioFeaturesJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static std::unique_ptr<AudioFeaturesProcessor> cachedProcessor;
static std::mutex cachedMutex;

extern "C" JNIEXPORT void JNICALL
Java_net_siteed_audiostudio_AudioFeaturesNative_init(
    JNIEnv* env, jobject /* thiz */,
    jint sampleRate, jint fftLength, jint nMfcc, jint nMelFilters,
    jboolean computeMfcc, jboolean computeChroma)
{
    AudioFeaturesConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.nMfcc = nMfcc;
    config.nMelFilters = nMelFilters;
    config.computeMfcc = computeMfcc;
    config.computeChroma = computeChroma;

    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<AudioFeaturesProcessor>(config);
    }
    LOGI("init: sampleRate=%d, fftLength=%d, nMfcc=%d, nMelFilters=%d",
         sampleRate, fftLength, nMfcc, nMelFilters);
}

extern "C" JNIEXPORT jobject JNICALL
Java_net_siteed_audiostudio_AudioFeaturesNative_computeFrame(
    JNIEnv* env, jobject /* thiz */,
    jfloatArray jSamples, jint sampleRate, jint fftLength,
    jint nMfcc, jint nMelFilters, jboolean computeMfcc, jboolean computeChroma)
{
    jfloat* samples = env->GetFloatArrayElements(jSamples, nullptr);
    if (!samples) {
        LOGE("computeFrame: failed to get samples array");
        return nullptr;
    }
    jint numSamples = env->GetArrayLength(jSamples);

    AudioFeaturesConfig config;
    config.sampleRate = sampleRate;
    config.fftLength = fftLength;
    config.nMfcc = nMfcc;
    config.nMelFilters = nMelFilters;
    config.computeMfcc = computeMfcc;
    config.computeChroma = computeChroma;

    std::lock_guard<std::mutex> lock(cachedMutex);
    if (!cachedProcessor || !(cachedProcessor->config() == config)) {
        cachedProcessor = std::make_unique<AudioFeaturesProcessor>(config);
    }

    AudioFeaturesResult result = cachedProcessor->compute(samples, numSamples);

    env->ReleaseFloatArrayElements(jSamples, samples, JNI_ABORT);

    LOGI("computeFrame: centroid=%.2f, flatness=%.6f, rolloff=%.2f, bandwidth=%.2f, mfcc_size=%d, chroma_size=%d",
         result.spectralCentroid, result.spectralFlatness,
         result.spectralRolloff, result.spectralBandwidth,
         (int)result.mfcc.size(), (int)result.chromagram.size());

    // Build HashMap<String, Object>
    jclass hashMapClass = env->FindClass("java/util/HashMap");
    if (!hashMapClass || env->ExceptionCheck()) {
        LOGE("computeFrame: failed to find HashMap class");
        env->ExceptionClear();
        return nullptr;
    }
    jmethodID hashMapInit = env->GetMethodID(hashMapClass, "<init>", "()V");
    jmethodID hashMapPut = env->GetMethodID(hashMapClass, "put",
        "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;");
    if (!hashMapInit || !hashMapPut || env->ExceptionCheck()) {
        LOGE("computeFrame: failed to get HashMap methods");
        env->ExceptionClear();
        env->DeleteLocalRef(hashMapClass);
        return nullptr;
    }

    jobject map = env->NewObject(hashMapClass, hashMapInit);
    if (!map) {
        LOGE("computeFrame: failed to create HashMap");
        env->DeleteLocalRef(hashMapClass);
        return nullptr;
    }

    // Helper: box a float as java.lang.Float
    jclass floatClass = env->FindClass("java/lang/Float");
    jmethodID floatValueOf = env->GetStaticMethodID(floatClass, "valueOf", "(F)Ljava/lang/Float;");
    if (!floatClass || !floatValueOf || env->ExceptionCheck()) {
        LOGE("computeFrame: failed to get Float class/method");
        env->ExceptionClear();
        if (floatClass) env->DeleteLocalRef(floatClass);
        env->DeleteLocalRef(hashMapClass);
        return map; // return partial map with no values
    }

    // Put scalar values
    auto putFloat = [&](const char* key, float value) {
        jstring jKey = env->NewStringUTF(key);
        if (!jKey) return;
        jobject jVal = env->CallStaticObjectMethod(floatClass, floatValueOf, value);
        env->CallObjectMethod(map, hashMapPut, jKey, jVal);
        env->DeleteLocalRef(jKey);
        env->DeleteLocalRef(jVal);
    };

    putFloat("spectralCentroid", result.spectralCentroid);
    putFloat("spectralFlatness", result.spectralFlatness);
    putFloat("spectralRolloff", result.spectralRolloff);
    putFloat("spectralBandwidth", result.spectralBandwidth);

    // Put MFCC array
    if (!result.mfcc.empty()) {
        jfloatArray jMfcc = env->NewFloatArray(static_cast<jsize>(result.mfcc.size()));
        if (jMfcc) {
            env->SetFloatArrayRegion(jMfcc, 0, static_cast<jsize>(result.mfcc.size()), result.mfcc.data());
            jstring key = env->NewStringUTF("mfcc");
            if (key) {
                env->CallObjectMethod(map, hashMapPut, key, jMfcc);
                env->DeleteLocalRef(key);
            }
            env->DeleteLocalRef(jMfcc);
        }
    }

    // Put chromagram array
    if (!result.chromagram.empty()) {
        jfloatArray jChroma = env->NewFloatArray(static_cast<jsize>(result.chromagram.size()));
        if (jChroma) {
            env->SetFloatArrayRegion(jChroma, 0, static_cast<jsize>(result.chromagram.size()), result.chromagram.data());
            jstring key = env->NewStringUTF("chromagram");
            if (key) {
                env->CallObjectMethod(map, hashMapPut, key, jChroma);
                env->DeleteLocalRef(key);
            }
            env->DeleteLocalRef(jChroma);
        }
    }

    env->DeleteLocalRef(floatClass);
    env->DeleteLocalRef(hashMapClass);
    return map;
}
