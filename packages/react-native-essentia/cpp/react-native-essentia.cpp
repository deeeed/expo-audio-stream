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

// Update the poolToJson function to properly handle nested vectors
std::string poolToJson(const essentia::Pool& pool) {
    json result;

    for (const auto& key : pool.descriptorNames()) {
        try {
            // Handle array of vectors case first (frame-wise analysis)
            if (pool.contains<std::vector<std::vector<essentia::Real>>>(key)) {
                const auto& vecOfVecs = pool.value<std::vector<std::vector<essentia::Real>>>(key);
                json framesArray = json::array();
                for (const auto& vec : vecOfVecs) {
                    // Directly push the vector - the JSON library will convert it automatically
                    framesArray.push_back(vec);
                }
                result[key] = framesArray;
                LOGI("Serialized %s with %zu frames", key.c_str(), vecOfVecs.size());
            }
            // Handle vector of reals case
            else if (pool.contains<std::vector<essentia::Real>>(key)) {
                const auto& values = pool.value<std::vector<essentia::Real>>(key);
                // Directly push the vector - the JSON library will convert it automatically
                result[key] = values;
                LOGI("Serialized %s with %zu values", key.c_str(), values.size());
            }
            // Handle single real values
            else if (pool.contains<essentia::Real>(key)) {
                result[key] = pool.value<essentia::Real>(key);
                LOGI("Serialized %s as single value", key.c_str());
            }
            // Handle strings and vectors of strings
            else if (pool.contains<std::string>(key)) {
                result[key] = pool.value<std::string>(key);
                LOGI("Serialized %s as string", key.c_str());
            }
            else if (pool.contains<std::vector<std::string>>(key)) {
                const auto& values = pool.value<std::vector<std::string>>(key);
                result[key] = values; // Direct assignment
                LOGI("Serialized %s with %zu strings", key.c_str(), values.size());
            }
            else {
                result[key] = "unsupported_type";
                LOGI("Unsupported type for %s", key.c_str());
            }
        }
        catch (const std::exception& e) {
            LOGE("Error serializing %s: %s", key.c_str(), e.what());
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

// Define the Tonnetz transformation matrix as a constant (add near the top with other constants)
const std::array<std::array<float, 12>, 6> TONNETZ_MATRIX = {{
    {1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0},
    {0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0},
    {0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0},
    {0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1},
    {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0},
    {0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1}
}};

// EssentiaWrapper class to encapsulate state
class EssentiaWrapper {
private:
    bool mIsInitialized;
    std::vector<essentia::Real> audioBuffer;
    double sampleRate;

    // Add cached computation fields
    bool spectrumComputed;
    std::vector<essentia::Real> cachedSpectrum;
    std::vector<std::vector<essentia::Real>> allSpectra; // Added to store all frame spectra

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
            allSpectra.clear();

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
        // Add parameter validation for Tonnetz algorithm
        if (algorithm == "Tonnetz") {
            // Validate frameSize
            if (params.count("frameSize")) {
                int frameSize = params.at("frameSize").toInt();
                if (frameSize <= 0) {
                    return createErrorResponse("frameSize must be positive", "INVALID_PARAM");
                }
                // Check if power of 2 for FFT efficiency
                if ((frameSize & (frameSize - 1)) != 0) {
                    return createErrorResponse("frameSize should be a power of 2 for efficient FFT", "INVALID_PARAM_WARNING");
                }
            }

            // Validate hopSize
            if (params.count("hopSize")) {
                int hopSize = params.at("hopSize").toInt();
                if (hopSize <= 0) {
                    return createErrorResponse("hopSize must be positive", "INVALID_PARAM");
                }
            }

            // Validate hpcpSize
            if (params.count("hpcpSize")) {
                int hpcpSize = params.at("hpcpSize").toInt();
                if (hpcpSize <= 0) {
                    return createErrorResponse("hpcpSize must be positive", "INVALID_PARAM");
                }
                // Common values check
                if (hpcpSize != 12 && hpcpSize != 24 && hpcpSize != 36) {
                    return createErrorResponse("hpcpSize is typically 12, 24, or 36 in music analysis", "INVALID_PARAM_WARNING");
                }
            }

            // Validate referenceFrequency
            if (params.count("referenceFrequency")) {
                float refFreq = params.at("referenceFrequency").toReal();
                if (refFreq <= 20 || refFreq >= 1000) {
                    return createErrorResponse("referenceFrequency must be between 20 Hz and 1000 Hz", "INVALID_PARAM");
                }
            }

            // Validate computeMean
            bool computeMean = false; // Default value
            if (params.count("computeMean")) {
                try {
                    computeMean = params.at("computeMean").toBool();
                } catch (const std::exception& e) {
                    return createErrorResponse("computeMean must be a boolean value", "INVALID_PARAM");
                }
            }
        }

        essentia::Pool pool;
        try {
            int frameSize = 2048;
            if (params.count("frameSize")) frameSize = params.at("frameSize").toInt();
            int hopSize = frameSize / 2;
            if (params.count("hopSize")) hopSize = params.at("hopSize").toInt();

            LOGI("Using frameSize=%d, hopSize=%d", frameSize, hopSize);
            // Filter out framewise parameter since it's not supported by all algorithms
            auto algoParams = params;
            algoParams.erase("framewise"); // Remove framewise if present

            if (algorithm == "MFCC") {
                LOGI("Processing MFCC algorithm");
                if (!spectrumComputed || allSpectra.empty()) {
                    computeSpectrum(frameSize, hopSize);
                }
                if (allSpectra.empty()) {
                    LOGE("No spectrum frames computed for MFCC");
                    return createErrorResponse("No valid spectrum frames computed", "NO_DATA");
                }

                auto mfccAlgo = essentia::standard::AlgorithmFactory::create("MFCC");
                // Filter out "framewise" from params
                auto mfccParams = params;
                mfccParams.erase("framewise");
                mfccAlgo->configure(convertToParameterMap(mfccParams));

                LOGI("Processing %zu spectrum frames through MFCC", allSpectra.size());
                std::vector<std::vector<essentia::Real>> mfccFrames;
                std::vector<std::vector<essentia::Real>> bandsFrames;
                for (const auto& spectrumFrame : allSpectra) {
                    std::vector<essentia::Real> mfcc, bands;
                    mfccAlgo->input("spectrum").set(spectrumFrame);
                    mfccAlgo->output("mfcc").set(mfcc);
                    mfccAlgo->output("bands").set(bands);
                    mfccAlgo->compute();
                    pool.add("mfcc", mfcc);
                    pool.add("mfcc_bands", bands);
                    LOGI("Added MFCC frame of size %zu", mfcc.size());
                }

                delete mfccAlgo;
            }
            else if (algorithm == "Key") {
                LOGI("Processing Key algorithm");
                if (!spectrumComputed || allSpectra.empty()) {
                    computeSpectrum(frameSize, hopSize);
                }
                if (allSpectra.empty()) {
                    LOGE("No spectrum frames computed for Key");
                    return createErrorResponse("No valid spectrum frames computed", "NO_DATA");
                }

                auto hpcpAlgo = essentia::standard::AlgorithmFactory::create("HPCP");
                auto keyAlgo = essentia::standard::AlgorithmFactory::create("Key");
                keyAlgo->configure(convertToParameterMap(params));

                // Check if we should do frame-wise processing
                bool doFrameWise = params.count("framewise") && params.at("framewise").toBool();
                LOGI("Key algorithm: framewise processing = %s", doFrameWise ? "true" : "false");

                if (doFrameWise) {
                    LOGI("Starting framewise Key processing");
                    // Process each frame individually and store results as sequences
                    std::vector<std::string> keyFrames;
                    std::vector<std::string> scaleFrames;
                    std::vector<essentia::Real> strengthFrames;

                    int frameCount = 0;
                    for (const auto& spectrumFrame : allSpectra) {
                        frameCount++;
                        LOGI("Processing Key frame %d of %zu, frame size: %zu",
                             frameCount, allSpectra.size(), spectrumFrame.size());

                        std::vector<essentia::Real> hpcp;
                        std::string key, scale;
                        essentia::Real strength;

                        hpcpAlgo->input("spectrum").set(spectrumFrame);
                        hpcpAlgo->output("hpcp").set(hpcp);
                        hpcpAlgo->compute();
                        LOGI("Computed HPCP for frame %d, hpcp size: %zu", frameCount, hpcp.size());

                        keyAlgo->input("pcp").set(hpcp);
                        keyAlgo->output("key").set(key);
                        keyAlgo->output("scale").set(scale);
                        keyAlgo->output("strength").set(strength);
                        keyAlgo->compute();
                        LOGI("Computed Key for frame %d: key=%s, scale=%s, strength=%.4f",
                             frameCount, key.c_str(), scale.c_str(), strength);

                        keyFrames.push_back(key);
                        scaleFrames.push_back(scale);
                        strengthFrames.push_back(strength);
                    }

                    pool.add("key_values", keyFrames);
                    pool.add("scale_values", scaleFrames);
                    pool.add("strength_values", strengthFrames);
                    LOGI("Added %zu key frames", keyFrames.size());
                } else {
                    // Process the average HPCP for a single result
                    std::vector<essentia::Real> averageHpcp(12, 0.0);
                    int frameCount = 0;

                    // Calculate average HPCP across frames
                    for (const auto& spectrumFrame : allSpectra) {
                        std::vector<essentia::Real> hpcp;
                        hpcpAlgo->input("spectrum").set(spectrumFrame);
                        hpcpAlgo->output("hpcp").set(hpcp);
                        hpcpAlgo->compute();

                        if (hpcp.size() >= 12) {
                            for (size_t i = 0; i < 12; ++i) {
                                averageHpcp[i] += hpcp[i];
                            }
                            frameCount++;
                        }
                    }

                    // Normalize the average
                    if (frameCount > 0) {
                        for (size_t i = 0; i < 12; ++i) {
                            averageHpcp[i] /= frameCount;
                        }
                    }

                    // Compute key on the averaged HPCP
                    std::string key, scale;
                    essentia::Real strength;
                    keyAlgo->input("pcp").set(averageHpcp);
                    keyAlgo->output("key").set(key);
                    keyAlgo->output("scale").set(scale);
                    keyAlgo->output("strength").set(strength);
                    keyAlgo->compute();

                    pool.set("key", key);
                    pool.set("scale", scale);
                    pool.set("strength", strength);
                    LOGI("Computed key: %s %s (strength: %f)", key.c_str(), scale.c_str(), strength);
                }

                delete hpcpAlgo;
                delete keyAlgo;
            }
            else if (algorithm == "Tonnetz") {
                LOGI("Processing Tonnetz algorithm");

                // Validate parameters
                if (params.count("frameSize")) {
                    int frameSize = params.at("frameSize").toInt();
                    if (frameSize <= 0) {
                        LOGE("Invalid frameSize parameter: %d", frameSize);
                        return createErrorResponse("frameSize must be positive", "INVALID_PARAM");
                    }
                    // Check if power of 2 for FFT efficiency
                    if ((frameSize & (frameSize - 1)) != 0) {
                        LOGW("frameSize should be a power of 2 for efficient FFT");
                    }
                }

                if (params.count("hopSize")) {
                    int hopSize = params.at("hopSize").toInt();
                    if (hopSize <= 0) {
                        LOGE("Invalid hopSize parameter: %d", hopSize);
                        return createErrorResponse("hopSize must be positive", "INVALID_PARAM");
                    }
                }

                // Check if spectrum is computed; if not, compute it
                if (!spectrumComputed || allSpectra.empty()) {
                    computeSpectrum(frameSize, hopSize);
                    if (allSpectra.empty()) {
                        LOGE("No spectrum frames computed for Tonnetz");
                        return createErrorResponse("No valid spectrum frames computed from audio data", "NO_DATA");
                    }
                }

                // Create SpectralPeaks algorithm
                auto spectralPeaksAlgo = essentia::standard::AlgorithmFactory::create("SpectralPeaks");
                spectralPeaksAlgo->configure(
                    "sampleRate", static_cast<float>(sampleRate),
                    "maxPeaks", 100,              // Limit the number of peaks
                    "magnitudeThreshold", 0.0f    // Minimum magnitude threshold
                );

                // Create HPCP algorithm
                auto hpcpAlgo = essentia::standard::AlgorithmFactory::create("HPCP");
                essentia::ParameterMap hpcpParams;
                hpcpParams.add("size", 12); // Fixed size for Tonnetz (12 pitch classes)
                hpcpParams.add("referenceFrequency", params.count("referenceFrequency") ?
                       params.at("referenceFrequency").toReal() : 440.0f);
                hpcpAlgo->configure(hpcpParams);

                LOGI("Processing %zu spectrum frames through Tonnetz", allSpectra.size());

                // Process each spectrum frame
                for (const auto& spectrumFrame : allSpectra) {
                    // Compute spectral peaks
                    std::vector<essentia::Real> frequencies, magnitudes;
                    spectralPeaksAlgo->input("spectrum").set(spectrumFrame);
                    spectralPeaksAlgo->output("frequencies").set(frequencies);
                    spectralPeaksAlgo->output("magnitudes").set(magnitudes);
                    spectralPeaksAlgo->compute();

                    // Compute HPCP from peaks
                    std::vector<essentia::Real> hpcp;
                    hpcpAlgo->input("frequencies").set(frequencies);
                    hpcpAlgo->input("magnitudes").set(magnitudes);
                    hpcpAlgo->output("hpcp").set(hpcp);
                    hpcpAlgo->compute();

                    // Normalize HPCP (optional but recommended)
                    essentia::normalize(hpcp);

                    // Apply Tonnetz transformation
                    std::vector<essentia::Real> tonnetz = applyTonnetzTransform(hpcp);
                    pool.add("tonnetz", tonnetz);
                    LOGI("Added Tonnetz frame of size %zu", tonnetz.size());
                }

                // Compute mean if requested
                bool computeMean = params.count("computeMean") && params.at("computeMean").toBool();
                if (computeMean) {
                    try {
                        const auto& tonnetzFrames = pool.value<std::vector<std::vector<essentia::Real>>>("tonnetz");
                        if (!tonnetzFrames.empty()) {
                            size_t frameSize = tonnetzFrames[0].size();
                            std::vector<essentia::Real> meanTonnetz(frameSize, 0.0);

                            for (const auto& frame : tonnetzFrames) {
                                for (size_t i = 0; i < frameSize; ++i) {
                                    meanTonnetz[i] += frame[i];
                                }
                            }

                            for (auto& val : meanTonnetz) {
                                val /= tonnetzFrames.size();
                            }

                            pool.set("tonnetz_mean", meanTonnetz);
                            LOGI("Computed mean Tonnetz values");
                        } else {
                            LOGW("No Tonnetz frames available to compute mean");
                        }
                    } catch (const std::exception& e) {
                        LOGW("Could not compute mean Tonnetz: %s", e.what());
                        // Continue execution, this is not a fatal error
                    }
                }

                // Clean up
                delete spectralPeaksAlgo;
                delete hpcpAlgo;
            }
            else if (algorithm == "Spectrum") {
                LOGI("Processing Spectrum algorithm");
                if (!spectrumComputed || allSpectra.empty()) {
                    computeSpectrum(frameSize, hopSize);
                }
                if (allSpectra.empty()) {
                    LOGE("No spectrum frames computed for Spectrum");
                    return createErrorResponse("No valid spectrum frames computed", "NO_DATA");
                }

                for (const auto& spectrumFrame : allSpectra) {
                    pool.add("spectrum", spectrumFrame);
                    LOGI("Added spectrum frame of size %zu", spectrumFrame.size());
                }
            }
            else if (algorithm == "HPCP") {
                LOGI("Processing HPCP algorithm");
                if (!spectrumComputed || allSpectra.empty()) {
                    computeSpectrum(frameSize, hopSize);
                }
                if (allSpectra.empty()) {
                    LOGE("No spectrum frames computed for HPCP");
                    return createErrorResponse("No valid spectrum frames computed", "NO_DATA");
                }

                // Create SpectralPeaks algorithm for better HPCP computation
                auto spectralPeaksAlgo = essentia::standard::AlgorithmFactory::create("SpectralPeaks");
                spectralPeaksAlgo->configure(
                    "sampleRate", static_cast<float>(sampleRate),
                    "maxPeaks", params.count("maxPeaks") ? params.at("maxPeaks").toInt() : 100,
                    "magnitudeThreshold", params.count("magnitudeThreshold") ?
                        params.at("magnitudeThreshold").toReal() : 0.0f
                );

                // Create HPCP algorithm
                auto hpcpAlgo = essentia::standard::AlgorithmFactory::create("HPCP");
                essentia::ParameterMap hpcpParams;
                hpcpParams.add("size", params.count("size") ? params.at("size").toInt() : 12);
                hpcpParams.add("referenceFrequency", params.count("referenceFrequency") ?
                    params.at("referenceFrequency").toReal() : 440.0f);
                hpcpParams.add("harmonics", params.count("harmonics") ? params.at("harmonics").toInt() : 8);
                hpcpAlgo->configure(hpcpParams);

                LOGI("Processing %zu spectrum frames through HPCP", allSpectra.size());

                // Process each spectrum frame
                for (const auto& spectrumFrame : allSpectra) {
                    // Compute spectral peaks
                    std::vector<essentia::Real> frequencies, magnitudes;
                    spectralPeaksAlgo->input("spectrum").set(spectrumFrame);
                    spectralPeaksAlgo->output("frequencies").set(frequencies);
                    spectralPeaksAlgo->output("magnitudes").set(magnitudes);
                    spectralPeaksAlgo->compute();

                    // Compute HPCP from peaks
                    std::vector<essentia::Real> hpcp;
                    hpcpAlgo->input("frequencies").set(frequencies);
                    hpcpAlgo->input("magnitudes").set(magnitudes);
                    hpcpAlgo->output("hpcp").set(hpcp);
                    hpcpAlgo->compute();

                    pool.add("hpcp", hpcp);
                    LOGI("Added HPCP frame of size %zu", hpcp.size());
                }

                // Compute mean if requested
                bool computeMean = params.count("computeMean") && params.at("computeMean").toBool();
                if (computeMean) {
                    try {
                        const auto& hpcpFrames = pool.value<std::vector<std::vector<essentia::Real>>>("hpcp");
                        if (!hpcpFrames.empty()) {
                            size_t frameSize = hpcpFrames[0].size();
                            std::vector<essentia::Real> meanHpcp(frameSize, 0.0);

                            for (const auto& frame : hpcpFrames) {
                                for (size_t i = 0; i < frameSize; ++i) {
                                    meanHpcp[i] += frame[i];
                                }
                            }

                            for (auto& val : meanHpcp) {
                                val /= hpcpFrames.size();
                            }

                            pool.set("hpcp_mean", meanHpcp);
                            LOGI("Computed mean HPCP values");
                        } else {
                            LOGW("No HPCP frames available to compute mean");
                        }
                    } catch (const std::exception& e) {
                        LOGW("Could not compute mean HPCP: %s", e.what());
                        // Continue execution, this is not a fatal error
                    }
                }

                // Clean up
                delete spectralPeaksAlgo;
                delete hpcpAlgo;
            }
            else {
                // Fall back to dynamic algorithm handling for any other algorithm
                LOGI("Falling back to dynamic algorithm for %s", algorithm.c_str());
                return executeDynamicAlgorithm(algorithm, params);
            }

            // Convert the pool to JSON and wrap in success format
            std::string dataJson = poolToJson(pool);
            return "{\"success\":true,\"data\":" + dataJson + "}";
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
    void computeSpectrum(int frameSize, int hopSize) {
        LOGI("computeSpectrum called with frameSize=%d, hopSize=%d", frameSize, hopSize);

        if (audioBuffer.empty()) {
            LOGE("Audio buffer is empty, cannot compute spectrum");
            return;
        }

        LOGI("Audio buffer size: %zu, sample rate: %.1f", audioBuffer.size(), sampleRate);

        essentia::standard::Algorithm* frameCutter = essentia::standard::AlgorithmFactory::create(
            "FrameCutter", "frameSize", frameSize, "hopSize", hopSize);
        essentia::standard::Algorithm* windowing = essentia::standard::AlgorithmFactory::create(
            "Windowing", "type", "hann");
        essentia::standard::Algorithm* spectrum = essentia::standard::AlgorithmFactory::create("Spectrum");

        LOGI("Created algorithms: FrameCutter, Windowing, Spectrum");

        std::vector<essentia::Real> frame, windowedFrame, spectrumFrame;
        frameCutter->input("signal").set(audioBuffer);
        frameCutter->output("frame").set(frame);
        windowing->input("frame").set(frame);
        windowing->output("frame").set(windowedFrame);
        spectrum->input("frame").set(windowedFrame);
        spectrum->output("spectrum").set(spectrumFrame);

        LOGI("Connected algorithm inputs/outputs");
        allSpectra.clear();
        LOGI("Cleared previous spectrum data");

        int frameCount = 0;
        while (true) {
            frameCutter->compute();
            if (frame.empty()) {
                LOGI("No more frames to process, breaking loop");
                break;
            }

            frameCount++;
            LOGI("Processing frame %d, size: %zu", frameCount, frame.size());

            windowing->compute();
            LOGI("Applied windowing, windowed frame size: %zu", windowedFrame.size());

            spectrum->compute();
            LOGI("Computed spectrum, frame size: %zu", spectrumFrame.size());

            allSpectra.push_back(spectrumFrame);
        }

        LOGI("Processed total of %d frames, allSpectra size: %zu", frameCount, allSpectra.size());

        // Keep the last spectrum for backward compatibility
        if (!allSpectra.empty()) {
            cachedSpectrum = allSpectra.back();
            spectrumComputed = true;
            LOGI("Spectrum computation successful, cached last spectrum of size %zu", cachedSpectrum.size());
        } else {
            spectrumComputed = false;
            LOGE("No spectrum frames were computed, marking spectrumComputed=false");
        }

        delete frameCutter;
        delete windowing;
        delete spectrum;
        LOGI("Cleaned up algorithm resources");
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
        allSpectra.clear();

        essentia::Pool pool;

        try {
            // Parse the feature configurations
            json featureConfigs = json::parse(featuresJson);
            if (!featureConfigs.is_array()) {
                return createErrorResponse("Features must be an array of configurations", "INVALID_FORMAT");
            }

            // Determine maximum required frame size
            int maxFrameSize = 2048; // Default to a larger size
            for (const auto& config : featureConfigs) {
                std::string name = config["name"];
                if ((name == "MelBands" || name == "MFCC") && config.contains("params")) {
                    int nb = 40; // Default
                    if (config["params"].contains("numberBands")) {
                        nb = config["params"]["numberBands"];
                    }
                    int requiredFrameSize = (nb <= 40) ? 1024 : 2048;
                    maxFrameSize = std::max(maxFrameSize, requiredFrameSize);
                }
            }

            // Compute spectrum with appropriate size (only once)
            computeSpectrum(maxFrameSize, maxFrameSize / 2);

            // Process each feature configuration
            for (const auto& config : featureConfigs) {
                // Extract feature name
                if (!config.contains("name") || !config["name"].is_string()) {
                    return createErrorResponse("Feature configuration missing 'name' field", "INVALID_FORMAT");
                }

                std::string name = config["name"].get<std::string>();
                LOGI("Processing feature: %s", name.c_str());

                // Extract parameters and set framewise to true by default
                std::map<std::string, essentia::Parameter> params;
                if (config.contains("params") && config["params"].is_object()) {
                    std::string paramsJson = config["params"].dump();
                    params = jsonToParamsMap(paramsJson);
                }

                // Always use framewise for spectral features unless explicitly disabled
                if (name == "MFCC" || name == "MelBands" || name == "Chroma" ||
                    name == "SpectralCentroid" || name == "SpectralContrast") {
                    if (!params.count("framewise")) {
                        params.insert(std::make_pair("framewise", essentia::Parameter(true)));
                    }
                }

                // Execute the specific algorithm
                std::string result = executeSpecificAlgorithm(name, params);

                // Parse the result
                json resultJson;
                try {
                    resultJson = json::parse(result);
                } catch (const json::exception& e) {
                    return createErrorResponse("Error parsing algorithm result: " + std::string(e.what()), "PARSING_ERROR", result);
                }

                // Check for errors
                if (!resultJson.contains("success") || !resultJson["success"].get<bool>()) {
                    return result; // Propagate the error response
                }

                // Add algorithm results to the pool
                if (resultJson.contains("data") && resultJson["data"].is_object()) {
                    for (auto it = resultJson["data"].items().begin(); it != resultJson["data"].items().end(); ++it) {
                        const auto& key = it.key();
                        auto& value = it.value();
                        // Add to the pool using appropriate key
                        if (value.is_array()) {
                            if (!value.empty() && value[0].is_array()) {
                                // Handle frame-wise data (array of arrays)
                                std::vector<std::vector<essentia::Real>> framesData;
                                for (const auto& frame : value) {
                                    std::vector<essentia::Real> frameData;
                                    for (const auto& item : frame) {
                                        if (item.is_number()) {
                                            double val = item.get<double>();
                                            frameData.push_back(std::isfinite(val) ? val : 0.0);
                                        }
                                    }
                                    framesData.push_back(frameData);
                                }
                                for (const auto& frame : framesData) {
                                    pool.add(key, frame);
                                }
                            } else {
                                // Handle single vector data
                                std::vector<essentia::Real> vec;
                                for (const auto& item : value) {
                                    if (item.is_number()) {
                                        double val = item.get<double>();
                                        vec.push_back(std::isfinite(val) ? val : 0.0);
                                    }
                                }
                                pool.set(key, vec);
                            }
                        }
                        else if (value.is_string()) {
                            pool.set(key, value.get<std::string>());
                        }
                        else if (value.is_number()) {
                            double val = value.get<double>();
                            pool.set(key, std::isfinite(val) ? val : 0.0);
                        }
                        else if (value.is_boolean()) {
                            pool.set(key, value.get<bool>());
                        }
                    }
                }
            }

            // Convert the pool to JSON and return success
            std::string resultJson = poolToJson(pool);
            return "{\"success\":true,\"data\":" + resultJson + "}";
        }
        catch (const json::exception& e) {
            return createErrorResponse("Error parsing feature configuration: " + std::string(e.what()), "JSON_PARSE_ERROR");
        }
        catch (const std::exception& e) {
            return createErrorResponse("Error extracting features: " + std::string(e.what()), "EXTRACTION_ERROR", e.what());
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
        {"RMS", "rms"},
        {"Windowing", "frame"},
        {"ZeroCrossingRate", "zeroCrossingRate"},
        {"PitchYinFFT", "pitch"},
        {"RollOff", "rollOff"},
        {"BarkBands", "bands"},
        {"BeatTrackerDegara", "ticks"},
        {"BeatTrackerMultiFeature", "ticks"},
        {"BeatsLoudness", "loudness"},
        {"BinaryOperator", "array"},
        {"BpmHistogram", "bpm"},
        {"CentralMoments", "centralMoments"},
        {"ChordsDetection", "chords"},
        {"DCT", "dct"},
        {"Envelope", "envelope"},
        {"ERBBands", "bands"},
        {"Flux", "flux"},
        {"FrameCutter", "frame"},
        {"FrequencyBands", "bands"},
        {"GFCC", "gfcc"},
        {"HFC", "hfc"},
        {"HPCP", "hpcp"},
        {"PitchYin", "pitch"},
        {"PowerSpectrum", "spectrum"},
        {"SpectralPeaks", "frequencies"}
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
                std::vector<bool> featureUseVariance; // Add this to track variance requests

                for (const auto& feature : config["features"]) {
                    std::string name = feature["name"].get<std::string>();

                    if (name == "Tonnetz") {
                        // Skip trying to create the Tonnetz algorithm using the factory
                        // We'll handle it manually in the processing loop

                        if (!feature.contains("input")) {
                            // Clean up resources
                            for (auto* algo : preprocessAlgos) delete algo;
                            for (auto* algo : featureAlgos) delete algo;
                            return createErrorResponse(std::string("Feature '") + name + "' is missing required 'input' field", "INVALID_CONFIG");
                        }

                        std::string inputName = feature["input"].get<std::string>();

                        // Add to tracking arrays to maintain index alignment
                        featureAlgos.push_back(nullptr); // No algorithm for Tonnetz
                        featureOutputs.push_back(std::vector<essentia::Real>());
                        featureNames.push_back(name);
                        featureInputs.push_back(inputName);
                        featureOutputNames.push_back("tonnetz");

                        // Check for post-processing options
                        bool useMean = false;
                        bool useVariance = false;
                        if (feature.contains("postProcess")) {
                            if (feature["postProcess"].contains("mean")) {
                                useMean = feature["postProcess"]["mean"].get<bool>();
                            }
                            if (feature["postProcess"].contains("variance")) {
                                useVariance = feature["postProcess"]["variance"].get<bool>();
                            }
                        }
                        featureUseMean.push_back(useMean);
                        featureUseVariance.push_back(useVariance);

                        continue;
                    }

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

                        // Check if we should compute mean and variance for this feature
                        bool useMean = false;
                        bool useVariance = false;
                        if (feature.contains("postProcess")) {
                            if (feature["postProcess"].contains("mean")) {
                                useMean = feature["postProcess"]["mean"].get<bool>();
                            }
                            if (feature["postProcess"].contains("variance")) {
                                useVariance = feature["postProcess"]["variance"].get<bool>();
                            }
                        }
                        featureUseMean.push_back(useMean);
                        featureUseVariance.push_back(useVariance);
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
                    // Reset frame for next input
                    frame.clear();

                    // Extract frame
                    frameCutter->compute();
                    if (frame.empty()) break; // No more frames

                    frameCount++;

                    LOGI("Extracted frame %d with size: %zu", frameCount, frame.size());

                    // Clear the pool for this frame iteration to ensure a clean slate
                    framePool.clear();

                    // Add the frame to the pool with the name "frame"
                    if (!frame.empty()) {
                        framePool.set("frame", frame);
                        LOGI("Added frame to pool with name 'frame' (size: %zu)", frame.size());
                    }

                    // Apply preprocessing steps
                    if (!preprocessAlgos.empty()) {
                        // Directly set the frame as input to the first preprocessing algorithm
                        auto* firstAlgo = preprocessAlgos[0]; // Windowing
                        std::vector<essentia::Real>& firstOutput = preprocessOutputs[0];

                        // Connect the frame directly to the first algorithm
                        firstAlgo->input("frame").set(frame);
                        firstAlgo->output(primaryOutputs.count(preprocessOutputNames[0]) ?
                                       primaryOutputs.at(preprocessOutputNames[0]) :
                                       preprocessOutputNames[0]).set(firstOutput);

                        // Compute the first algorithm
                        firstAlgo->compute();

                        // Use set instead of add for storing the output in the pool
                        framePool.set(preprocessOutputNames[0], firstOutput);

                        LOGI("Processed first preprocessing step '%s' directly from frame (output size: %zu)",
                             preprocessOutputNames[0].c_str(), firstOutput.size());

                        // Process remaining preprocessing steps (starting from index 1)
                        for (size_t i = 1; i < preprocessAlgos.size(); ++i) {
                            auto* algo = preprocessAlgos[i]; // Spectrum
                            std::string inputName = preprocessOutputNames[i-1]; // "Windowing"
                            std::vector<essentia::Real>& output = preprocessOutputs[i];

                            // Check if the input key exists in the pool
                            auto descriptors = framePool.descriptorNames();
                            if (std::find(descriptors.begin(), descriptors.end(), inputName) == descriptors.end()) {
                                LOGE("Input '%s' not found in pool for preprocessing step %zu",
                                     inputName.c_str(), i);
                                // Clean up resources
                                for (auto* algo : preprocessAlgos) delete algo;
                                for (auto* algo : featureAlgos) delete algo;
                                return createErrorResponse("Input '" + inputName + "' not found in pool", "POOL_ERROR");
                            }

                            // Retrieve the input from the pool
                            const auto& input = framePool.value<std::vector<essentia::Real>>(inputName);
                            LOGI("Using input '%s' (size: %zu) for preprocessing step %zu",
                                 inputName.c_str(), input.size(), i);

                            // Find the correct input port name for the algorithm
                            std::string inputPortName = "frame";
                            if (inputName == "Spectrum" || inputName == "spectrum") {
                                inputPortName = "spectrum";
                            }

                            algo->input(inputPortName).set(input);
                            algo->output(primaryOutputs.count(preprocessOutputNames[i]) ?
                                       primaryOutputs.at(preprocessOutputNames[i]) :
                                       preprocessOutputNames[i]).set(output);

                            // Compute algorithm
                            algo->compute();

                            // Use set instead of add for storing the result in the pool
                            framePool.set(preprocessOutputNames[i], output);
                            LOGI("Set '%s' in pool (size: %zu)",
                                 preprocessOutputNames[i].c_str(), output.size());
                        }
                    }
                    else if (featureAlgos.size() > 0) {
                        // If there are no preprocessing steps but we have feature algorithms,
                        // add the frame directly to the pool for feature extraction
                        framePool.add("frame", frame);
                        LOGI("No preprocessing steps, added frame directly to pool for feature extraction");
                    }

                    // Compute features
                    for (size_t i = 0; i < featureAlgos.size(); ++i) {
                        auto* algo = featureAlgos[i];
                        std::string inputName = featureInputs[i];
                        std::string featureName = featureNames[i];
                        std::string outputName = featureOutputNames[i];

                        // Add special case for Tonnetz
                        if (featureName == "Tonnetz") {
                            // Check if the specified input exists in the pool
                            if (!framePool.contains<std::vector<essentia::Real>>(inputName)) {
                                LOGE("Input '%s' not found in pool for Tonnetz", inputName.c_str());
                                continue;
                            }

                            const auto& hpcp = framePool.value<std::vector<essentia::Real>>(inputName);

                            // Validate HPCP size (must be 12 for Tonnetz)
                            if (hpcp.size() != 12) {
                                LOGE("Input '%s' vector must be 12-dimensional for Tonnetz, got %zu",
                                     inputName.c_str(), hpcp.size());
                                continue;
                            }

                            // Apply Tonnetz transformation
                            std::vector<essentia::Real> tonnetz = applyTonnetzTransform(hpcp);

                            // Store in feature collectors
                            if (featureCollectors.find("Tonnetz") == featureCollectors.end()) {
                                featureCollectors["Tonnetz"] = std::vector<std::vector<essentia::Real>>();
                            }
                            featureCollectors["Tonnetz"].push_back(tonnetz);

                            LOGI("Computed Tonnetz from input '%s' (size: %zu) with result size: %zu",
                                 inputName.c_str(), hpcp.size(), tonnetz.size());

                            // Skip the rest of the processing for this feature
                            continue;
                        }

                        // Special case: if the input is "frame" and we have no preprocessing steps,
                        // use the frame directly
                        if (inputName == "frame" && preprocessAlgos.empty()) {
                            LOGI("Using frame directly for feature '%s'", featureNames[i].c_str());
                            algo->input("frame").set(frame);
                        }
                        else {
                            // Get the correct input data from the pool
                            if (!framePool.contains<std::vector<essentia::Real>>(inputName)) {
                                LOGW("Input '%s' for feature '%s' not found in pool, skipping",
                                     inputName.c_str(), featureNames[i].c_str());
                                continue;
                            }

                            // Connect input and output
                            const std::vector<essentia::Real>& input = framePool.value<std::vector<essentia::Real>>(inputName);
                            LOGI("Using input '%s' (size: %zu) for feature '%s'",
                                 inputName.c_str(), input.size(), featureNames[i].c_str());

                            // Dynamically determine the input port name
                            std::string inputPortName;
                            auto inputs = algo->inputs();

                            // Check if the algorithm has a "spectrum" input and the input is from Spectrum
                            bool hasSpectrumInput = false;
                            for (const auto& input : inputs) {
                                if (input.first == "spectrum") {
                                    hasSpectrumInput = true;
                                    break;
                                }
                            }

                            if (hasSpectrumInput && (inputName == "Spectrum" || inputName == "spectrum")) {
                                inputPortName = "spectrum";
                            }
                            // Check for other common input names
                            else {
                                bool hasArrayInput = false;
                                bool hasSignalInput = false;

                                for (const auto& input : inputs) {
                                    if (input.first == "array") {
                                        hasArrayInput = true;
                                    }
                                    else if (input.first == "signal") {
                                        hasSignalInput = true;
                                    }
                                }

                                if (hasArrayInput) {
                                    inputPortName = "array";
                                }
                                else if (hasSignalInput) {
                                    inputPortName = "signal";
                                }
                                else if (!inputs.empty()) {
                                    // Use the first available input name as fallback
                                    inputPortName = inputs.begin()->first;
                                }
                                else {
                                    LOGE("Algorithm '%s' has no inputs", featureName.c_str());
                                    // Clean up resources
                                    for (auto* algo : preprocessAlgos) delete algo;
                                    for (auto* algo : featureAlgos) delete algo;
                                    return createErrorResponse(std::string("Algorithm '") + featureName +
                                                              "' has no inputs", "ALGORITHM_ERROR");
                                }
                            }

                            LOGI("Using input port '%s' for algorithm '%s'",
                                 inputPortName.c_str(), featureName.c_str());
                            algo->input(inputPortName).set(input);
                        }

                        // Special handling for PitchYinFFT algorithm which has two outputs that must be bound
                        if (featureName == "PitchYinFFT") {
                            // Declare variables for both outputs
                            essentia::Real pitchOutput;
                            essentia::Real confidenceOutput;

                            // Bind both outputs
                            algo->output("pitch").set(pitchOutput);
                            algo->output("pitchConfidence").set(confidenceOutput);

                            // Compute algorithm
                            algo->compute();

                            // Store both outputs in the collectors
                            if (featureCollectors.find(featureName) == featureCollectors.end()) {
                                featureCollectors[featureName] = std::vector<std::vector<essentia::Real>>();
                            }
                            // Store pitch and confidence as a vector for each frame
                            featureCollectors[featureName].push_back({pitchOutput, confidenceOutput});

                            LOGI("Added feature '%s' output (pitch: %f, confidence: %f) to collectors",
                                 featureName.c_str(), pitchOutput, confidenceOutput);

                            // Skip the standard output processing
                            continue;
                        }

                        // Determine the output type
                        const essentia::standard::OutputBase& outputBase = algo->output(outputName);
                        std::string outputType = outputBase.typeInfo().name();

                        LOGI("Output type for feature '%s': %s", featureName.c_str(), outputType.c_str());

                        if (outputType.find("vector") != std::string::npos) {
                            // Vector output (e.g., MelBands)
                            if (featureName == "MFCC") {
                                // Special handling for MFCC which has two outputs
                                std::vector<essentia::Real> mfccOutput;
                                std::vector<essentia::Real> bandsOutput;

                                // Set both outputs
                                algo->output("mfcc").set(mfccOutput);
                                algo->output("bands").set(bandsOutput);

                                // Compute algorithm
                                algo->compute();

                                // Store both outputs in the collectors
                                if (featureCollectors.find(featureName) == featureCollectors.end()) {
                                    featureCollectors[featureName] = std::vector<std::vector<essentia::Real>>();
                                }
                                featureCollectors[featureName].push_back(mfccOutput);

                                // Also store the bands output with a different key
                                if (featureCollectors.find(featureName + "_bands") == featureCollectors.end()) {
                                    featureCollectors[featureName + "_bands"] = std::vector<std::vector<essentia::Real>>();
                                }
                                featureCollectors[featureName + "_bands"].push_back(bandsOutput);

                                LOGI("Added feature '%s' output (size: %zu) and bands (size: %zu) to collectors",
                                     featureName.c_str(), mfccOutput.size(), bandsOutput.size());
                            }
                            else if (featureName == "SpectralContrast") {
                                // Special handling for SpectralContrast which also has two outputs
                                std::vector<essentia::Real> contrastOutput;
                                std::vector<essentia::Real> valleyOutput;

                                // Set both outputs
                                algo->output("spectralContrast").set(contrastOutput);
                                algo->output("spectralValley").set(valleyOutput);

                                // Compute algorithm
                                algo->compute();

                                // Store both outputs in the collectors
                                if (featureCollectors.find(featureName) == featureCollectors.end()) {
                                    featureCollectors[featureName] = std::vector<std::vector<essentia::Real>>();
                                }
                                featureCollectors[featureName].push_back(contrastOutput);

                                // Also store the valley output with a different key
                                if (featureCollectors.find(featureName + "_valley") == featureCollectors.end()) {
                                    featureCollectors[featureName + "_valley"] = std::vector<std::vector<essentia::Real>>();
                                }
                                featureCollectors[featureName + "_valley"].push_back(valleyOutput);

                                LOGI("Added feature '%s' output (size: %zu) and valley (size: %zu) to collectors",
                                     featureName.c_str(), contrastOutput.size(), valleyOutput.size());
                            }
                            else {
                                // Standard vector output
                                std::vector<essentia::Real> vectorOutput;
                                algo->output(outputName).set(vectorOutput);
                                algo->compute();

                                // Store vector output
                                if (featureCollectors.find(featureName) == featureCollectors.end()) {
                                    featureCollectors[featureName] = std::vector<std::vector<essentia::Real>>();
                                }
                                featureCollectors[featureName].push_back(vectorOutput);
                                LOGI("Added vector feature '%s' output (size: %zu) to collectors",
                                     featureName.c_str(), vectorOutput.size());
                            }
                        }
                        else if (outputType.find("Real") != std::string::npos || outputType == "f") {
                            // Scalar output (e.g., Centroid)
                            essentia::Real scalarOutput;
                            algo->output(outputName).set(scalarOutput);
                            algo->compute();

                            // Store scalar output for this frame
                            if (featureCollectors.find(featureName) == featureCollectors.end()) {
                                featureCollectors[featureName] = std::vector<std::vector<essentia::Real>>();
                            }
                            // Wrap scalar in a vector for consistency
                            featureCollectors[featureName].push_back({scalarOutput});
                            LOGI("Added scalar feature '%s' output: %f to collectors",
                                 featureName.c_str(), scalarOutput);
                        }
                        else {
                            LOGE("Unsupported output type for feature '%s': %s",
                                 featureName.c_str(), outputType.c_str());
                            continue; // Skip unsupported types
                        }
                    }
                }

                // Process feature data
                for (size_t i = 0; i < featureNames.size(); ++i) {
                    const std::string& name = featureNames[i];
                    const auto& outputs = featureCollectors[name];

                    // Skip features that weren't computed successfully
                    if (outputs.empty()) continue;

                    size_t numFrames = outputs.size();
                    size_t featureSize = outputs[0].size();

                    if (featureSize == 1) {
                        // Scalar feature (e.g., Centroid, ZeroCrossingRate)
                        std::vector<essentia::Real> allValues;
                        for (const auto& frameOutput : outputs) {
                            allValues.push_back(frameOutput[0]); // Extract the scalar value
                        }

                        if (featureUseMean[i]) {
                            // Compute scalar mean
                            essentia::Real mean = 0.0;
                            for (const auto& val : allValues) {
                                mean += val;
                            }
                            mean /= allValues.size();

                            finalPool.set(name + ".mean", mean); // Store as a single Real value
                            LOGI("Stored scalar mean for '%s': %f", name.c_str(), mean);
                        }

                        if (featureUseVariance[i]) {
                            // Compute scalar variance
                            essentia::Real mean = 0.0;
                            for (const auto& val : allValues) {
                                mean += val;
                            }
                            mean /= allValues.size();

                            essentia::Real variance = 0.0;
                            for (const auto& val : allValues) {
                                essentia::Real diff = val - mean;
                                variance += diff * diff;
                            }
                            variance /= allValues.size();

                            finalPool.set(name + ".variance", variance); // Store as a single Real value
                            LOGI("Stored scalar variance for '%s': %f", name.c_str(), variance);
                        }
                    } else {
                        // Vector feature (e.g., MFCC, MelBands)
                        // Compute mean
                        std::vector<essentia::Real> mean(featureSize, 0.0);
                        if (featureUseMean[i] || featureUseVariance[i]) { // Mean is needed for variance too
                            for (const auto& frameOutput : outputs) {
                                for (size_t j = 0; j < featureSize; ++j) {
                                    mean[j] += frameOutput[j];
                                }
                            }
                            for (auto& val : mean) {
                                val /= numFrames;
                            }
                            if (featureUseMean[i]) {
                                // Fix: use set instead of add for vector means
                                finalPool.set(name + ".mean", mean);
                                LOGI("Stored vector mean for '%s' (size: %zu)", name.c_str(), mean.size());
                            }
                        }

                        // Compute variance
                        if (featureUseVariance[i]) {
                            std::vector<essentia::Real> variance(featureSize, 0.0);
                            for (const auto& frameOutput : outputs) {
                                for (size_t j = 0; j < featureSize; ++j) {
                                    essentia::Real diff = frameOutput[j] - mean[j];
                                    variance[j] += diff * diff;
                                }
                            }
                            for (auto& val : variance) {
                                val /= numFrames;
                            }
                            // Fix: use set instead of add for vector variance
                            finalPool.set(name + ".variance", variance);
                            LOGI("Stored vector variance for '%s' (size: %zu)", name.c_str(), variance.size());
                        }
                    }

                    // If neither mean nor variance is requested, store raw frame data
                    if (!featureUseMean[i] && !featureUseVariance[i]) {
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

                    // Concatenate all feature vectors and scalars
                    std::vector<essentia::Real> concatenated;
                    for (const auto& descName : finalPool.descriptorNames()) {
                        if (finalPool.contains<std::vector<essentia::Real>>(descName)) {
                            // Vector descriptor
                            const auto& values = finalPool.value<std::vector<essentia::Real>>(descName);
                            concatenated.insert(concatenated.end(), values.begin(), values.end());
                            LOGI("Concatenated vector '%s' (size: %zu)", descName.c_str(), values.size());
                        } else if (finalPool.contains<essentia::Real>(descName)) {
                            // Scalar descriptor
                            essentia::Real value = finalPool.value<essentia::Real>(descName);
                            concatenated.push_back(value);
                            LOGI("Concatenated scalar '%s' (value: %f)", descName.c_str(), value);
                        } else {
                            // Skip unsupported types
                            LOGW("Ignoring descriptor '%s' of unsupported type for concatenation", descName.c_str());
                        }
                    }

                    finalPool.add("concatenatedFeatures", concatenated);
                    LOGI("Stored concatenatedFeatures (total size: %zu)", concatenated.size());
                }

                // Add more post-processing options as needed
            }

            // Convert the pool to JSON
            json result;
            for (const auto& descName : finalPool.descriptorNames()) {
                try {
                    // Check if this is a scalar (Real) value first
                    if (finalPool.contains<essentia::Real>(descName)) {
                        // For scalar values, directly store in the result
                        result[descName] = finalPool.value<essentia::Real>(descName);
                        LOGI("Added scalar value '%s' to result", descName.c_str());
                    }
                    // If not scalar, try vector type
                    else if (finalPool.contains<std::vector<essentia::Real>>(descName)) {
                        const auto& values = finalPool.value<std::vector<essentia::Real>>(descName);
                        result[descName] = values;
                        LOGI("Added vector '%s' to result (size: %zu)", descName.c_str(), values.size());
                    }
                    // Handle other types (strings, etc.) if needed
                    else if (finalPool.contains<std::string>(descName)) {
                        result[descName] = finalPool.value<std::string>(descName);
                        LOGI("Added string '%s' to result", descName.c_str());
                    }
                    else {
                        LOGW("Unknown type for descriptor '%s', skipping", descName.c_str());
                    }
                } catch (const std::exception& e) {
                    LOGW("Failed to convert descriptor '%s' to JSON: %s", descName.c_str(), e.what());
                    // Skip descriptors that can't be converted
                }
            }

            // Convert the pool to JSON and wrap in success format
            std::string dataJson = poolToJson(finalPool);
            return "{\"success\":true,\"data\":" + dataJson + "}";
        }
        catch (const std::exception& e) {
            std::string errorMsg = std::string("Error executing pipeline: ") + e.what();
            LOGE("%s", errorMsg.c_str());
            return createErrorResponse(errorMsg, "PIPELINE_EXECUTION_ERROR");
        }
    }

    // Add this new method to the EssentiaWrapper class
    std::string applyTonnetzTransform(const std::string& hpcpJson) {
        if (!isInitialized()) {
            return createErrorResponse("Essentia not initialized", "ESSENTIA_NOT_INITIALIZED");
        }

        try {
            // Parse the input JSON
            json input = json::parse(hpcpJson);

            // Check if we have a single HPCP vector or multiple frames
            bool isSingleVector = input.is_array() && !input.empty() && !input[0].is_array();

            if (isSingleVector) {
                // Process a single HPCP vector
                std::vector<essentia::Real> hpcp = input.get<std::vector<essentia::Real>>();
                if (hpcp.size() != 12) {
                    return createErrorResponse("HPCP vector must be 12-dimensional", "INVALID_INPUT_SIZE");
                }

                // Apply Tonnetz transformation
                std::vector<essentia::Real> tonnetz = applyTonnetzTransform(hpcp);

                // Return the result as JSON
                json result = tonnetz;
                return result.dump();
            } else {
                // Process multiple HPCP frames
                std::vector<std::vector<essentia::Real>> hpcpFrames = input.get<std::vector<std::vector<essentia::Real>>>();
                std::vector<std::vector<essentia::Real>> tonnetzFrames;

                for (const auto& hpcp : hpcpFrames) {
                    if (hpcp.size() != 12) {
                        return createErrorResponse("Each HPCP vector must be 12-dimensional", "INVALID_INPUT_SIZE");
                    }
                    tonnetzFrames.push_back(applyTonnetzTransform(hpcp));
                }

                // Compute mean if requested
                bool computeMean = input.contains("computeMean") && input["computeMean"].get<bool>();
                if (computeMean && !tonnetzFrames.empty()) {
                    std::vector<essentia::Real> meanTonnetz(6, 0.0);
                    for (const auto& frame : tonnetzFrames) {
                        for (size_t i = 0; i < 6; ++i) {
                            meanTonnetz[i] += frame[i];
                        }
                    }
                    for (auto& val : meanTonnetz) {
                        val /= tonnetzFrames.size();
                    }

                    // Return the result with both frames and mean
                    json result;
                    result["frames"] = tonnetzFrames;
                    result["mean"] = meanTonnetz;
                    return result.dump();
                }

                // Return just the frames
                json result = tonnetzFrames;
                return result.dump();
            }
        } catch (const std::exception& e) {
            return createErrorResponse(std::string("Error computing Tonnetz: ") + e.what(), "COMPUTATION_ERROR");
        }
    }

    // Move from private to public section
    std::vector<essentia::Real> applyTonnetzTransform(const std::vector<essentia::Real>& hpcp) {
        // Keep the existing implementation untouched
        // Initialize 6-dimensional Tonnetz vector
        std::vector<essentia::Real> tonnetz(6, 0.0);

        // Apply Tonnetz transformation with the 6x12 matrix
        for (int i = 0; i < 6; i++) {
            for (int j = 0; j < 12; j++) {
                tonnetz[i] += TONNETZ_MATRIX[i][j] * hpcp[j];
            }
        }

        return tonnetz;
    }

private:
    // ... existing private methods ...
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
static jstring nativeExtractFeatures(JNIEnv* env, jobject thiz, jlong handle, jstring jfeaturesJson) {
    EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);
    if (wrapper == nullptr) {
        return env->NewStringUTF(createErrorResponse("Invalid Essentia handle", "INVALID_HANDLE").c_str());
    }

    const char* featuresJsonCStr = env->GetStringUTFChars(jfeaturesJson, nullptr);
    if (featuresJsonCStr == nullptr) {
        return env->NewStringUTF(createErrorResponse("Failed to get features JSON string", "JNI_ERROR").c_str());
    }

    std::string featuresJson(featuresJsonCStr);
    env->ReleaseStringUTFChars(jfeaturesJson, featuresJsonCStr);

    try {
        return env->NewStringUTF(wrapper->extractFeatures(featuresJson).c_str());
    } catch (const std::exception& e) {
        return env->NewStringUTF(createErrorResponse(e.what(), "EXTRACTION_ERROR").c_str());
    }
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

static jboolean nativeComputeSpectrum(JNIEnv* env, jobject thiz, jlong handle, jint frameSize, jint hopSize) {
    if (handle == 0) {
        return JNI_FALSE;
    }

    try {
        EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);
        wrapper->computeSpectrum(frameSize, hopSize);
        return JNI_TRUE;
    }
    catch (const std::exception& e) {
        // Log error
        return JNI_FALSE;
    }
}

// Add this to your JNI methods section
static jstring nativeComputeTonnetz(JNIEnv* env, jobject thiz, jlong handle, jstring jhpcpJson) {
    try {
        EssentiaWrapper* wrapper = reinterpret_cast<EssentiaWrapper*>(handle);
        if (!wrapper) {
            return env->NewStringUTF(createErrorResponse("Invalid Essentia instance", "INVALID_HANDLE").c_str());
        }

        // Get the HPCP JSON string
        const char* hpcpJsonCStr = env->GetStringUTFChars(jhpcpJson, nullptr);
        std::string hpcpJson(hpcpJsonCStr);
        env->ReleaseStringUTFChars(jhpcpJson, hpcpJsonCStr);

        // Call the wrapper method
        std::string result = wrapper->applyTonnetzTransform(hpcpJson);
        return env->NewStringUTF(result.c_str());
    } catch (const std::exception& e) {
        return env->NewStringUTF(createErrorResponse("Tonnetz computation failed", "JNI_ERROR", e.what()).c_str());
    }
}

// Then register this method in JNI_OnLoad
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
    };

    int rc = env->RegisterNatives(clazz, methods, sizeof(methods) / sizeof(methods[0]));
    if (rc != JNI_OK) {
        return JNI_ERR;
    }

    // If everything went well, return the JNI version
    return JNI_VERSION_1_6;
}


