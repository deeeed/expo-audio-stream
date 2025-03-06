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

// Define the FeatureConfig struct before using it
struct FeatureConfig {
    std::string name;           // Algorithm name
    std::map<std::string, essentia::Parameter> params; // Algorithm parameters
    std::string inputName;      // Name of the input to connect to
    std::string outputName;     // Name of the output to expose
    bool computeMean = false;   // Whether to compute mean of the result
};

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
            // Add support for arrays (vectors)
            else if (it.value().is_array()) {
                // Check the type of array elements and create appropriate vector
                if (!it.value().empty()) {
                    const auto& firstItem = it.value()[0];

                    // Vector of Real (most common type in Essentia)
                    if (firstItem.is_number()) {
                        std::vector<essentia::Real> vec;
                        for (const auto& item : it.value()) {
                            if (item.is_number()) {
                                vec.push_back(static_cast<essentia::Real>(item.get<double>()));
                            }
                        }
                        params.insert(std::make_pair(key, essentia::Parameter(vec)));
                    }
                    // Vector of strings
                    else if (firstItem.is_string()) {
                        std::vector<std::string> vec;
                        for (const auto& item : it.value()) {
                            if (item.is_string()) {
                                vec.push_back(item.get<std::string>());
                            }
                        }
                        params.insert(std::make_pair(key, essentia::Parameter(vec)));
                    }
                    // Vector of booleans
                    else if (firstItem.is_boolean()) {
                        std::vector<bool> vec;
                        for (const auto& item : it.value()) {
                            if (item.is_boolean()) {
                                vec.push_back(item.get<bool>());
                            }
                        }
                        // Essentia doesn't directly support vector<bool> in Parameter,
                        // so convert it to a string representation
                        std::stringstream ss;
                        ss << "[";
                        for (size_t i = 0; i < vec.size(); ++i) {
                            ss << (vec[i] ? "true" : "false");
                            if (i < vec.size() - 1) ss << ", ";
                        }
                        ss << "]";
                        params.insert(std::make_pair(key, essentia::Parameter(ss.str())));
                    }
                } else {
                    // Empty array - default to empty vector of Real
                    std::vector<essentia::Real> emptyVec;
                    params.insert(std::make_pair(key, essentia::Parameter(emptyVec)));
                }
            }
            // Add basic support for nested objects
            else if (it.value().is_object()) {
                // Convert nested object to JSON string
                std::string nestedJson = it.value().dump();
                // Store as string parameter (algorithms that need nested objects
                // will need to parse this string)
                params.insert(std::make_pair(key, essentia::Parameter(nestedJson)));

                LOGI("Nested object parameter %s: %s", key.c_str(), nestedJson.c_str());
            }
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

    // Add UTF-8 validation before returning
    std::string jsonResult = result.dump();

    // Optional: Simple UTF-8 validation
    // This checks for basic UTF-8 validity and replaces invalid sequences
    std::string safeResult;
    safeResult.reserve(jsonResult.size());

    for (size_t i = 0; i < jsonResult.size(); i++) {
        unsigned char c = jsonResult[i];

        // ASCII characters (0-127) are always valid UTF-8
        if (c < 128) {
            safeResult.push_back(c);
            continue;
        }

        // For multi-byte sequences, validate and include if valid
        if ((c & 0xE0) == 0xC0) { // 2-byte sequence
            if (i + 1 < jsonResult.size() && (jsonResult[i+1] & 0xC0) == 0x80) {
                safeResult.push_back(c);
                safeResult.push_back(jsonResult[++i]);
            } else {
                safeResult.append("?"); // Replace invalid sequence
            }
        }
        else if ((c & 0xF0) == 0xE0) { // 3-byte sequence
            if (i + 2 < jsonResult.size() &&
                (jsonResult[i+1] & 0xC0) == 0x80 &&
                (jsonResult[i+2] & 0xC0) == 0x80) {
                safeResult.push_back(c);
                safeResult.push_back(jsonResult[++i]);
                safeResult.push_back(jsonResult[++i]);
            } else {
                safeResult.append("?"); // Replace invalid sequence
            }
        }
        else if ((c & 0xF8) == 0xF0) { // 4-byte sequence
            if (i + 3 < jsonResult.size() &&
                (jsonResult[i+1] & 0xC0) == 0x80 &&
                (jsonResult[i+2] & 0xC0) == 0x80 &&
                (jsonResult[i+3] & 0xC0) == 0x80) {
                safeResult.push_back(c);
                safeResult.push_back(jsonResult[++i]);
                safeResult.push_back(jsonResult[++i]);
                safeResult.push_back(jsonResult[++i]);
            } else {
                safeResult.append("?"); // Replace invalid sequence
            }
        }
        else {
            safeResult.append("?"); // Replace invalid byte
        }
    }

    return safeResult;
}

// Helper function to convert our map to a ParameterMap
essentia::ParameterMap convertToParameterMap(const std::map<std::string, essentia::Parameter>& params) {
    essentia::ParameterMap parameterMap;
    for (const auto& pair : params) {
        parameterMap.add(pair.first, pair.second);
    }
    return parameterMap;
}

// Improved error response with code, message, and details
std::string createErrorResponse(const std::string& errorMessage, const std::string& errorCode = "UNKNOWN_ERROR", const std::string& details = "") {
    return "{\"success\":false,\"error\":{\"code\":\"" + errorCode + "\",\"message\":\"" + errorMessage + "\",\"details\":\"" + details + "\"}}";
}

// EssentiaWrapper class to encapsulate state
class EssentiaWrapper {
private:
    bool mIsInitialized;
    std::vector<essentia::Real> audioBuffer;
    double sampleRate;

    // Add cached computation fields
    bool spectrumComputed;
    std::vector<essentia::Real> cachedSpectrum;

public:
    EssentiaWrapper() : mIsInitialized(false), sampleRate(44100.0), spectrumComputed(false) {}

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
        if (data.empty()) {
            return false;
        }

