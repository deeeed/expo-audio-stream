// packages/react-native-essentia/cpp/FeatureExtractor.cpp
#include "FeatureExtractor.h"
#include "EssentiaWrapper.h"
#include "Utils.h"
#include "nlohmann/json.hpp"

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

using json = nlohmann::json;

FeatureExtractor::FeatureExtractor(EssentiaWrapper* wrapper) : mWrapper(wrapper) {}

// Extract features from the pool
std::string FeatureExtractor::extractFeatures(const std::string& featuresJson) {
    if (!mWrapper->isInitialized()) {
        return createErrorResponse("Essentia is not initialized", "NOT_INITIALIZED");
    }

    if (mWrapper->getAudioBuffer().empty()) {
        return createErrorResponse("No audio data loaded. Call setAudioData() first.", "ESSENTIA_NO_AUDIO_DATA");
    }

    // Reset spectrum cache to ensure fresh computation for each feature extraction
    mWrapper->setSpectrumComputed(false);
    mWrapper->setCachedSpectrum({});
    mWrapper->setAllSpectra({});

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
        mWrapper->computeSpectrum(maxFrameSize, maxFrameSize / 2);

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
            std::string result = mWrapper->executeSpecificAlgorithm(name, params);

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

std::string FeatureExtractor::computeMelSpectrogram(int frameSize, int hopSize, int nMels, float fMin, float fMax,
                                                  const std::string& windowType, bool normalize, bool logScale) {
    if (!mWrapper->isInitialized()) {
        return createErrorResponse("Essentia is not initialized", "NOT_INITIALIZED");
    }

    if (mWrapper->getAudioBuffer().empty()) {
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
            "sampleRate", static_cast<int>(mWrapper->getSampleRate()),
            "normalize", normalize ? "unit_sum" : "none",
            "log", logScale // This matches Essentia's API
        );

        // Process frames
        std::vector<std::vector<essentia::Real>> melSpectrogram;
        std::vector<essentia::Real> frame;

        frameCutter->input("signal").set(mWrapper->getAudioBuffer());
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
        result["sampleRate"] = mWrapper->getSampleRate();
        result["nMels"] = nMels;
        result["timeSteps"] = melSpectrogram.size();
        result["durationMs"] = (melSpectrogram.size() * hopSize * 1000) / mWrapper->getSampleRate();

        return "{\"success\":true,\"data\":" + result.dump() + "}";
    } catch (const std::exception& e) {
        std::string errorMsg = std::string("Error computing mel spectrogram: ") + e.what();
        LOGE("%s", errorMsg.c_str());
        return createErrorResponse(errorMsg, "MEL_SPECTROGRAM_ERROR");
    }

}

