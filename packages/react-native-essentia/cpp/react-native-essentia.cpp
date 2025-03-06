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

// Replace the manual JSON parsing with nlohmann/json
#include "nlohmann/json.hpp"

// Use the json library with a namespace alias for convenience
using json = nlohmann::json;

// Helper functions for JSON conversion
std::string paramsMapToJson(const std::map<std::string, essentia::Parameter>& params) {
    json result;

    for (const auto& pair : params) {
        essentia::Parameter::ParamType type = pair.second.type();

        try {
            switch (type) {
                case essentia::Parameter::INT:
                    result[pair.first] = pair.second.toInt();
                    break;
                case essentia::Parameter::REAL:
                    result[pair.first] = pair.second.toReal();
                    break;
                case essentia::Parameter::STRING:
                    result[pair.first] = pair.second.toString();
                    break;
                case essentia::Parameter::BOOL:
                    result[pair.first] = pair.second.toBool();
                    break;
                default:
                    result[pair.first] = pair.second.toString();
                    break;
            }
        }
        catch (const std::exception& e) {
            result[pair.first] = "unknown_type";
        }
    }

    return result.dump();
}

std::map<std::string, essentia::Parameter> jsonToParamsMap(const std::string& jsonStr) {
    std::map<std::string, essentia::Parameter> params;

    try {
        // Parse the JSON string
        json j = json::parse(jsonStr);

        // Iterate through all key-value pairs
        for (auto it = j.begin(); it != j.end(); ++it) {
            const std::string& key = it.key();

            // Handle different value types
            if (it.value().is_number_integer()) {
                params.insert(std::make_pair(key, essentia::Parameter(static_cast<int>(it.value()))));
            }
            else if (it.value().is_number_float()) {
                params.insert(std::make_pair(key, essentia::Parameter(static_cast<float>(it.value()))));
            }
            else if (it.value().is_boolean()) {
                params.insert(std::make_pair(key, essentia::Parameter(it.value().get<bool>())));
            }
            else if (it.value().is_string()) {
                params.insert(std::make_pair(key, essentia::Parameter(it.value().get<std::string>())));
            }
            // Could add support for arrays and nested objects if needed
        }
    }
    catch (const json::exception& e) {
        LOGE("JSON parsing error: %s", e.what());
        // Return empty map on error
    }

    return params;
}

std::string poolToJson(const essentia::Pool& pool) {
    json result;

    for (const auto& key : pool.descriptorNames()) {
        try {
            if (pool.contains<std::vector<essentia::Real>>(key)) {
                const auto& values = pool.value<std::vector<essentia::Real>>(key);
                json array = json::array();
                for (const auto& val : values) {
                    array.push_back(val);
                }
                result[key] = array;
            }
            else if (pool.contains<essentia::Real>(key)) {
                result[key] = pool.value<essentia::Real>(key);
            }
            else if (pool.contains<std::string>(key)) {
                result[key] = pool.value<std::string>(key);
            }
            else {
                result[key] = "unsupported_type";
            }
        }
        catch (const std::exception& e) {
            result[key] = "error_reading_value";
        }
    }

    return result.dump();
}

// Helper function to convert our map to a ParameterMap
essentia::ParameterMap convertToParameterMap(const std::map<std::string, essentia::Parameter>& params) {
    essentia::ParameterMap parameterMap;
    for (const auto& pair : params) {
        parameterMap.add(pair.first, pair.second);
    }
    return parameterMap;
}

// Improved error response with code and message
std::string createErrorResponse(const std::string& errorMessage, const std::string& errorCode = "UNKNOWN_ERROR") {
    return "{\"success\":false,\"error\":{\"code\":\"" + errorCode + "\",\"message\":\"" + errorMessage + "\"}}";
}

// EssentiaWrapper class to encapsulate state
class EssentiaWrapper {
private:
    bool mIsInitialized;
    std::vector<essentia::Real> audioBuffer;
    double sampleRate;

public:
    EssentiaWrapper() : mIsInitialized(false), sampleRate(44100.0) {}

    ~EssentiaWrapper() {
        if (mIsInitialized) {
            essentia::shutdown();
            mIsInitialized = false;
        }
    }

    bool initialize() {
        try {
            LOGI("Initializing Essentia...");

            if (mIsInitialized) {
                LOGI("Essentia already initialized");
                return true;
            }

            // Initialize Essentia
            essentia::init();
            mIsInitialized = true;

            LOGI("Essentia initialized successfully");
            return true;
        } catch (const std::exception& e) {
            LOGE("Error initializing Essentia: %s", e.what());
            return false;
        }
    }

