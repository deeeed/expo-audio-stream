// packages/react-native-essentia/cpp/JNIBindings.cpp
#include <jni.h>
#include "EssentiaWrapper.h"
#include "FeatureExtractor.h"
#include "Utils.h"

// Helper function to convert jlong to EssentiaWrapper pointer
EssentiaWrapper* getWrapper(JNIEnv* env, jlong ptr) {
    return reinterpret_cast<EssentiaWrapper*>(ptr);
}

// 1. Create EssentiaWrapper instance
extern "C" JNIEXPORT jlong JNICALL createEssentiaWrapper(JNIEnv* env, jobject /* thiz */) {
    EssentiaWrapper* wrapper = new EssentiaWrapper();
    return reinterpret_cast<jlong>(wrapper);
}

// Define destroyEssentiaWrapper
extern "C" JNIEXPORT void JNICALL destroyEssentiaWrapper(JNIEnv* env, jobject thiz, jlong ptr) {
    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(ptr); // Cast jlong back to pointer
    delete wrapper;                                              // Delete the instance
}

// 3. Initialize Essentia
extern "C" JNIEXPORT jboolean JNICALL initializeEssentia(JNIEnv* env, jobject /* thiz */, jlong ptr) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    return wrapper->initialize() ? JNI_TRUE : JNI_FALSE; // Assuming initialize() returns bool
}

// 4. Set audio data
extern "C" JNIEXPORT jboolean JNICALL setAudioData(JNIEnv* env, jobject /* thiz */, jlong ptr, jfloatArray audioData, jdouble sampleRate) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    jsize len = env->GetArrayLength(audioData);
    jfloat* data = env->GetFloatArrayElements(audioData, nullptr);
    std::vector<float> buffer(data, data + len); // Assuming Essentia uses std::vector<float>
    env->ReleaseFloatArrayElements(audioData, data, 0);
    return wrapper->setAudioData(buffer, sampleRate) ? JNI_TRUE : JNI_FALSE; // Assuming method exists
}

// 5. Execute algorithm
extern "C" JNIEXPORT jstring JNICALL executeAlgorithm(JNIEnv* env, jobject /* thiz */, jlong ptr, jstring algorithm, jstring paramsJson) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    const char* algoStr = env->GetStringUTFChars(algorithm, nullptr);
    const char* paramsStr = env->GetStringUTFChars(paramsJson, nullptr);
    std::string result = wrapper->executeAlgorithm(algoStr, paramsStr); // Assuming method exists
    env->ReleaseStringUTFChars(algorithm, algoStr);
    env->ReleaseStringUTFChars(paramsJson, paramsStr);
    return env->NewStringUTF(result.c_str());
}

// 6. Test JNI connection
extern "C" JNIEXPORT jstring JNICALL testJniConnection(JNIEnv* env, jobject /* thiz */) {
    return env->NewStringUTF("JNI connection successful");
}

// 7. Get algorithm info
extern "C" JNIEXPORT jstring JNICALL getAlgorithmInfo(JNIEnv* env, jobject /* thiz */, jlong ptr, jstring algorithm) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    const char* algoStr = env->GetStringUTFChars(algorithm, nullptr);
    std::string result = wrapper->getAlgorithmInfo(algoStr); // Assuming method exists
    env->ReleaseStringUTFChars(algorithm, algoStr);
    return env->NewStringUTF(result.c_str());
}

// 8. Get all algorithms
extern "C" JNIEXPORT jstring JNICALL getAllAlgorithms(JNIEnv* env, jobject /* thiz */, jlong ptr) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    std::string result = wrapper->getAllAlgorithms(); // Assuming method exists
    return env->NewStringUTF(result.c_str());
}

// 9. Extract features
extern "C" JNIEXPORT jstring JNICALL nativeExtractFeatures(JNIEnv* env, jobject /* thiz */, jlong ptr, jstring featuresJson) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    FeatureExtractor extractor(wrapper); // Assuming FeatureExtractor constructor takes EssentiaWrapper*
    const char* jsonStr = env->GetStringUTFChars(featuresJson, nullptr);
    std::string result = extractor.extractFeatures(jsonStr); // Assuming method exists
    env->ReleaseStringUTFChars(featuresJson, jsonStr);
    return env->NewStringUTF(result.c_str());
}

// 10. Get version
extern "C" JNIEXPORT jstring JNICALL getVersion(JNIEnv* env, jobject /* thiz */) {
    return env->NewStringUTF(essentia::version); // Assuming essentia::version() exists
}

// 11. Compute mel spectrogram
extern "C" JNIEXPORT jstring JNICALL nativeComputeMelSpectrogram(JNIEnv* env, jobject /* thiz */, jlong ptr, jint frameSize, jint hopSize, jint nMels, jfloat fMin, jfloat fMax, jstring windowType, jboolean normalize, jboolean logScale) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    FeatureExtractor extractor(wrapper);
    const char* windowStr = env->GetStringUTFChars(windowType, nullptr);
    std::string result = extractor.computeMelSpectrogram(frameSize, hopSize, nMels, fMin, fMax, windowStr, normalize, logScale); // Assuming method exists
    env->ReleaseStringUTFChars(windowType, windowStr);
    return env->NewStringUTF(result.c_str());
}