// Execute pipeline
std::string FeatureExtractor::executePipeline(const std::string& pipelineJson) {
      try {
        LOGI("Starting pipeline execution with configuration length: %zu", pipelineJson.length());

        if (!mWrapper->isInitialized()) {
            LOGE("Essentia not initialized");
            return createErrorResponse("Essentia not initialized", "NOT_INITIALIZED");
        }

        if (mWrapper->getAudioBuffer().empty()) {
            LOGE("No audio data loaded");
            return createErrorResponse("No audio data loaded", "NO_AUDIO_DATA");
        }

        // Parse the JSON configuration
        json config;
        try {
            config = json::parse(pipelineJson);
            LOGI("Successfully parsed pipeline JSON configuration");
        } catch (const json::exception& e) {
            LOGE("Failed to parse JSON configuration: %s", e.what());
            return createErrorResponse(std::string("Invalid JSON configuration: ") + e.what(), "INVALID_CONFIG");
        }

        // Log the feature algorithms we're going to process
        if (config.contains("features") && config["features"].is_array()) {
            LOGI("Pipeline includes %zu features:", config["features"].size());
            for (const auto& feature : config["features"]) {
                if (feature.contains("name")) {
                    LOGI("  - %s", feature["name"].get<std::string>().c_str());
                }
            }
        }

        // Validate configuration
        if (!config.contains("preprocess") || !config["preprocess"].is_array()) {
            LOGE("Invalid configuration: 'preprocess' must be an array");
            return createErrorResponse("Invalid configuration: 'preprocess' must be an array", "INVALID_CONFIG");
        }
        if (!config.contains("features") || !config["features"].is_array()) {
            LOGE("Invalid configuration: 'features' must be an array");
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
                LOGE("FrameCutter not found in preprocessing steps");
                return createErrorResponse("FrameCutter not found in preprocessing steps", "INVALID_CONFIG");
            }

            // Create FrameCutter
            json frameCutterConfig = config["preprocess"][frameCutterIndex];
            if (!frameCutterConfig.contains("params") ||
                !frameCutterConfig["params"].contains("frameSize") ||
                !frameCutterConfig["params"].contains("hopSize")) {
                LOGE("FrameCutter requires frameSize and hopSize parameters");
                return createErrorResponse("FrameCutter requires frameSize and hopSize parameters", "INVALID_CONFIG");
            }

            // Configure FrameCutter
            essentia::standard::Algorithm* frameCutter = factory.create("FrameCutter",
                "frameSize", frameCutterConfig["params"]["frameSize"].get<int>(),
                "hopSize", frameCutterConfig["params"]["hopSize"].get<int>()
            );

            std::vector<essentia::Real> frame;
            frameCutter->input("signal").set(mWrapper->getAudioBuffer());
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
                    LOGE("Error creating algorithm '%s': %s", name.c_str(), e.what());
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

                LOGI("Processing feature configuration: '%s'", name.c_str());

                if (name == "Tonnetz") {
                    LOGI("Detected Tonnetz feature - using special handling path");

                    // Skip trying to create the Tonnetz algorithm using the factory
                    // We'll handle it manually in the processing loop

                    if (!feature.contains("input")) {
                        // Clean up resources
                        for (auto* algo : preprocessAlgos) delete algo;
                        for (auto* algo : featureAlgos) delete algo;
                        LOGE("Tonnetz feature missing required 'input' field");
                        return createErrorResponse(std::string("Feature '") + name + "' is missing required 'input' field", "INVALID_CONFIG");
                    }

                    std::string inputName = feature["input"].get<std::string>();
                    LOGI("Tonnetz will use input: '%s'", inputName.c_str());

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
                    LOGE("Feature '%s' is missing required 'input' field", name.c_str());
                    return createErrorResponse(std::string("Feature '") + name + "' is missing required 'input' field", "INVALID_CONFIG");
                }

                std::string inputName = feature["input"].get<std::string>();

                try {
                    LOGI("Attempting to create algorithm '%s'", name.c_str());

                    // Check if we're trying to create Tonnetz through the factory
                    if (name == "Tonnetz") {
                        LOGE("Unexpected code path: Trying to create Tonnetz algorithm through factory!");
                        // This should never happen as we should have handled Tonnetz earlier
                    }

                    essentia::standard::Algorithm* algo = factory.create(name);
                    LOGI("Successfully created algorithm '%s'", name.c_str());

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
                    if (mWrapper->getPrimaryOutputs().find(name) != mWrapper->getPrimaryOutputs().end()) {
                        outputName = mWrapper->getPrimaryOutputs().at(name);
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
                    LOGE("Error creating algorithm '%s': %s", name.c_str(), e.what());
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
                    firstAlgo->output(mWrapper->getPrimaryOutputs().count(preprocessOutputNames[0]) ?
                                    mWrapper->getPrimaryOutputs().at(preprocessOutputNames[0]) :
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
                        algo->output(mWrapper->getPrimaryOutputs().count(preprocessOutputNames[i]) ?
                                    mWrapper->getPrimaryOutputs().at(preprocessOutputNames[i]) :
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
                        LOGI("Executing special Tonnetz processing for frame %d", frameCount);

                        // Check if the specified input exists in the pool
                        if (!framePool.contains<std::vector<essentia::Real>>(inputName)) {
                            LOGE("Input '%s' not found in pool for Tonnetz (available descriptors: %s)",
                                  inputName.c_str(),
                                  [&framePool]() {
                                      std::string result = "";
                                      auto descriptors = framePool.descriptorNames();
                                      for (const auto& desc : descriptors) {
                                          if (!result.empty()) result += ", ";
                                          result += desc;
                                      }
                                      return result;
                                  }().c_str());
                            continue;
                        }

                        const auto& hpcp = framePool.value<std::vector<essentia::Real>>(inputName);
                        LOGI("Retrieved input '%s' for Tonnetz (size: %zu)", inputName.c_str(), hpcp.size());

                        // Validate HPCP size (must be 12 for Tonnetz)
                        if (hpcp.size() != 12) {
                            LOGE("Input '%s' vector must be 12-dimensional for Tonnetz, got %zu",
                                  inputName.c_str(), hpcp.size());
                            continue;
                        }

                        // Log before applying transformation
                        LOGI("Applying Tonnetz transformation to HPCP values: [%s]",
                              [&hpcp]() {
                                  std::string values = "";
                                  for (size_t i = 0; i < hpcp.size(); ++i) {
                                      if (i > 0) values += ", ";
                                      values += std::to_string(hpcp[i]);
                                  }
                                  return values;
                              }().c_str());

                        // Apply Tonnetz transformation
                        std::vector<essentia::Real> tonnetz = mWrapper->applyTonnetzTransform(hpcp);

                        // Log the result
                        LOGI("Tonnetz transformation result: [%s]",
                              [&tonnetz]() {
                                  std::string values = "";
                                  for (size_t i = 0; i < tonnetz.size(); ++i) {
                                      if (i > 0) values += ", ";
                                      values += std::to_string(tonnetz[i]);
                                  }
                                  return values;
                              }().c_str());

                        // Store in feature collectors
                        if (featureCollectors.find("Tonnetz") == featureCollectors.end()) {
                            featureCollectors["Tonnetz"] = std::vector<std::vector<essentia::Real>>();
                            LOGI("Created new feature collector for Tonnetz");
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
            signalPool.add("signal", mWrapper->getAudioBuffer());

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
                    if (mWrapper->getPrimaryOutputs().find(name) != mWrapper->getPrimaryOutputs().end()) {
                        outputName = mWrapper->getPrimaryOutputs().at(name);
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
                    if (mWrapper->getPrimaryOutputs().find(name) != mWrapper->getPrimaryOutputs().end()) {
                        outputName = mWrapper->getPrimaryOutputs().at(name);
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

// Apply tonnetz transform
std::string FeatureExtractor::applyTonnetzTransform(const std::string& hpcpJson) {
    if (!mWrapper->isInitialized()) {
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

std::vector<essentia::Real> FeatureExtractor::applyTonnetzTransform(const std::vector<essentia::Real>& hpcp) {
    // Simply delegate to the wrapper's implementation
    return mWrapper->applyTonnetzTransform(hpcp);
}

