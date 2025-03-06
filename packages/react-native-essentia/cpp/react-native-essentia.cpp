// packages/react-native-essentia/cpp/react-native-essentia.cpp
#include "react-native-essentia.h"
#include <vector>
#include <algorithm>
#include <jni.h>
#include <sstream>
#include <map>
#include <set>

#include "essentia/essentia.h"
#include "essentia/algorithmfactory.h"
#include "essentia/essentiamath.h"
#include "essentia/pool.h"
#include "essentia/version.h"

// Android logging macro
#ifdef __ANDROID__
#include <android/log.h>
#define LOGI(...) ((void)__android_log_print(ANDROID_LOG_INFO, "EssentiaWrapper", __VA_ARGS__))
#define LOGW(...) ((void)__android_log_print(ANDROID_LOG_WARN, "EssentiaWrapper", __VA_ARGS__))
#define LOGE(...) ((void)__android_log_print(ANDROID_LOG_ERROR, "EssentiaWrapper", __VA_ARGS__))
#else
#define LOGI(...) printf(__VA_ARGS__)
#define LOGW(...) printf(__VA_ARGS__)
#define LOGE(...) printf(__VA_ARGS__)
#endif

// Global variables
static bool gIsInitialized = false;
static std::vector<essentia::Real> gAudioBuffer;
static double gSampleRate = 44100.0;

// Helper functions for JSON conversion
std::string paramsMapToJson(const std::map<std::string, essentia::Parameter>& params) {
    // For now, just return an empty JSON object
    return "{}";

    // The full implementation will need to be based on the actual Essentia API
    // Once we understand how to properly access Parameter values
}

std::map<std::string, essentia::Parameter> jsonToParamsMap(const std::string& json) {
    // This is a placeholder - in a real implementation, use a JSON library
    std::map<std::string, essentia::Parameter> params;
    // Parse JSON and populate params
    return params;
}

std::string poolToJson(const essentia::Pool& pool) {
    std::stringstream ss;
    ss << "{";

    bool firstKey = true;
    for (const auto& key : pool.descriptorNames()) {
        if (!firstKey) ss << ",";
        firstKey = false;

        ss << "\"" << key << "\":";

        try {
            if (pool.contains<std::vector<essentia::Real>>(key)) {
                const auto& values = pool.value<std::vector<essentia::Real>>(key);
                ss << "[";
                bool firstVal = true;
                for (const auto& val : values) {
                    if (!firstVal) ss << ",";
                    firstVal = false;
                    ss << val;
                }
                ss << "]";
            } else if (pool.contains<essentia::Real>(key)) {
                ss << pool.value<essentia::Real>(key);
            } else if (pool.contains<std::string>(key)) {
                ss << "\"" << pool.value<std::string>(key) << "\"";
            } else {
                ss << "\"unsupported_type\"";
            }
        } catch (const std::exception& e) {
            ss << "\"error_reading_value\"";
        }
    }

    ss << "}";
    return ss.str();
}

// JNI Implementation

/**
 * Initialize the Essentia library
 */
JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_initializeEssentia(JNIEnv *env, jobject thiz) {
    try {
        LOGI("Initializing Essentia...");

        if (gIsInitialized) {
            LOGI("Essentia already initialized");
            return JNI_TRUE;
        }

        // Initialize Essentia
        essentia::init();
        gIsInitialized = true;

        LOGI("Essentia initialized successfully");
        return JNI_TRUE;
    } catch (const std::exception& e) {
        LOGE("Error initializing Essentia: %s", e.what());
        return JNI_FALSE;
    }
}

/**
 * Execute an Essentia algorithm with the given parameters
 */