    bool setAudioData(const std::vector<essentia::Real>& data, double rate) {
        try {
            if (!mIsInitialized) {
                LOGE("Essentia not initialized");
                return false;
            }

            if (data.empty()) {
                LOGE("Empty audio data");
                return false;
            }

            if (rate <= 0) {
                LOGE("Invalid sample rate: %f", rate);
                return false;
            }

            audioBuffer = data;
            sampleRate = rate;

            LOGI("Audio data set successfully: %zu samples at %f Hz", audioBuffer.size(), sampleRate);
            return true;
        } catch (const std::exception& e) {
            LOGE("Error setting audio data: %s", e.what());
            return false;
        }
    }

    std::string executeAlgorithm(const std::string& algorithm, const std::string& paramsJson) {
        try {
            if (!mIsInitialized) {
                return createErrorResponse("Essentia not initialized", "NOT_INITIALIZED");
            }

            // Validate algorithm name
            if (algorithm.empty()) {
                return createErrorResponse("Algorithm name cannot be empty", "INVALID_ALGORITHM");
            }

            LOGI("Executing algorithm: %s with params: %s", algorithm.c_str(), paramsJson.c_str());

            // Create algorithm factory
            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

            // Check if algorithm exists
            essentia::standard::Algorithm* testAlgo = nullptr;
            try {
                testAlgo = factory.create(algorithm);
                if (!testAlgo) {
                    return createErrorResponse("Algorithm does not exist: " + algorithm, "ALGORITHM_NOT_FOUND");
                }
                delete testAlgo;
            } catch (const std::exception& e) {
                return createErrorResponse("Algorithm does not exist: " + algorithm, "ALGORITHM_NOT_FOUND");
            }

            // Parse parameters from JSON
            std::map<std::string, essentia::Parameter> params = jsonToParamsMap(paramsJson);

            // For backward compatibility, still handle the specifically optimized algorithms
            if (algorithm == "MFCC" || algorithm == "Spectrum" || algorithm == "Key") {
                return executeSpecificAlgorithm(algorithm, params);
            }

            // Dynamic approach for other algorithms
            return executeDynamicAlgorithm(algorithm, params);
        } catch (const std::exception& e) {
            std::string errorMsg = std::string("Error executing algorithm: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return createErrorResponse(errorMsg, "ALGORITHM_EXECUTION_ERROR");
        }
    }

    // Handle the specific optimized algorithms (MFCC, Spectrum, Key)
    std::string executeSpecificAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params) {
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
        essentia::Pool pool;

        // Check if we have audio data
        if (audioBuffer.empty()) {
            return createErrorResponse("No audio data loaded", "NO_AUDIO_DATA");
        }

        if (algorithm == "MFCC") {
            // First compute the spectrum
            essentia::standard::Algorithm* spectrumAlgo = factory.create("Spectrum");
            std::vector<essentia::Real> spectrum;

            spectrumAlgo->input("frame").set(audioBuffer);
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

            spectrumAlgo->input("frame").set(audioBuffer);
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

            spectrumAlgo->input("frame").set(audioBuffer);
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
        }

        // Convert results to JSON
        std::string resultJson = poolToJson(pool);

        // Return success with results
        return "{\"success\":true,\"data\":" + resultJson + "}";
    }