        try {
            // Reset state
            audioBuffer.clear();
            spectrumComputed = false;
            cachedSpectrum.clear();

            // Copy data to internal buffer
            audioBuffer = data;

            // Ensure audio buffer has even length for FFT
            if (audioBuffer.size() % 2 != 0) {
                audioBuffer.push_back(0.0); // Pad with zero to make it even
            }

            sampleRate = rate;

            std::cout << "Audio data set successfully: " << audioBuffer.size()
                      << " samples at " << sampleRate << " Hz" << std::endl;

            return true;
        } catch (const std::exception& e) {
            std::cerr << "Error setting audio data: " << e.what() << std::endl;
            return false;
        }
    }

    std::string executeAlgorithm(const std::string& algorithm, const std::string& paramsJson) {
        if (!mIsInitialized) {
            return createErrorResponse("Essentia is not initialized", "NOT_INITIALIZED");
        }

        if (audioBuffer.empty()) {
            return createErrorResponse("No audio data available", "NO_AUDIO_DATA");
        }

        try {
            // Parse parameters from JSON
            std::map<std::string, essentia::Parameter> params = jsonToParamsMap(paramsJson);

            // Special handling for algorithms that require FFT
            if (algorithm == "Spectrum" || algorithm == "MelBands" || algorithm == "MFCC") {
                // Ensure frameSize is even for FFT
                auto it = params.find("frameSize");
                if (it != params.end()) {
                    int frameSize = it->second.toInt();
                    if (frameSize % 2 != 0) {
                        // Make frameSize even
                        params.erase("frameSize");
                        params.insert(std::make_pair("frameSize", essentia::Parameter(frameSize + 1)));
                    }
                }
            }

            // Execute the algorithm
            return executeSpecificAlgorithm(algorithm, params);
        } catch (const std::exception& e) {
            return createErrorResponse(e.what(), "ALGORITHM_EXECUTION_ERROR");
        }
    }

    // Handle the specific optimized algorithms (MFCC, Spectrum, Key)
    std::string executeSpecificAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params) {
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
        essentia::Pool pool;

        if (audioBuffer.empty()) {
            return createErrorResponse("No audio data loaded", "NO_AUDIO_DATA");
        }

        try {
            if (algorithm == "MFCC") {
                if (!spectrumComputed) {
                    computeSpectrum(); // Ensure spectrum is computed
                }

                essentia::standard::Algorithm* mfccAlgo = factory.create("MFCC");
                if (!params.empty()) {
                    essentia::ParameterMap parameterMap = convertToParameterMap(params);
                    mfccAlgo->configure(parameterMap);
                }

                std::vector<essentia::Real> mfccCoeffs;
                std::vector<essentia::Real> mfccBands;

                mfccAlgo->input("spectrum").set(cachedSpectrum);
                mfccAlgo->output("mfcc").set(mfccCoeffs);
                mfccAlgo->output("bands").set(mfccBands);
                mfccAlgo->compute();

                pool.set("mfcc", mfccCoeffs);
                pool.set("bands", mfccBands);
                delete mfccAlgo;
            } else if (algorithm == "Spectrum") {
                if (!spectrumComputed) {
                    computeSpectrum();
                }
                pool.set("spectrum", cachedSpectrum);
            } else if (algorithm == "MelBands") {
                if (!spectrumComputed) {
                    computeSpectrum();
                }

                essentia::standard::Algorithm* melBandsAlgo = factory.create("MelBands");
                if (!params.empty()) {
                    essentia::ParameterMap parameterMap = convertToParameterMap(params);
                    melBandsAlgo->configure(parameterMap);
                }

                std::vector<essentia::Real> melBands;
                melBandsAlgo->input("spectrum").set(cachedSpectrum);
                melBandsAlgo->output("bands").set(melBands);
                melBandsAlgo->compute();

                pool.set("melBands", melBands);
                delete melBandsAlgo;
            } else if (algorithm == "Key") {
                // Key algorithm requires a more complex pipeline
                if (!spectrumComputed) {
                    computeSpectrum();
                }

                essentia::standard::Algorithm* peaksAlgo = factory.create("SpectralPeaks");
                std::vector<essentia::Real> frequencies;
                std::vector<essentia::Real> magnitudes;

                peaksAlgo->input("spectrum").set(cachedSpectrum);
                peaksAlgo->output("frequencies").set(frequencies);
                peaksAlgo->output("magnitudes").set(magnitudes);
                peaksAlgo->compute();

                essentia::standard::Algorithm* hpcpAlgo = factory.create("HPCP");
                std::vector<essentia::Real> hpcp;

                hpcpAlgo->input("frequencies").set(frequencies);
                hpcpAlgo->input("magnitudes").set(magnitudes);
                hpcpAlgo->output("hpcp").set(hpcp);
                hpcpAlgo->compute();

                essentia::standard::Algorithm* keyAlgo = factory.create("Key");
                std::string key;
                std::string scale;
                essentia::Real strength;

                keyAlgo->input("pcp").set(hpcp);
                keyAlgo->output("key").set(key);
                keyAlgo->output("scale").set(scale);
                keyAlgo->output("strength").set(strength);
                keyAlgo->compute();

                pool.set("key", key);
                pool.set("scale", scale);
                pool.set("strength", strength);

                delete peaksAlgo;
                delete hpcpAlgo;
                delete keyAlgo;
            } else {
                return executeDynamicAlgorithm(algorithm, params);
            }

            std::string resultJson = poolToJson(pool);
            return "{\"success\":true,\"data\":" + resultJson + "}";
        } catch (const std::exception& e) {
            return createErrorResponse(e.what(), "ALGORITHM_ERROR");
        }
    }

    // Handle any algorithm dynamically by inspecting its inputs/outputs
    std::string executeDynamicAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params) {
        try {
            // Get algorithm factory
            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

            // Create a copy of params that we can modify if needed
            std::map<std::string, essentia::Parameter> modifiedParams = params;

            // Special handling for algorithms that require FFT
            if (algorithm == "Spectrum" || algorithm == "MelBands" || algorithm == "MFCC") {
                // Ensure frameSize is even for FFT
                auto it = modifiedParams.find("frameSize");
                if (it != modifiedParams.end()) {
                    int frameSize = it->second.toInt();
                    if (frameSize % 2 != 0) {
                        // Make frameSize even
                        modifiedParams.erase("frameSize");
                        modifiedParams.insert(std::make_pair("frameSize", essentia::Parameter(frameSize + 1)));
                    }
                }
            }

            // First create the algorithm without parameters
            essentia::standard::Algorithm* algo = factory.create(algorithm);

            // Then configure it with the parameters
            if (!modifiedParams.empty()) {
                essentia::ParameterMap algoParams = convertToParameterMap(modifiedParams);
                algo->configure(algoParams);
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
                        algo->input(inputName).set(audioBuffer);
                    }
                    else {
                        // For other vector inputs, create an empty vector
                        std::vector<essentia::Real>* vec = new std::vector<essentia::Real>();
                        inputPointers[inputName] = vec;
                        algo->input(inputName).set(*vec);
                    }
                }
                else if (inputType.find("essentia::Real") != std::string::npos) {
                    // For single Real inputs, use 0.0 as default or sample rate for sampleRate input
                    essentia::Real* val = new essentia::Real;
                    *val = (inputName == "sampleRate") ? sampleRate : 0.0;
                    inputPointers[inputName] = val;
                    algo->input(inputName).set(*val);
                }
                else if (inputType.find("std::string") != std::string::npos) {
                    // For string inputs, use empty string
                    std::string* str = new std::string("");
                    inputPointers[inputName] = str;
                    algo->input(inputName).set(*str);
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
                }
                else if (outputType.find("essentia::Real") != std::string::npos) {
                    essentia::Real* val = new essentia::Real;
                    outputPointers[outputName] = val;
                    algo->output(outputName).set(*val);
                }
                else if (outputType.find("std::string") != std::string::npos) {
                    std::string* str = new std::string();
                    outputPointers[outputName] = str;
                    algo->output(outputName).set(*str);
                }
            }

            // Compute the algorithm
            LOGI("Computing algorithm: %s", algorithm.c_str());
            algo->compute();

            // Collect the outputs into the pool
            essentia::Pool pool;
            for (const auto& output : algo->outputs()) {
                std::string outputName = output.first;
                std::string outputType = output.second->typeInfo().name();

                if (outputPointers.find(outputName) != outputPointers.end()) {
                    if (outputType.find("std::vector<essentia::Real>") != std::string::npos) {
                        std::vector<essentia::Real>* vec = static_cast<std::vector<essentia::Real>*>(outputPointers[outputName]);
                        pool.set(algorithm + "." + outputName, *vec);
                        delete vec;
                    }
                    else if (outputType.find("essentia::Real") != std::string::npos) {
                        essentia::Real* val = static_cast<essentia::Real*>(outputPointers[outputName]);
                        pool.set(algorithm + "." + outputName, *val);
                        delete val;
                    }
                    else if (outputType.find("std::string") != std::string::npos) {
                        std::string* str = static_cast<std::string*>(outputPointers[outputName]);
                        pool.set(algorithm + "." + outputName, *str);
                        delete str;
                    }
                }
            }

            // Clean up remaining input pointers
            for (auto& inputPair : inputPointers) {
                if (inputPair.second) {
                    const std::string& inputName = inputPair.first;
                    const char* typeInfoName = algo->input(inputName).typeInfo().name();
                    std::string typeStr(typeInfoName);

                    if (typeStr.find("std::vector<essentia::Real>") != std::string::npos) {
                        delete static_cast<std::vector<essentia::Real>*>(inputPair.second);
                    }
                    else if (typeStr.find("essentia::Real") != std::string::npos) {
                        delete static_cast<essentia::Real*>(inputPair.second);
                    }
                    else if (typeStr.find("std::string") != std::string::npos) {
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
        } catch (const std::exception& e) {
            return createErrorResponse(e.what(), "ALGORITHM_EXECUTION_ERROR");
        }
    }

    // Add a method to compute and cache the spectrum
    void computeSpectrum() {
        if (spectrumComputed) {
            return; // Spectrum already computed
        }

        if (audioBuffer.empty()) {
            throw std::runtime_error("No audio data available for spectrum computation");
        }

        try {
            // Create algorithm factory
            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

            // Create windowing algorithm
            essentia::standard::Algorithm* window = factory.create("Windowing",
                                                                 "type", "hann",
                                                                 "size", 1024);

            // Create spectrum algorithm (computes magnitude spectrum directly from windowed frame)
            essentia::standard::Algorithm* spectrum = factory.create("Spectrum",
                                                                   "size", 1024);

            // Input and output vectors
            std::vector<essentia::Real> audioFrame;
            std::vector<essentia::Real> windowedFrame;
            std::vector<essentia::Real> spectrumFrame;

            // Process audio in frames
            for (size_t i = 0; i < audioBuffer.size(); i += 512) {
                // Ensure we have enough samples for a frame
                if (i + 1024 > audioBuffer.size()) {
                    // Pad the frame with zeros if needed to ensure even size for FFT
                    audioFrame.resize(1024, 0.0);
                    size_t remainingSamples = audioBuffer.size() - i;
                    std::copy(audioBuffer.begin() + i, audioBuffer.end(), audioFrame.begin());
                } else {
                    // Extract frame
                    audioFrame.assign(audioBuffer.begin() + i, audioBuffer.begin() + i + 1024);
                }

                // Ensure frame size is even for FFT
                if (audioFrame.size() % 2 != 0) {
                    audioFrame.push_back(0.0); // Pad with zero to make it even
                }

                // Apply window
                window->input("frame").set(audioFrame);
                window->output("frame").set(windowedFrame);
                window->compute();

                // Compute spectrum directly from windowed frame
                spectrum->input("frame").set(windowedFrame);  // Use windowed frame, not FFT
                spectrum->output("spectrum").set(spectrumFrame);
                spectrum->compute();

                // Store the result
                cachedSpectrum = spectrumFrame;  // Just store the last frame for now
            }

            // Clean up
            delete window;
            delete spectrum;

            spectrumComputed = true;
        } catch (const std::exception& e) {
            throw std::runtime_error(std::string("Error computing spectrum: ") + e.what());
        }
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

    std::string getAllAlgorithms() {
        try {
            if (!mIsInitialized) {
                return createErrorResponse("Essentia not initialized", "NOT_INITIALIZED");
            }

            LOGI("Getting list of all available algorithms");

            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
            std::vector<std::string> algos = factory.keys();

            // Create a JSON array of algorithm names
            json result = json::array();
            for (const auto& algo : algos) {
                result.push_back(algo);
            }

            // Return success with results
            return "{\"success\":true,\"data\":" + result.dump() + "}";
        } catch (const std::exception& e) {
            std::string errorMsg = std::string("Error getting algorithm list: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return createErrorResponse(errorMsg, "ALGORITHM_LIST_ERROR");
        }
    }

    bool isInitialized() const {
        return mIsInitialized;
    }

    std::string extractFeatures(const std::string& featuresJson) {
        if (!mIsInitialized) {
            return createErrorResponse("Essentia is not initialized", "NOT_INITIALIZED");
        }

        if (audioBuffer.empty()) {
            return createErrorResponse("No audio data loaded. Call setAudioData() first.", "ESSENTIA_NO_AUDIO_DATA");
        }

        // Reset spectrum cache to ensure fresh computation for each feature extraction
        spectrumComputed = false;
        cachedSpectrum.clear();

        essentia::Pool pool;

        try {
            // Parse the feature configurations
            json featureConfigs = json::parse(featuresJson);
            if (!featureConfigs.is_array()) {
                return createErrorResponse("Features must be an array of configurations", "INVALID_FORMAT");
            }

            // Process each feature configuration
            for (const auto& config : featureConfigs) {
                // Extract feature name
                if (!config.contains("name") || !config["name"].is_string()) {
                    return createErrorResponse("Feature configuration missing 'name' field", "INVALID_FORMAT");
                }

                std::string name = config["name"].get<std::string>();
                LOGI("Processing feature: %s", name.c_str());

                // Extract parameters if present
                std::map<std::string, essentia::Parameter> params;
                if (config.contains("params") && config["params"].is_object()) {
                    std::string paramsJson = config["params"].dump();
                    params = jsonToParamsMap(paramsJson);
                }

                // Check if we need to compute mean
                bool computeMean = false;
                if (config.contains("computeMean") && config["computeMean"].is_boolean()) {
                    computeMean = config["computeMean"].get<bool>();
                }

                // Execute the specific algorithm
                std::string result = executeSpecificAlgorithm(name, params);

                // Parse the result
                json resultJson;
                try {
                    resultJson = json::parse(result);
                } catch (const json::exception& e) {
                    return createErrorResponse("Error parsing algorithm result: " + std::string(e.what()),
                                           "PARSING_ERROR", result);
                }

                // Check for errors
                if (!resultJson.contains("success") || !resultJson["success"].get<bool>()) {
                    return result; // Propagate the error response
                }

                // Add algorithm results to the pool
                if (resultJson.contains("data") && resultJson["data"].is_object()) {
                    for (auto& [key, value] : resultJson["data"].items()) {
                        // Determine the feature name to use in pool
                        // Either use the algorithm name as prefix or keep the original key
                        std::string featureKey = config.contains("outputPrefix") &&
                                               config["outputPrefix"].get<bool>() ?
                                               name + "." + key : key;

                        // Handle different value types appropriately
                        if (value.is_array()) {
                            std::vector<essentia::Real> vec;
                            for (const auto& item : value) {
                                if (item.is_number()) {
                                    // Handle NaN and Infinity values
                                    double val = item.get<double>();
                                    vec.push_back(std::isfinite(val) ? val : 0.0);
                                }
                            }

                            if (computeMean && !vec.empty()) {
                                // Compute mean if requested
                                essentia::Real sum = std::accumulate(vec.begin(), vec.end(), 0.0);
                                pool.set(featureKey + ".mean", sum / vec.size());
                            } else {
                                // Store the vector as is
                                pool.set(featureKey, vec);
                            }
                        }
                        else if (value.is_string()) {
                            pool.set(featureKey, value.get<std::string>());
                        }
                        else if (value.is_number()) {
                            // Handle NaN and Infinity values
                            double val = value.get<double>();
                            pool.set(featureKey, std::isfinite(val) ? val : 0.0);
                        }
                        else if (value.is_boolean()) {
                            pool.set(featureKey, value.get<bool>());
                        }
                    }
                }
            }

            // Convert the pool to JSON and return success
            std::string resultJson = poolToJson(pool);
            return "{\"success\":true,\"data\":" + resultJson + "}";
        }
        catch (const json::exception& e) {
            return createErrorResponse("Error parsing feature configuration: " + std::string(e.what()),
                                   "JSON_PARSE_ERROR");
        }
        catch (const std::exception& e) {
            return createErrorResponse("Error extracting features: " + std::string(e.what()),
                                   "EXTRACTION_ERROR", e.what());
        }
    }

    // Add this helper function to the EssentiaWrapper class
    // This can be used to find the best match for an input name
    std::string findMatchingInputName(essentia::standard::Algorithm* algo, const std::string& expectedName, const std::vector<std::string>& alternatives = {}) {
        // First, check if the expected name exists
        for (const auto& input : algo->inputs()) {
            if (input.first == expectedName) {
                return expectedName;
            }
        }

        // If not, try the alternatives
        for (const auto& altName : alternatives) {
            for (const auto& input : algo->inputs()) {
                if (input.first == altName) {
                    LOGI("Using alternative input name: %s instead of %s", altName.c_str(), expectedName.c_str());
                    return altName;
                }
            }
        }

        // If we get here, neither the expected name nor any alternatives match
        // Return empty string to indicate no match
        std::string availableInputs = "";
        for (const auto& input : algo->inputs()) {
            availableInputs += input.first + ", ";
        }
        LOGW("Could not find input '%s' or alternatives. Available inputs: [%s]",
             expectedName.c_str(), availableInputs.c_str());

        return "";
    }

    // Add this as a method inside the EssentiaWrapper class
    // This can be used to find the best match for an input name
    std::string computeMelSpectrogram(int frameSize, int hopSize, int nMels, float fMin, float fMax, const std::string& windowType, bool normalize, bool logScale) {
        if (!mIsInitialized) {
            return createErrorResponse("Essentia is not initialized", "NOT_INITIALIZED");
        }

        if (audioBuffer.empty()) {
            return createErrorResponse("No audio data available", "NO_AUDIO_DATA");
        }

        try {
            LOGI("Computing mel spectrogram with params: frameSize=%d, hopSize=%d, nMels=%d",
                 frameSize, hopSize, nMels);

            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

            // Create algorithms
            essentia::standard::Algorithm* frameCutter = factory.create("FrameCutter",
                "frameSize", frameSize,
                "hopSize", hopSize,
                "startFromZero", true
            );

            essentia::standard::Algorithm* windowing = factory.create("Windowing",
                "type", windowType,
                "size", frameSize
            );

            essentia::standard::Algorithm* spectrum = factory.create("Spectrum",
                "size", frameSize
            );

            essentia::standard::Algorithm* melBands = factory.create("MelBands",
                "inputSize", (frameSize / 2) + 1, // Correct spectrum size
                "numberBands", nMels,
                "lowFrequencyBound", fMin,
                "highFrequencyBound", fMax,
                "sampleRate", static_cast<int>(sampleRate),
                "normalize", normalize ? "unit_sum" : "none",
                "log", logScale // This matches Essentia's API
            );

            // Process frames
            std::vector<std::vector<essentia::Real>> melSpectrogram;
            std::vector<essentia::Real> frame;

            frameCutter->input("signal").set(audioBuffer);
            frameCutter->output("frame").set(frame);

            // Loop through frames
            while (true) {
                // Reset frame for next input
                frame.clear();

                // Process next frame
                frameCutter->compute();

                // If we got an empty frame, we're done
                if (frame.empty()) {
                    break;
                }

                // Apply window to frame
                std::vector<essentia::Real> windowedFrame;
                windowing->input("frame").set(frame);
                windowing->output("frame").set(windowedFrame);
                windowing->compute();

                // Compute spectrum
                std::vector<essentia::Real> spec;
                spectrum->input("frame").set(windowedFrame);
                spectrum->output("spectrum").set(spec);
                spectrum->compute();

                // Compute mel bands
                std::vector<essentia::Real> bands;
                melBands->input("spectrum").set(spec);
                melBands->output("bands").set(bands);
                melBands->compute();

                // Add to mel spectrogram
                melSpectrogram.push_back(bands);
            }

            // Clean up
            delete frameCutter;
            delete windowing;
            delete spectrum;
            delete melBands;

            LOGI("Computed mel spectrogram with %d frames", (int)melSpectrogram.size());

            // Convert to JSON
            json result;
            result["bands"] = melSpectrogram;
            result["sampleRate"] = sampleRate;
            result["nMels"] = nMels;
            result["timeSteps"] = melSpectrogram.size();
            result["durationMs"] = (melSpectrogram.size() * hopSize * 1000) / sampleRate;

            return "{\"success\":true,\"data\":" + result.dump() + "}";
        } catch (const std::exception& e) {
            std::string errorMsg = std::string("Error computing mel spectrogram: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return createErrorResponse(errorMsg, "MEL_SPECTROGRAM_ERROR");
        }
    }

    // Map of primary output names for common Essentia algorithms
    const std::map<std::string, std::string> primaryOutputs = {
        {"MFCC", "mfcc"},
        {"MelBands", "bands"},
        {"Chroma", "chroma"},
        {"Tonnetz", "tonnetz"},
        {"Spectrum", "spectrum"},
        {"SpectralCentroid", "centroid"},
        {"SpectralContrast", "spectralContrast"},
        {"SpectralFlatness", "flatness"},
        {"Energy", "energy"},
        {"RMS", "rms"}
        // Add more mappings as needed
    };

    /**
     * Executes a configurable audio processing pipeline defined by a JSON configuration
     * @param pipelineJson JSON string containing pipeline configuration
     * @return JSON string with results or error message
     */
    std::string executePipeline(const std::string& pipelineJson) {
        try {
            if (!mIsInitialized) {
                return createErrorResponse("Essentia not initialized", "NOT_INITIALIZED");
            }

            if (audioBuffer.empty()) {
                return createErrorResponse("No audio data loaded", "NO_AUDIO_DATA");
            }

            // Parse the JSON configuration
            json config;
            try {
                config = json::parse(pipelineJson);
            } catch (const json::exception& e) {
                return createErrorResponse(std::string("Invalid JSON configuration: ") + e.what(), "INVALID_CONFIG");
            }

            // Validate configuration
            if (!config.contains("preprocess") || !config["preprocess"].is_array()) {
                return createErrorResponse("Invalid configuration: 'preprocess' must be an array", "INVALID_CONFIG");
            }
            if (!config.contains("features") || !config["features"].is_array()) {
                return createErrorResponse("Invalid configuration: 'features' must be an array", "INVALID_CONFIG");
            }

            essentia::Pool finalPool;
            bool isFrameBased = false;
            size_t frameCutterIndex = std::numeric_limits<size_t>::max();

            // Determine if the pipeline is frame-based
            for (size_t i = 0; i < config["preprocess"].size(); ++i) {
                if (config["preprocess"][i]["name"].get<std::string>() == "FrameCutter") {
                    isFrameBased = true;
                    frameCutterIndex = i;
                    break;
                }
            }

            LOGI("Executing pipeline (frame-based: %s)", isFrameBased ? "true" : "false");

            essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

            if (isFrameBased) {
                // Frame-based processing
                if (frameCutterIndex >= config["preprocess"].size()) {
                    return createErrorResponse("FrameCutter not found in preprocessing steps", "INVALID_CONFIG");
                }

                // Create FrameCutter
                json frameCutterConfig = config["preprocess"][frameCutterIndex];
                if (!frameCutterConfig.contains("params") ||
                    !frameCutterConfig["params"].contains("frameSize") ||
                    !frameCutterConfig["params"].contains("hopSize")) {
                    return createErrorResponse("FrameCutter requires frameSize and hopSize parameters", "INVALID_CONFIG");
                }

                // Configure FrameCutter
                essentia::standard::Algorithm* frameCutter = factory.create("FrameCutter",
                    "frameSize", frameCutterConfig["params"]["frameSize"].get<int>(),
                    "hopSize", frameCutterConfig["params"]["hopSize"].get<int>()
                );

                std::vector<essentia::Real> frame;
                frameCutter->input("signal").set(audioBuffer);
                frameCutter->output("frame").set(frame);

                // Map to store feature outputs across frames
                std::map<std::string, std::vector<std::vector<essentia::Real>>> featureCollectors;

                // Create and configure preprocessing algorithms (after FrameCutter)
                std::vector<essentia::standard::Algorithm*> preprocessAlgos;
                std::vector<std::vector<essentia::Real>> preprocessOutputs;
                std::vector<std::string> preprocessOutputNames;

                for (size_t i = frameCutterIndex + 1; i < config["preprocess"].size(); ++i) {
                    json step = config["preprocess"][i];
                    std::string name = step["name"].get<std::string>();

                    try {
                        essentia::standard::Algorithm* algo = factory.create(name);

                        // Configure algorithm parameters
                        if (step.contains("params")) {
                            json params = step["params"];
                            for (auto& [key, value] : params.items()) {
                                if (value.is_number_integer()) {
                                    algo->configure(key, value.get<int>());
                                }
                                else if (value.is_number_float()) {
                                    algo->configure(key, value.get<float>());
                                }
                                else if (value.is_string()) {
                                    algo->configure(key, value.get<std::string>());
                                }
                                else if (value.is_boolean()) {
                                    algo->configure(key, value.get<bool>());
                                }
                            }
                        }

                        preprocessAlgos.push_back(algo);
                        preprocessOutputs.push_back(std::vector<essentia::Real>());
                        preprocessOutputNames.push_back(name);
                    }
                    catch (const std::exception& e) {
                        // Clean up already created algorithms
                        for (auto* algo : preprocessAlgos) {
                            delete algo;
                        }
                        return createErrorResponse(std::string("Error creating algorithm '") + name + "': " + e.what(), "ALGORITHM_ERROR");
                    }
                }

                // Create and configure feature algorithms
                std::vector<essentia::standard::Algorithm*> featureAlgos;
                std::vector<std::vector<essentia::Real>> featureOutputs;
                std::vector<std::string> featureNames;
                std::vector<std::string> featureInputs;
                std::vector<std::string> featureOutputNames;
                std::vector<bool> featureUseMean;

                for (const auto& feature : config["features"]) {
                    std::string name = feature["name"].get<std::string>();

                    if (!feature.contains("input")) {
                        // Clean up resources
                        for (auto* algo : preprocessAlgos) delete algo;
                        for (auto* algo : featureAlgos) delete algo;
                        return createErrorResponse(std::string("Feature '") + name + "' is missing required 'input' field", "INVALID_CONFIG");
                    }

                    std::string inputName = feature["input"].get<std::string>();

                    try {
                        essentia::standard::Algorithm* algo = factory.create(name);

                        // Configure algorithm parameters
                        if (feature.contains("params")) {
                            json params = feature["params"];
                            for (auto& [key, value] : params.items()) {
                                if (value.is_number_integer()) {
                                    algo->configure(key, value.get<int>());
                                }
                                else if (value.is_number_float()) {
                                    algo->configure(key, value.get<float>());
                                }
                                else if (value.is_string()) {
                                    algo->configure(key, value.get<std::string>());
                                }
                                else if (value.is_boolean()) {
                                    algo->configure(key, value.get<bool>());
                                }
                            }
                        }

                        featureAlgos.push_back(algo);
                        featureOutputs.push_back(std::vector<essentia::Real>());
                        featureNames.push_back(name);
                        featureInputs.push_back(inputName);

                        // Determine the primary output name for this algorithm
                        std::string outputName;
                        if (primaryOutputs.find(name) != primaryOutputs.end()) {
                            outputName = primaryOutputs.at(name);
                        } else {
                            // Default to algorithm name in lowercase
                            outputName = name;
                            std::transform(outputName.begin(), outputName.end(), outputName.begin(), ::tolower);
                        }
                        featureOutputNames.push_back(outputName);

                        // Check if we should compute mean for this feature
                        bool useMean = false;
                        if (feature.contains("postProcess") && feature["postProcess"].contains("mean")) {
                            useMean = feature["postProcess"]["mean"].get<bool>();
                        }
                        featureUseMean.push_back(useMean);
                    }
                    catch (const std::exception& e) {
                        // Clean up resources
                        for (auto* algo : preprocessAlgos) delete algo;
                        for (auto* algo : featureAlgos) delete algo;
                        return createErrorResponse(std::string("Error creating algorithm '") + name + "': " + e.what(), "ALGORITHM_ERROR");
                    }
                }

                // Create intermediate pools for feature computation
                essentia::Pool framePool;
                int frameCount = 0;

                // Process frames
                while (true) {
                    // Extract frame
                    frameCutter->compute();
                    if (frame.empty()) break; // No more frames

                    frameCount++;

                    // Store the frame in the pool
                    framePool.remove("frame");
                    framePool.add("frame", frame);

                    // Apply preprocessing steps
                    for (size_t i = 0; i < preprocessAlgos.size(); ++i) {
                        auto* algo = preprocessAlgos[i];
                        std::string inputName = (i == 0) ? "frame" : preprocessOutputNames[i-1];
                        std::vector<essentia::Real>& output = preprocessOutputs[i];

                        // Connect input from previous step's output
                        algo->input("frame").set(framePool.value<std::vector<essentia::Real>>(inputName));
                        algo->output(primaryOutputs.count(preprocessOutputNames[i]) ?
                                   primaryOutputs.at(preprocessOutputNames[i]) : preprocessOutputNames[i]).set(output);

                        // Compute algorithm
                        algo->compute();

                        // Store result in the pool
                        framePool.remove(preprocessOutputNames[i]);
                        framePool.add(preprocessOutputNames[i], output);
                    }

                    // Compute features
                    for (size_t i = 0; i < featureAlgos.size(); ++i) {
                        auto* algo = featureAlgos[i];
                        std::string inputName = featureInputs[i];
                        std::vector<essentia::Real>& output = featureOutputs[i];

                        // Get the correct input data from the pool
                        if (!framePool.contains<std::vector<essentia::Real>>(inputName)) {
                            LOGW("Input '%s' for feature '%s' not found in pool, skipping",
                                 inputName.c_str(), featureNames[i].c_str());
                            continue;
                        }

                        // Connect input and output
                        const std::vector<essentia::Real>& input = framePool.value<std::vector<essentia::Real>>(inputName);

                        // Get the appropriate input port name - typically "spectrum" for spectral features
                        std::string inputPortName = "frame";
                        if (inputName == "Spectrum" || inputName == "spectrum") {
                            inputPortName = "spectrum";
                        }

                        algo->input(inputPortName).set(input);
                        algo->output(featureOutputNames[i]).set(output);

                        // Compute algorithm
                        algo->compute();

                        // Store output for this frame
                        if (featureCollectors.find(featureNames[i]) == featureCollectors.end()) {
                            featureCollectors[featureNames[i]] = std::vector<std::vector<essentia::Real>>();
                        }
                        featureCollectors[featureNames[i]].push_back(output);
                    }
                }

                // Process feature data
                for (size_t i = 0; i < featureNames.size(); ++i) {
                    const std::string& name = featureNames[i];
                    const auto& outputs = featureCollectors[name];

                    // Skip features that weren't computed successfully
                    if (outputs.empty()) continue;

                    if (featureUseMean[i]) {
                        // Compute mean across frames
                        std::vector<essentia::Real> meanOutput(outputs[0].size(), 0.0);
                        for (const auto& frameOutput : outputs) {
                            for (size_t j = 0; j < frameOutput.size(); ++j) {
                                meanOutput[j] += frameOutput[j];
                            }
                        }

                        // Divide by frame count
                        for (auto& val : meanOutput) {
                            val /= outputs.size();
                        }

                        finalPool.add(name, meanOutput);
                    } else {
                        // Store all frame data
                        for (const auto& frameOutput : outputs) {
                            finalPool.add(name, frameOutput);
                        }
                    }
                }

                // Clean up resources
                delete frameCutter;
                for (auto* algo : preprocessAlgos) delete algo;
                for (auto* algo : featureAlgos) delete algo;

                LOGI("Processed %d frames", frameCount);
            }
            else {
                // Signal-based processing
                essentia::Pool signalPool;
                signalPool.add("signal", audioBuffer);

                // Apply preprocessing steps
                std::string currentOutput = "signal";

                for (const auto& step : config["preprocess"]) {
                    std::string name = step["name"].get<std::string>();

                    try {
                        essentia::standard::Algorithm* algo = factory.create(name);

                        // Configure algorithm parameters
                        if (step.contains("params")) {
                            json params = step["params"];
                            for (auto& [key, value] : params.items()) {
                                if (value.is_number_integer()) {
                                    algo->configure(key, value.get<int>());
                                }
                                else if (value.is_number_float()) {
                                    algo->configure(key, value.get<float>());
                                }
                                else if (value.is_string()) {
                                    algo->configure(key, value.get<std::string>());
                                }
                                else if (value.is_boolean()) {
                                    algo->configure(key, value.get<bool>());
                                }
                            }
                        }

                        // Connect input from previous step's output
                        algo->input("signal").set(signalPool.value<std::vector<essentia::Real>>(currentOutput));

                        // Determine the output name
                        std::string outputName;
                        if (primaryOutputs.find(name) != primaryOutputs.end()) {
                            outputName = primaryOutputs.at(name);
                            } else {
                            outputName = name;
                            std::transform(outputName.begin(), outputName.end(), outputName.begin(), ::tolower);
                        }

                        std::vector<essentia::Real> output;
                        algo->output(outputName).set(output);

                        // Compute algorithm
                        algo->compute();

                        // Store result in the pool
                        signalPool.add(name, output);

                        // Update current output for next iteration
                        currentOutput = name;

                        // Clean up
                        delete algo;
                    }
                    catch (const std::exception& e) {
                        return createErrorResponse(std::string("Error in preprocessing step '") + name + "': " + e.what(), "ALGORITHM_ERROR");
                    }
                }

                // Compute features
                for (const auto& feature : config["features"]) {
                    std::string name = feature["name"].get<std::string>();

                    if (!feature.contains("input")) {
                        return createErrorResponse(std::string("Feature '") + name + "' is missing required 'input' field", "INVALID_CONFIG");
                    }

                    std::string inputName = feature["input"].get<std::string>();

                    try {
                        essentia::standard::Algorithm* algo = factory.create(name);

                        // Configure algorithm parameters
                        if (feature.contains("params")) {
                            json params = feature["params"];
                            for (auto& [key, value] : params.items()) {
                                if (value.is_number_integer()) {
                                    algo->configure(key, value.get<int>());
                                }
                                else if (value.is_number_float()) {
                                    algo->configure(key, value.get<float>());
                                }
                                else if (value.is_string()) {
                                    algo->configure(key, value.get<std::string>());
                                }
                                else if (value.is_boolean()) {
                                    algo->configure(key, value.get<bool>());
                                }
                            }
                        }

                        // Make sure the input exists in the pool
                        if (!signalPool.contains<std::vector<essentia::Real>>(inputName)) {
                            delete algo;
                            return createErrorResponse(std::string("Input '") + inputName + "' for feature '" + name + "' not found in pool", "INVALID_CONFIG");
                        }

                        // Get the appropriate input port name
                        std::string inputPortName = "signal";
                        if (inputName == "Spectrum" || inputName == "spectrum") {
                            inputPortName = "spectrum";
                        }

                        const std::vector<essentia::Real>& input = signalPool.value<std::vector<essentia::Real>>(inputName);

                        // Determine the output name
                        std::string outputName;
                        if (primaryOutputs.find(name) != primaryOutputs.end()) {
                            outputName = primaryOutputs.at(name);
                        } else {
                            outputName = name;
                            std::transform(outputName.begin(), outputName.end(), outputName.begin(), ::tolower);
                        }

                        // Connect I/O
                        std::vector<essentia::Real> output;
                        algo->input(inputPortName).set(input);
                        algo->output(outputName).set(output);

                        // Compute algorithm
                        algo->compute();

                        // Add to final pool
                        finalPool.add(name, output);

                        // Clean up
                        delete algo;
                    }
                    catch (const std::exception& e) {
                        return createErrorResponse(std::string("Error in feature extraction '") + name + "': " + e.what(), "ALGORITHM_ERROR");
                    }
                }
            }

            // Apply global post-processing
            if (config.contains("postProcess")) {
                if (config["postProcess"].contains("concatenate") &&
                    config["postProcess"]["concatenate"].get<bool>()) {

                    // Concatenate all feature vectors
                    std::vector<essentia::Real> concatenated;
                    for (const auto& descName : finalPool.descriptorNames()) {
                        const auto& values = finalPool.value<std::vector<essentia::Real>>(descName);
                        concatenated.insert(concatenated.end(), values.begin(), values.end());
                    }

                    finalPool.add("concatenatedFeatures", concatenated);
                }

                // Add more post-processing options as needed
            }

            // Convert the pool to JSON
            json result;
            for (const auto& descName : finalPool.descriptorNames()) {
                try {
                    const auto& values = finalPool.value<std::vector<essentia::Real>>(descName);
                    result[descName] = values;
                } catch (const std::exception& e) {
                    LOGW("Failed to convert descriptor '%s' to JSON: %s", descName.c_str(), e.what());
                    // Skip descriptors that can't be converted
                }
            }

            return "{\"success\":true,\"data\":" + result.dump() + "}";
        }
        catch (const std::exception& e) {
            std::string errorMsg = std::string("Error executing pipeline: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return createErrorResponse(errorMsg, "PIPELINE_EXECUTION_ERROR");
        }
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

// Add this JNI method after getAlgorithmInfo (around line 552)
static jstring getAllAlgorithms(JNIEnv* env, jobject thiz, jlong handle) {
    if (handle == 0) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia instance").c_str());
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);
    std::string result = wrapper->getAllAlgorithms();
    return env->NewStringUTF(result.c_str());
}

// Add this JNI method declaration
static jstring extractFeatures(JNIEnv* env, jobject thiz, jlong handle, jstring jfeaturesJson) {
    if (handle == 0) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia instance").c_str());
    }

    if (jfeaturesJson == nullptr) {
        return env->NewStringUTF(createErrorResponse("Invalid features configuration").c_str());
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);

    // Convert Java string to C++ string
    const char* featuresJsonCStr = env->GetStringUTFChars(jfeaturesJson, nullptr);
    std::string featuresJson(featuresJsonCStr);

    // Release Java string
    env->ReleaseStringUTFChars(jfeaturesJson, featuresJsonCStr);

    // Extract the features
    std::string result = wrapper->extractFeatures(featuresJson);

    return env->NewStringUTF(result.c_str());
}

// Add near the end, with other JNI methods
static jstring getVersion(JNIEnv* env, jobject thiz) {
    return env->NewStringUTF(essentia::version);
}

// Add this JNI method
static jstring nativeComputeMelSpectrogram(JNIEnv* env, jobject thiz, jlong handle,
    jint frameSize, jint hopSize, jint nMels, jfloat fMin, jfloat fMax,
    jstring jwindowType, jboolean normalize, jboolean logScale) {

    if (handle == 0) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia instance").c_str());
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);

    // Convert Java string to C++ string
    const char* windowTypeCStr = env->GetStringUTFChars(jwindowType, nullptr);
    std::string windowType(windowTypeCStr);
    env->ReleaseStringUTFChars(jwindowType, windowTypeCStr);

    // Call the wrapper method
    std::string result = wrapper->computeMelSpectrogram(
        frameSize, hopSize, nMels, fMin, fMax, windowType,
        normalize == JNI_TRUE, logScale == JNI_TRUE
    );

    return env->NewStringUTF(result.c_str());
}

/**
 * Executes an audio processing pipeline based on a JSON configuration
 */
static jstring nativeExecutePipeline(JNIEnv* env, jobject thiz, jlong handle, jstring jpipelineJson) {
    if (handle == 0) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia instance", "INVALID_HANDLE").c_str());
    }

    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);

    const char* pipelineJsonCStr = env->GetStringUTFChars(jpipelineJson, nullptr);
    if (pipelineJsonCStr == nullptr) {
        return env->NewStringUTF(createErrorResponse("Failed to get pipeline JSON string", "STRING_CONVERSION_ERROR").c_str());
    }

    std::string pipelineJson(pipelineJsonCStr);
    env->ReleaseStringUTFChars(jpipelineJson, pipelineJsonCStr);

    try {
        std::string result = wrapper->executePipeline(pipelineJson);
        return env->NewStringUTF(result.c_str());
    } catch (const std::exception& e) {
        std::string errorMsg = std::string("Exception in nativeExecutePipeline: ") + e.what();
        LOGE("%s", errorMsg.c_str());
        return env->NewStringUTF(createErrorResponse(errorMsg, "NATIVE_EXCEPTION").c_str());
    }
}

// JNI method registration
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
        {"nativeExtractFeatures", "(JLjava/lang/String;)Ljava/lang/String;", (void*)extractFeatures},
        {"getVersion", "()Ljava/lang/String;", (void*)getVersion},
        {"nativeComputeMelSpectrogram", "(JIIIFFLjava/lang/String;ZZ)Ljava/lang/String;", (void*)nativeComputeMelSpectrogram},
        {"nativeExecutePipeline", "(JLjava/lang/String;)Ljava/lang/String;", (void*)nativeExecutePipeline}
    };

    int rc = env->RegisterNatives(clazz, methods, sizeof(methods) / sizeof(methods[0]));
    if (rc != JNI_OK) {
        return JNI_ERR;
    }

    // If everything went well, return the JNI version
    return JNI_VERSION_1_6;
}