JNIEXPORT jstring JNICALL
Java_com_essentia_EssentiaModule_executeEssentiaAlgorithm(JNIEnv *env, jobject thiz,
                                                         jstring jalgorithm,
                                                         jstring jparamsJson) {
    try {
        if (!gIsInitialized) {
            return env->NewStringUTF("{\"success\":false,\"error\":\"Essentia not initialized\"}");
        }

        // Convert Java strings to C++ strings
        const char* algorithmCStr = env->GetStringUTFChars(jalgorithm, nullptr);
        const char* paramsJsonCStr = env->GetStringUTFChars(jparamsJson, nullptr);

        std::string algorithm(algorithmCStr);
        std::string paramsJson(paramsJsonCStr);

        // Release Java strings
        env->ReleaseStringUTFChars(jalgorithm, algorithmCStr);
        env->ReleaseStringUTFChars(jparamsJson, paramsJsonCStr);

        LOGI("Executing algorithm: %s with params: %s", algorithm.c_str(), paramsJson.c_str());

        // Check if we have audio data
        if (gAudioBuffer.empty() && algorithm != "TestAlgorithm") {
            return env->NewStringUTF("{\"success\":false,\"error\":\"No audio data loaded\"}");
        }

        // Create algorithm factory
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

        // Create algorithm - using the correct method signature
        essentia::standard::Algorithm* algo = nullptr;

        try {
            // Create the algorithm with just the ID
            algo = factory.create(algorithm);

            // Configure the algorithm parameters separately if needed
            // This would be done after creation, not during creation
            // We'll skip this for now since we don't have a working jsonToParamsMap function
        } catch (const std::exception& e) {
            std::string errorMsg = std::string("Failed to create algorithm: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return env->NewStringUTF(("{\"success\":false,\"error\":\"" + errorMsg + "\"}").c_str());
        }

        // Create input/output for the algorithm
        essentia::Pool pool;

        // Configure algorithm inputs/outputs based on algorithm type
        if (algorithm == "MFCC") {
            // Example for MFCC algorithm
            std::vector<essentia::Real> spectrum(gAudioBuffer.size() / 2 + 1, 0.0);
            std::vector<essentia::Real> mfccCoeffs;
            std::vector<essentia::Real> mfccBands;

            algo->input("spectrum").set(spectrum);
            algo->output("mfcc").set(mfccCoeffs);
            algo->output("bands").set(mfccBands);

            // Compute MFCC
            algo->compute();

            // Store results in pool
            pool.set("mfcc", mfccCoeffs);
            pool.set("bands", mfccBands);
        } else if (algorithm == "Spectrum") {
            // Example for Spectrum algorithm
            std::vector<essentia::Real> spectrum;

            algo->input("frame").set(gAudioBuffer);
            algo->output("spectrum").set(spectrum);

            // Compute spectrum
            algo->compute();

            // Store results in pool
            pool.set("spectrum", spectrum);
        } else {
            // Generic approach for other algorithms
            // This is a placeholder - in a real implementation, handle different algorithms appropriately
            delete algo;
            return env->NewStringUTF("{\"success\":false,\"error\":\"Algorithm not supported yet\"}");
        }

        // Clean up
        delete algo;

        // Convert results to JSON
        std::string resultJson = poolToJson(pool);

        // Return success with results
        return env->NewStringUTF(("{\"success\":true,\"data\":" + resultJson + "}").c_str());
    } catch (const std::exception& e) {
        std::string errorMsg = std::string("Error executing algorithm: ") + e.what();
        LOGE("%s", errorMsg.c_str());
        return env->NewStringUTF(("{\"success\":false,\"error\":\"" + errorMsg + "\"}").c_str());
    }
}

/**
 * Set audio data for processing
 */
JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_setAudioData(JNIEnv *env, jobject thiz, jfloatArray jpcmData, jdouble jsampleRate) {
    try {
        if (!gIsInitialized) {
            LOGE("Essentia not initialized");
            return JNI_FALSE;
        }

        // Get array length
        jsize length = env->GetArrayLength(jpcmData);
        LOGI("Setting audio data: %d samples at %.1f Hz", length, jsampleRate);

        if (length <= 0) {
            LOGE("Empty audio data");
            return JNI_FALSE;
        }

        // Get float array elements
        jfloat* pcmData = env->GetFloatArrayElements(jpcmData, nullptr);

        // Copy data to our buffer
        gAudioBuffer.resize(length);
        for (int i = 0; i < length; i++) {
            gAudioBuffer[i] = static_cast<essentia::Real>(pcmData[i]);
        }

        // Store sample rate
        gSampleRate = jsampleRate;

        // Release array elements
        env->ReleaseFloatArrayElements(jpcmData, pcmData, JNI_ABORT);

        LOGI("Audio data set successfully: %zu samples", gAudioBuffer.size());
        return JNI_TRUE;
    } catch (const std::exception& e) {
        LOGE("Error setting audio data: %s", e.what());
        return JNI_FALSE;
    }
}