    // Handle any algorithm dynamically by inspecting its inputs/outputs
    std::string executeDynamicAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params) {
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
        essentia::Pool pool;

        // Create the algorithm
        essentia::standard::Algorithm* algo = factory.create(algorithm);

        // Configure with parameters if provided
        if (!params.empty()) {
            essentia::ParameterMap parameterMap = convertToParameterMap(params);
            algo->configure(parameterMap);
        }

        // Prepare storage for inputs and outputs
        std::map<std::string, void*> inputPointers;
        std::map<std::string, void*> outputPointers;

        // Set up inputs based on their type
        for (const auto& input : algo->inputs()) {
            std::string inputName = input.first;
            std::string inputType = input.second->typeInfo().name();

            LOGI("Setting up input: %s of type %s", inputName.c_str(), inputType.c_str());

            // Handle different input types
            if (inputType.find("std::vector<essentia::Real>") != std::string::npos) {
                if (inputName == "frame" || inputName == "signal" || inputName == "audio") {
                    // Use our audio buffer for these common input names
                    if (audioBuffer.empty()) {
                        delete algo;
                        return createErrorResponse("No audio data loaded for input: " + inputName, "NO_AUDIO_DATA");
                    }
                    algo->input(inputName).set(audioBuffer);
                } else {
                    // For other vector inputs, create an empty vector
                    // In a more complete implementation, these would come from params or previous algorithm outputs
                    std::vector<essentia::Real>* vec = new std::vector<essentia::Real>();
                    inputPointers[inputName] = vec;
                    algo->input(inputName).set(*vec);
                }
            } else if (inputType.find("essentia::Real") != std::string::npos) {
                // For single Real inputs, use 0.0 as default or sample rate for sampleRate input
                essentia::Real* val = new essentia::Real;
                *val = (inputName == "sampleRate") ? sampleRate : 0.0;
                inputPointers[inputName] = val;
                algo->input(inputName).set(*val);
            } else if (inputType.find("std::string") != std::string::npos) {
                // For string inputs, use empty string
                std::string* str = new std::string("");
                inputPointers[inputName] = str;
                algo->input(inputName).set(*str);
            } else {
                // For unsupported types, we'll skip and log
                LOGW("Unsupported input type: %s for input %s", inputType.c_str(), inputName.c_str());
            }
        }

        // Set up outputs based on their type
        for (const auto& output : algo->outputs()) {
            std::string outputName = output.first;
            std::string outputType = output.second->typeInfo().name();

            LOGI("Setting up output: %s of type %s", outputName.c_str(), outputType.c_str());

            // Handle different output types
            if (outputType.find("std::vector<essentia::Real>") != std::string::npos) {
                std::vector<essentia::Real>* vec = new std::vector<essentia::Real>();
                outputPointers[outputName] = vec;
                algo->output(outputName).set(*vec);
            } else if (outputType.find("essentia::Real") != std::string::npos) {
                essentia::Real* val = new essentia::Real;
                outputPointers[outputName] = val;
                algo->output(outputName).set(*val);
            } else if (outputType.find("std::string") != std::string::npos) {
                std::string* str = new std::string();
                outputPointers[outputName] = str;
                algo->output(outputName).set(*str);
            } else {
                // For unsupported types, we'll skip and log
                LOGW("Unsupported output type: %s for output %s", outputType.c_str(), outputName.c_str());
            }
        }

        // Compute the algorithm
        LOGI("Computing algorithm: %s", algorithm.c_str());
        algo->compute();

        // Collect the outputs into the pool
        for (const auto& output : algo->outputs()) {
            std::string outputName = output.first;
            std::string outputType = output.second->typeInfo().name();

            if (outputPointers.find(outputName) != outputPointers.end()) {
                if (outputType.find("std::vector<essentia::Real>") != std::string::npos) {
                    std::vector<essentia::Real>* vec = static_cast<std::vector<essentia::Real>*>(outputPointers[outputName]);
                    pool.set(outputName, *vec);
                    delete vec;
                } else if (outputType.find("essentia::Real") != std::string::npos) {
                    essentia::Real* val = static_cast<essentia::Real*>(outputPointers[outputName]);
                    pool.set(outputName, *val);
                    delete val;
                } else if (outputType.find("std::string") != std::string::npos) {
                    std::string* str = static_cast<std::string*>(outputPointers[outputName]);
                    pool.set(outputName, *str);
                    delete str;
                }
            }
        }

        // Clean up remaining input pointers
        for (auto& inputPair : inputPointers) {
            if (inputPair.second) {
                // Handle different types
                const char* typeInfoName = algo->input(inputPair.first).typeInfo().name();
                std::string typeStr(typeInfoName); // Convert to std::string first

                if (typeStr.find("std::vector<essentia::Real>") != std::string::npos) {
                    delete static_cast<std::vector<essentia::Real>*>(inputPair.second);
                } else if (typeStr.find("essentia::Real") != std::string::npos) {
                    delete static_cast<essentia::Real*>(inputPair.second);
                } else if (typeStr.find("std::string") != std::string::npos) {
                    delete static_cast<std::string*>(inputPair.second);
                }
            }
        }

        // Clean up the algorithm
        delete algo;

        // Convert results to JSON
        std::string resultJson = poolToJson(pool);

        // Return success with results
        return "{\"success\":true,\"data\":" + resultJson + "}";
    }

    // Get algorithm information
    std::string getAlgorithmInfo(const std::string& algorithm) {
        try {
            if (!mIsInitialized) {
                return createErrorResponse("Essentia not initialized", "NOT_INITIALIZED");
            }

            // Validate algorithm name
            if (algorithm.empty()) {
                return createErrorResponse("Algorithm name cannot be empty", "INVALID_ALGORITHM");
            }

            LOGI("Getting information for algorithm: %s", algorithm.c_str());

            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

            // Check if algorithm exists by attempting to create it
            essentia::standard::Algorithm* testAlgo = nullptr;
            try {
                testAlgo = factory.create(algorithm);
                if (!testAlgo) {
                    return createErrorResponse("Algorithm does not exist: " + algorithm, "ALGORITHM_NOT_FOUND");
                }
                delete testAlgo;
            } catch (const std::exception& e) {
                return createErrorResponse("Algorithm does not exist: " + algorithm, "ALGORITHM_NOT_FOUND");
            }

            // Create algorithm to inspect its properties
            essentia::standard::Algorithm* algo = factory.create(algorithm);

            // Build the result manually as a string to avoid JSON parsing issues
            std::string result = "{\"name\":\"" + algorithm + "\",\"inputs\":[";

            // Get inputs
            bool firstInput = true;
            for (const auto& input : algo->inputs()) {
                if (!firstInput) {
                    result += ",";
                }
                result += "{\"name\":\"" + input.first + "\",\"type\":\"" + input.second->typeInfo().name() + "\"}";
                firstInput = false;
            }

            result += "],\"outputs\":[";

            // Get outputs
            bool firstOutput = true;
            for (const auto& output : algo->outputs()) {
                if (!firstOutput) {
                    result += ",";
                }
                result += "{\"name\":\"" + output.first + "\",\"type\":\"" + output.second->typeInfo().name() + "\"}";
                firstOutput = false;
            }

            result += "],\"parameters\":";

            // Get parameters
            std::map<std::string, essentia::Parameter> params = algo->defaultParameters();
            std::string paramsJsonStr = paramsMapToJson(params);
            result += paramsJsonStr;

            result += "}";

            // Clean up
            delete algo;

            // Return success with results
            return "{\"success\":true,\"data\":" + result + "}";
        } catch (const std::exception& e) {
            std::string errorMsg = std::string("Error getting algorithm info: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return createErrorResponse(errorMsg, "ALGORITHM_INFO_ERROR");
        }
    }

    bool isInitialized() const {
        return mIsInitialized;
    }
};