// 12. Execute pipeline
extern "C" JNIEXPORT jstring JNICALL nativeExecutePipeline(JNIEnv* env, jobject /* thiz */, jlong ptr, jstring pipelineJson) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    FeatureExtractor extractor(wrapper);
    const char* jsonStr = env->GetStringUTFChars(pipelineJson, nullptr);
    std::string result = extractor.executePipeline(jsonStr); // Assuming method exists
    env->ReleaseStringUTFChars(pipelineJson, jsonStr);
    return env->NewStringUTF(result.c_str());
}

// 13. Compute spectrum
extern "C" JNIEXPORT jboolean JNICALL nativeComputeSpectrum(JNIEnv* env, jobject /* thiz */, jlong ptr, jint frameSize, jint hopSize) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    wrapper->computeSpectrum(frameSize, hopSize); // Assuming method exists
    return wrapper->getSpectrumComputed() ? JNI_TRUE : JNI_FALSE; // Assuming method exists
}

// Add a dedicated method for Tonnetz transformation using nlohmann/json
extern "C" JNIEXPORT jstring JNICALL nativeComputeTonnetz(JNIEnv* env, jobject /* thiz */, jlong ptr, jstring hpcpJson) {
    EssentiaWrapper* wrapper = getWrapper(env, ptr);
    const char* jsonStr = env->GetStringUTFChars(hpcpJson, nullptr);

    // Parse the HPCP array from JSON
    std::string result;
    try {
        // Use nlohmann/json from Utils.h instead of rapidjson
        nlohmann::json inputJson = nlohmann::json::parse(jsonStr);

        if (inputJson.is_array()) {
            // Convert JSON array to vector
            std::vector<essentia::Real> hpcp;
            for (const auto& element : inputJson) {
                if (element.is_number()) {
                    hpcp.push_back(static_cast<essentia::Real>(element.get<double>()));
                }
            }

            // Apply Tonnetz transformation
            std::vector<essentia::Real> tonnetz = wrapper->applyTonnetzTransform(hpcp);

            // Create result JSON using nlohmann/json
            nlohmann::json resultJson;
            resultJson["success"] = true;
            resultJson["data"] = {{"tonnetz", tonnetz}};

            result = resultJson.dump();
        } else {
            // Invalid input format - use existing utility function
            result = createErrorResponse("HPCP must be an array", "INVALID_INPUT");
        }
    } catch (const std::exception& e) {
        // Use existing utility function
        result = createErrorResponse(e.what(), "PROCESSING_ERROR");
    }

    env->ReleaseStringUTFChars(hpcpJson, jsonStr);
    return env->NewStringUTF(result.c_str());
}

// JNI_OnLoad function (unchanged from your code)
extern "C" JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env;
    if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }

    jclass clazz = env->FindClass("net/siteed/essentia/EssentiaModule");
    if (clazz == nullptr) {
        return JNI_ERR;
    }

    static const JNINativeMethod methods[] = {
        {"nativeCreateEssentiaWrapper", "()J", (void*)createEssentiaWrapper},
        {"nativeDestroyEssentiaWrapper", "(J)V", (void*)destroyEssentiaWrapper},
        {"nativeInitializeEssentia", "(J)Z", (void*)initializeEssentia},
        {"nativeSetAudioData", "(J[FD)Z", (void*)setAudioData},
        {"nativeExecuteAlgorithm", "(JLjava/lang/String;Ljava/lang/String;)Ljava/lang/String;", (void*)executeAlgorithm},
        {"testJniConnection", "()Ljava/lang/String;", (void*)testJniConnection},
        {"nativeGetAlgorithmInfo", "(JLjava/lang/String;)Ljava/lang/String;", (void*)getAlgorithmInfo},
        {"nativeGetAllAlgorithms", "(J)Ljava/lang/String;", (void*)getAllAlgorithms},
        {"nativeExtractFeatures", "(JLjava/lang/String;)Ljava/lang/String;", (void*)nativeExtractFeatures},
        {"getVersion", "()Ljava/lang/String;", (void*)getVersion},
        {"nativeComputeMelSpectrogram", "(JIIIFFLjava/lang/String;ZZ)Ljava/lang/String;", (void*)nativeComputeMelSpectrogram},
        {"nativeExecutePipeline", "(JLjava/lang/String;)Ljava/lang/String;", (void*)nativeExecutePipeline},
        {"nativeComputeSpectrum", "(JII)Z", (void*)nativeComputeSpectrum},
        {"nativeComputeTonnetz", "(JLjava/lang/String;)Ljava/lang/String;", (void*)nativeComputeTonnetz},
    };

    int rc = env->RegisterNatives(clazz, methods, sizeof(methods) / sizeof(methods[0]));
    if (rc != JNI_OK) {
        return JNI_ERR;
    }

    return JNI_VERSION_1_6;
}
