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
    std::stringstream ss;
    ss << "{";

    bool first = true;
    for (const auto& pair : params) {
        if (!first) ss << ",";
        first = false;

        ss << "\"" << pair.first << "\":";

        // Handle different parameter types based on the ParamType enum
        essentia::Parameter::ParamType type = pair.second.type();

        try {
            switch (type) {
                case essentia::Parameter::INT:
                    ss << pair.second.toInt();
                    break;

                case essentia::Parameter::REAL:
                    ss << pair.second.toReal();
                    break;

                case essentia::Parameter::STRING:
                    ss << "\"" << pair.second.toString() << "\"";
                    break;

                case essentia::Parameter::BOOL:
                    ss << (pair.second.toBool() ? "true" : "false");
                    break;

                default:
                    // For other types, use string representation
                    ss << "\"" << pair.second.toString() << "\"";
                    break;
            }
        }
        catch (const std::exception& e) {
            // If conversion fails, output as unknown
            ss << "\"unknown_type\"";
        }
    }

    ss << "}";
    return ss.str();
}

std::map<std::string, essentia::Parameter> jsonToParamsMap(const std::string& json) {
    std::map<std::string, essentia::Parameter> params;

    // Simple JSON parsing - in a real implementation, use a proper JSON library
    // This is a basic implementation that handles simple key-value pairs

    size_t pos = 0;
    size_t end = json.length();

    // Skip opening brace
    if (pos < end && json[pos] == '{') pos++;

    while (pos < end && json[pos] != '}') {
        // Skip whitespace
        while (pos < end && (json[pos] == ' ' || json[pos] == '\t' || json[pos] == '\n' || json[pos] == '\r')) pos++;

        // Check for end of object
        if (pos < end && json[pos] == '}') break;

        // Parse key (must be in quotes)
        if (pos < end && json[pos] == '"') {
            pos++; // Skip opening quote
            size_t keyStart = pos;
            while (pos < end && json[pos] != '"') pos++;
            std::string key = json.substr(keyStart, pos - keyStart);
            pos++; // Skip closing quote

            // Skip colon and whitespace
            while (pos < end && (json[pos] == ' ' || json[pos] == '\t' || json[pos] == ':')) pos++;

            // Parse value
            if (pos < end) {
                if (json[pos] == '"') {
                    // String value
                    pos++; // Skip opening quote
                    size_t valueStart = pos;
                    while (pos < end && json[pos] != '"') pos++;
                    std::string value = json.substr(valueStart, pos - valueStart);
                    pos++; // Skip closing quote

                    params.insert(std::make_pair(key, essentia::Parameter(value)));
                } else if (json[pos] == 't' && pos + 3 < end && json.substr(pos, 4) == "true") {
                    // Boolean true
                    params.insert(std::make_pair(key, essentia::Parameter(true)));
                    pos += 4;
                } else if (json[pos] == 'f' && pos + 4 < end && json.substr(pos, 5) == "false") {
                    // Boolean false
                    params.insert(std::make_pair(key, essentia::Parameter(false)));
                    pos += 5;
                } else if ((json[pos] >= '0' && json[pos] <= '9') || json[pos] == '-') {
                    // Number value
                    size_t valueStart = pos;
                    bool isFloat = false;

                    while (pos < end && ((json[pos] >= '0' && json[pos] <= '9') ||
                           json[pos] == '.' || json[pos] == '-' || json[pos] == 'e' || json[pos] == 'E' || json[pos] == '+')) {
                        if (json[pos] == '.') isFloat = true;
                        pos++;
                    }

                    std::string valueStr = json.substr(valueStart, pos - valueStart);

                    if (isFloat) {
                        float value = std::stof(valueStr);
                        params.insert(std::make_pair(key, essentia::Parameter(value)));
                    } else {
                        int value = std::stoi(valueStr);
                        params.insert(std::make_pair(key, essentia::Parameter(value)));
                    }
                }
            }

            // Skip comma and whitespace
            while (pos < end && (json[pos] == ' ' || json[pos] == '\t' || json[pos] == ',' || json[pos] == '\n' || json[pos] == '\r')) pos++;
        } else {
            // Invalid JSON, skip character
            pos++;
        }
    }

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

// Helper function to convert our map to a ParameterMap
essentia::ParameterMap convertToParameterMap(const std::map<std::string, essentia::Parameter>& params) {
    essentia::ParameterMap parameterMap;
    for (const auto& pair : params) {
        parameterMap.add(pair.first, pair.second);
    }
    return parameterMap;
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
        essentia::Pool pool;

        // Parse parameters from JSON
        std::map<std::string, essentia::Parameter> params = jsonToParamsMap(paramsJson);

        // Handle different algorithm types with proper chaining
        if (algorithm == "MFCC") {
            // First compute the spectrum
            essentia::standard::Algorithm* spectrumAlgo = factory.create("Spectrum");
            std::vector<essentia::Real> spectrum;

            spectrumAlgo->input("frame").set(gAudioBuffer);
            spectrumAlgo->output("spectrum").set(spectrum);
            spectrumAlgo->compute();

            // Then compute MFCC using the spectrum
            essentia::standard::Algorithm* mfccAlgo = factory.create("MFCC");

            // Configure MFCC with parameters if provided
            if (!params.empty()) {
                // Convert our map to ParameterMap
                essentia::ParameterMap parameterMap = convertToParameterMap(params);
                mfccAlgo->configure(parameterMap);
            }

            std::vector<essentia::Real> mfccCoeffs;
            std::vector<essentia::Real> mfccBands;

            mfccAlgo->input("spectrum").set(spectrum);
            mfccAlgo->output("mfcc").set(mfccCoeffs);
            mfccAlgo->output("bands").set(mfccBands);
            mfccAlgo->compute();

            // Store results in pool
            pool.set("mfcc", mfccCoeffs);
            pool.set("bands", mfccBands);

            // Clean up
            delete spectrumAlgo;
            delete mfccAlgo;
        } else if (algorithm == "Spectrum") {
            // Create and configure the Spectrum algorithm
            essentia::standard::Algorithm* spectrumAlgo = factory.create("Spectrum");

            // Configure with parameters if provided
            if (!params.empty()) {
                // Convert our map to ParameterMap
                essentia::ParameterMap parameterMap = convertToParameterMap(params);
                spectrumAlgo->configure(parameterMap);
            }

            std::vector<essentia::Real> spectrum;

            spectrumAlgo->input("frame").set(gAudioBuffer);
            spectrumAlgo->output("spectrum").set(spectrum);
            spectrumAlgo->compute();

            // Store results in pool
            pool.set("spectrum", spectrum);

            // Clean up
            delete spectrumAlgo;
        } else if (algorithm == "Key") {
            // Key detection typically requires a multi-step process

            // 1. Compute spectrum
            essentia::standard::Algorithm* spectrumAlgo = factory.create("Spectrum");
            std::vector<essentia::Real> spectrum;

            spectrumAlgo->input("frame").set(gAudioBuffer);
            spectrumAlgo->output("spectrum").set(spectrum);
            spectrumAlgo->compute();

            // 2. Compute spectral peaks
            essentia::standard::Algorithm* peaksAlgo = factory.create("SpectralPeaks");
            std::vector<essentia::Real> frequencies;
            std::vector<essentia::Real> magnitudes;

            peaksAlgo->input("spectrum").set(spectrum);
            peaksAlgo->output("frequencies").set(frequencies);
            peaksAlgo->output("magnitudes").set(magnitudes);
            peaksAlgo->compute();

            // 3. Compute HPCP (Harmonic Pitch Class Profile)
            essentia::standard::Algorithm* hpcpAlgo = factory.create("HPCP");
            std::vector<essentia::Real> hpcp;

            hpcpAlgo->input("frequencies").set(frequencies);
            hpcpAlgo->input("magnitudes").set(magnitudes);
            hpcpAlgo->output("hpcp").set(hpcp);
            hpcpAlgo->compute();

            // 4. Compute key
            essentia::standard::Algorithm* keyAlgo = factory.create("Key");
            std::string key;
            std::string scale;
            essentia::Real strength;

            keyAlgo->input("hpcp").set(hpcp);
            keyAlgo->output("key").set(key);
            keyAlgo->output("scale").set(scale);
            keyAlgo->output("strength").set(strength);
            keyAlgo->compute();

            // Store results in pool
            pool.set("key", key);
            pool.set("scale", scale);
            pool.set("strength", strength);

            // Clean up
            delete spectrumAlgo;
            delete peaksAlgo;
            delete hpcpAlgo;
            delete keyAlgo;
        } else {
            // Generic approach for other algorithms
            try {
                // Create the algorithm
                essentia::standard::Algorithm* algo = factory.create(algorithm);

                // Configure with parameters if provided
                if (!params.empty()) {
                    // Convert our map to ParameterMap
                    essentia::ParameterMap parameterMap = convertToParameterMap(params);
                    algo->configure(parameterMap);
                }

                // Execute the algorithm (this is simplified - in reality, you'd need to
                // handle inputs and outputs based on the algorithm's requirements)
                algo->compute();

                // Clean up
                delete algo;

                // Since we don't know how to properly handle this algorithm yet,
                // return a message indicating limited support
                return env->NewStringUTF("{\"success\":true,\"data\":{\"message\":\"Algorithm executed, but full output handling not implemented yet\"}}");
            } catch (const std::exception& e) {
                std::string errorMsg = std::string("Unsupported algorithm or error: ") + e.what();
                return env->NewStringUTF(("{\"success\":false,\"error\":\"" + errorMsg + "\"}").c_str());
            }
        }

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