// JNI Implementation with EssentiaWrapper

// Create and destroy the wrapper
static jlong createEssentiaWrapper(JNIEnv* env, jobject thiz) {
    try {
        LOGI("Creating EssentiaWrapper instance");
        EssentiaWrapper* wrapper = new EssentiaWrapper();
        LOGI("EssentiaWrapper created successfully");
        return reinterpret_cast<jlong>(wrapper);
    } catch (const std::exception& e) {
        LOGE("Exception in createEssentiaWrapper: %s", e.what());
        return 0;
    } catch (...) {
        LOGE("Unknown exception in createEssentiaWrapper");
        return 0;
    }
}

static void destroyEssentiaWrapper(JNIEnv* env, jobject thiz, jlong handle) {
    try {
        if (handle != 0) {
            LOGI("Destroying EssentiaWrapper instance");
            EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);
            delete wrapper;
            LOGI("EssentiaWrapper destroyed successfully");
        }
    } catch (const std::exception& e) {
        LOGE("Exception in destroyEssentiaWrapper: %s", e.what());
    } catch (...) {
        LOGE("Unknown exception in destroyEssentiaWrapper");
    }
}

// Initialize Essentia
static jboolean initializeEssentia(JNIEnv* env, jobject thiz, jlong handle) {
    try {
        LOGI("Initializing Essentia with handle: %lld", (long long)handle);
        if (handle == 0) {
            LOGE("Invalid handle (0) in initializeEssentia");
            return JNI_FALSE;
        }

        EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);
        bool result = wrapper->initialize();
        LOGI("Essentia initialization result: %d", result);
        return result ? JNI_TRUE : JNI_FALSE;
    } catch (const std::exception& e) {
        LOGE("Exception in initializeEssentia: %s", e.what());
        return JNI_FALSE;
    } catch (...) {
        LOGE("Unknown exception in initializeEssentia");
        return JNI_FALSE;
    }
}

// Set audio data
static jboolean setAudioData(JNIEnv* env, jobject thiz, jlong handle, jfloatArray jpcmData, jdouble jsampleRate) {
    if (handle == 0 || jpcmData == nullptr) {
        return JNI_FALSE;
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);

    // Get array length
    jsize length = env->GetArrayLength(jpcmData);

    if (length <= 0) {
        return JNI_FALSE;
    }

    // Get float array elements
    jfloat* pcmData = env->GetFloatArrayElements(jpcmData, nullptr);

    // Copy data to vector
    std::vector<essentia::Real> audioData(length);
    for (int i = 0; i < length; i++) {
        audioData[i] = static_cast<essentia::Real>(pcmData[i]);
    }

    // Release array elements
    env->ReleaseFloatArrayElements(jpcmData, pcmData, JNI_ABORT);

    // Set the audio data in the wrapper
    return wrapper->setAudioData(audioData, jsampleRate) ? JNI_TRUE : JNI_FALSE;
}

// Execute algorithm
static jstring executeAlgorithm(JNIEnv* env, jobject thiz, jlong handle, jstring jalgorithm, jstring jparamsJson) {
    if (handle == 0) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia instance").c_str());
    }

    if (jalgorithm == nullptr || jparamsJson == nullptr) {
        return env->NewStringUTF(createErrorResponse("Invalid parameters").c_str());
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);

    // Convert Java strings to C++ strings
    const char* algorithmCStr = env->GetStringUTFChars(jalgorithm, nullptr);
    const char* paramsJsonCStr = env->GetStringUTFChars(jparamsJson, nullptr);

    std::string algorithm(algorithmCStr);
    std::string paramsJson(paramsJsonCStr);

    // Release Java strings
    env->ReleaseStringUTFChars(jalgorithm, algorithmCStr);
    env->ReleaseStringUTFChars(jparamsJson, paramsJsonCStr);

    // Execute the algorithm
    std::string result = wrapper->executeAlgorithm(algorithm, paramsJson);

    return env->NewStringUTF(result.c_str());
}

// Add this simple test method
static jstring testJniConnection(JNIEnv* env, jobject thiz) {
    return env->NewStringUTF("JNI connection successful");
}

// Add this after the existing JNI methods (around line 514)
static jstring getAlgorithmInfo(JNIEnv* env, jobject thiz, jlong handle, jstring jalgorithm) {
    if (handle == 0) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia instance").c_str());
    }

    if (jalgorithm == nullptr) {
        return env->NewStringUTF(createErrorResponse("Invalid algorithm name").c_str());
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);

    // Convert Java string to C++ string
    const char* algorithmCStr = env->GetStringUTFChars(jalgorithm, nullptr);
    std::string algorithm(algorithmCStr);

    // Release Java string
    env->ReleaseStringUTFChars(jalgorithm, algorithmCStr);

    // Get the algorithm info
    std::string result = wrapper->getAlgorithmInfo(algorithm);

    return env->NewStringUTF(result.c_str());
}

// JNI method registration
static JNINativeMethod methods[] = {
    {"nativeCreateEssentiaWrapper", "()J", (void*)createEssentiaWrapper},
    {"nativeDestroyEssentiaWrapper", "(J)V", (void*)destroyEssentiaWrapper},
    {"nativeInitializeEssentia", "(J)Z", (void*)initializeEssentia},
    {"nativeSetAudioData", "(J[FD)Z", (void*)setAudioData},
    {"nativeExecuteAlgorithm", "(JLjava/lang/String;Ljava/lang/String;)Ljava/lang/String;", (void*)executeAlgorithm},
    {"testJniConnection", "()Ljava/lang/String;", (void*)testJniConnection},
    {"nativeGetAlgorithmInfo", "(JLjava/lang/String;)Ljava/lang/String;", (void*)getAlgorithmInfo}
};

// Add this function to register the native methods
extern "C" JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env;
    if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }

    // Find the Java class
    jclass clazz = env->FindClass("com/essentia/EssentiaModule");
    if (clazz == nullptr) {
        LOGE("Failed to find EssentiaModule class");
        return JNI_ERR;
    }

    // Register the methods
    if (env->RegisterNatives(clazz, methods, sizeof(methods) / sizeof(methods[0])) < 0) {
        LOGE("Failed to register native methods");
        return JNI_ERR;
    }

    LOGI("Successfully registered native methods");
    return JNI_VERSION_1_6;
}
