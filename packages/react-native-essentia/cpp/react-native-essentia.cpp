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
// No-op for non-Android platforms
#define LOGI(...) ((void)0)
#define LOGW(...) ((void)0)
#define LOGE(...) ((void)0)
#endif

// Global variables for audio processing state
static essentia::Pool globalPool;
static std::vector<essentia::Real> audioBuffer;
static bool isAudioLoaded = false;
static bool isEssentiaInitialized = false;

namespace essentia {
	double multiply(double a, double b) {
		return a * b;
	}
}

// JSON parsing helpers
std::string paramsMapToJson(const std::map<std::string, essentia::Parameter>& params) {
    std::string json = "{";
    for (auto it = params.begin(); it != params.end(); ++it) {
        if (it != params.begin()) {
            json += ",";
        }
        json += "\"" + it->first + "\":";
        const essentia::Parameter& value = it->second;

        if (value.type() == essentia::Parameter::INT) {
            json += std::to_string(value.toInt());
        } else if (value.type() == essentia::Parameter::REAL) {
            json += std::to_string(value.toFloat());
        } else if (value.type() == essentia::Parameter::REAL) {
            json += std::to_string(value.toDouble());
        } else if (value.type() == essentia::Parameter::BOOL) {
            json += value.toBool() ? "true" : "false";
        } else if (value.type() == essentia::Parameter::STRING) {
            json += "\"" + value.toString() + "\"";
        } else {
            json += "\"" + value.toString() + "\"";
        }
    }
    json += "}";
    return json;
}

std::map<std::string, essentia::Parameter> jsonToParamsMap(const std::string& json) {
    std::map<std::string, essentia::Parameter> params;
    // Implement proper JSON parsing here (consider using a library like nlohmann/json)
    // This is a placeholder for demonstration purposes
    return params;
}

std::string poolToJson(const essentia::Pool& pool) {
    // Convert the Essentia pool to a JSON string
    // This is a placeholder for demonstration purposes
    std::string json = "{";
    bool first = true;

    // Example: add a few descriptors from the pool if they exist
    if (pool.contains<std::vector<essentia::Real>>("spectral.mfcc")) {
        auto mfccs = pool.value<std::vector<essentia::Real>>("spectral.mfcc");
        json += "\"mfcc\":[";
        for (size_t i = 0; i < mfccs.size(); ++i) {
            if (i > 0) json += ",";
            json += std::to_string(mfccs[i]);
        }
        json += "]";
        first = false;
    }

    // Add more descriptor handling as needed

    json += "}";
    return json;
}

// Core Essentia initialization
JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_initializeEssentia(JNIEnv *env, jobject thiz) {
	try {
		// Initialize Essentia
		essentia::init();

        // Explicitly register both standard and streaming algorithms
        essentia::standard::registerAlgorithm();
        essentia::streaming::registerAlgorithm();

        // Debug check if audio I/O algorithms are registered
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
        std::vector<std::string> availableAlgorithms = factory.keys();
        bool hasMonoLoader = std::find(availableAlgorithms.begin(), availableAlgorithms.end(), "MonoLoader") != availableAlgorithms.end();
        bool hasAudioLoader = std::find(availableAlgorithms.begin(), availableAlgorithms.end(), "AudioLoader") != availableAlgorithms.end();

        if (!hasMonoLoader || !hasAudioLoader) {
            LOGI("Audio I/O algorithms not found");
            LOGW("Audio loading algorithms (MonoLoader/AudioLoader) not registered. Audio loading may not work properly.");
        } else {
            LOGI("Audio I/O algorithms are registered and available");
        }

        isEssentiaInitialized = true;
		LOGI("Essentia initialized successfully");

        // Log available algorithms for debugging
        std::string algList = "";
        for (const auto& alg : availableAlgorithms) {
            algList += alg + ", ";
            if (algList.length() > 200) {
                LOGI("Available algorithms (partial): %s", algList.c_str());
                algList = "";
            }
        }
        if (!algList.empty()) {
            LOGI("Available algorithms (remaining): %s", algList.c_str());
        }

		return JNI_TRUE;
	} catch (const std::exception& e) {
		LOGE("Failed to initialize Essentia: %s", e.what());
		return JNI_FALSE;
	}
}

JNIEXPORT jstring JNICALL
Java_com_essentia_EssentiaModule_getEssentiaVersion(JNIEnv *env, jobject thiz) {
	std::string version = essentia::version;
	return env->NewStringUTF(version.c_str());
}

// Execute an Essentia algorithm
JNIEXPORT jstring JNICALL
Java_com_essentia_EssentiaModule_executeEssentiaAlgorithm(JNIEnv *env, jobject thiz,
                                                         jstring jcategory,
                                                         jstring jalgorithm,
                                                         jstring jparamsJson) {
    if (!isEssentiaInitialized) {
        LOGE("Essentia not initialized!");
        return env->NewStringUTF("{\"error\": \"Essentia not initialized\"}");
    }

    const char* category = env->GetStringUTFChars(jcategory, 0);
    const char* algorithm = env->GetStringUTFChars(jalgorithm, 0);
    const char* paramsJson = env->GetStringUTFChars(jparamsJson, 0);

    std::string result = "{}";

    try {
        // Convert JSON params to Essentia parameters
        std::map<std::string, essentia::Parameter> params = jsonToParamsMap(paramsJson);

        // Create and configure the algorithm
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

        // Check if algorithm exists
        std::vector<std::string> availableAlgorithms = factory.keys();
        bool algorithmExists = std::find(availableAlgorithms.begin(), availableAlgorithms.end(), algorithm) != availableAlgorithms.end();

        if (!algorithmExists) {
            std::string errorMsg = "Algorithm '" + std::string(algorithm) + "' not found in registry. ";

            // Suggest similar algorithms (simple substring match)
            errorMsg += "Similar available algorithms: ";
            int suggestionsCount = 0;
            for (const auto& avail : availableAlgorithms) {
                if (avail.find(algorithm) != std::string::npos ||
                    std::string(algorithm).find(avail) != std::string::npos) {
                    errorMsg += avail + ", ";
                    suggestionsCount++;
                    if (suggestionsCount >= 5) break; // Limit to 5 suggestions
                }
            }

            if (suggestionsCount == 0) {
                // If no similar algorithms found, list a few random ones
                errorMsg += "Sample of available algorithms: ";
                for (size_t i = 0; i < std::min(size_t(5), availableAlgorithms.size()); i++) {
                    errorMsg += availableAlgorithms[i] + ", ";
                }
            }

            LOGE("%s", errorMsg.c_str());
            result = "{\"error\": \"" + errorMsg + "\"}";

            env->ReleaseStringUTFChars(jcategory, category);
            env->ReleaseStringUTFChars(jalgorithm, algorithm);
            env->ReleaseStringUTFChars(jparamsJson, paramsJson);

            return env->NewStringUTF(result.c_str());
        }

        // Create and configure the algorithm
        std::unique_ptr<essentia::standard::Algorithm> algo(factory.create(algorithm));

        // Configure with parameters
        for (auto& param : params) {
            algo->configure(param.first, param.second);
        }

        // Create inputs/outputs based on the algorithm type
        essentia::Pool pool;

        // Execute the algorithm
        LOGI("Executing algorithm: %s", algorithm);

        // Different execution paths based on algorithm type
        if (std::string(algorithm) == "MFCC") {
            // Special handling for MFCC if audio is loaded
            if (!isAudioLoaded || audioBuffer.empty()) {
                result = "{\"error\": \"No audio loaded for MFCC computation\"}";
            } else {
                // Create a frame if processing the entire signal
                std::vector<essentia::Real> frame = audioBuffer;

                // Configure inputs and outputs
                std::vector<essentia::Real> mfccCoeffs, mfccBands;
                algo->input("spectrum").set(frame);
                algo->output("bands").set(mfccBands);
                algo->output("mfcc").set(mfccCoeffs);

                // Compute
                algo->compute();

                // Store results in pool
                pool.set("mfcc.coefficients", mfccCoeffs);
                pool.set("mfcc.bands", mfccBands);

                // Convert pool to JSON
                result = poolToJson(pool);
            }
        }
        else if (std::string(algorithm) == "Key") {
            // Special handling for Key if audio is loaded
            if (!isAudioLoaded || audioBuffer.empty()) {
                result = "{\"error\": \"No audio loaded for Key analysis\"}";
            } else {
                // Configure inputs and outputs
                std::string key, scale;
                essentia::Real strength, firstToSecondRelativeStrength;

                algo->input("pcp").set(audioBuffer);
                algo->output("key").set(key);
                algo->output("scale").set(scale);
                algo->output("strength").set(strength);
                algo->output("firstToSecondRelativeStrength").set(firstToSecondRelativeStrength);

                // Compute
                algo->compute();

                // Store results in pool
                pool.set("key.key", key);
                pool.set("key.scale", scale);
                pool.set("key.strength", strength);
                pool.set("key.firstToSecondRelativeStrength", firstToSecondRelativeStrength);

                // Convert pool to JSON
                result = poolToJson(pool);
            }
        }
        else {
            // Generic algorithm handling - attempt to auto-detect inputs/outputs
            // This is a simplified approach - in a full implementation, we would need
            // to inspect the algorithm's inputs/outputs and handle them dynamically

            result = "{\"success\": true, \"message\": \"Algorithm executed, but generic handling not implemented for: " +
                     std::string(algorithm) + "\"}";
        }
    } catch (const std::exception& e) {
        LOGE("Error executing algorithm: %s", e.what());
        result = "{\"error\": \"" + std::string(e.what()) + "\"}";
    }

    env->ReleaseStringUTFChars(jcategory, category);
    env->ReleaseStringUTFChars(jalgorithm, algorithm);
    env->ReleaseStringUTFChars(jparamsJson, paramsJson);

    return env->NewStringUTF(result.c_str());
}

// Audio file handling
JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_loadAudioFile(JNIEnv *env, jobject thiz, jstring jaudioPath, jdouble jsampleRate) {
    if (!isEssentiaInitialized) {
        LOGE("Essentia not initialized!");
        return JNI_FALSE;
    }

    const char* audioPath = env->GetStringUTFChars(jaudioPath, 0);
    const double sampleRate = static_cast<double>(jsampleRate);

    LOGI("Loading audio file: %s with sample rate: %.1f Hz", audioPath, sampleRate);

    // Handle file:// prefix if present
    std::string audioPathStr(audioPath);
    if (audioPathStr.find("file://") == 0) {
        audioPathStr = audioPathStr.substr(7); // Remove 'file://' prefix
        LOGI("Removed 'file://' prefix, using path: %s", audioPathStr.c_str());
    }

    try {
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();
        std::vector<std::string> availableAlgorithms = factory.keys();

        // Check if audio algorithms are available
        bool hasMonoLoader = std::find(availableAlgorithms.begin(), availableAlgorithms.end(), "MonoLoader") != availableAlgorithms.end();
        bool hasAudioLoader = std::find(availableAlgorithms.begin(), availableAlgorithms.end(), "AudioLoader") != availableAlgorithms.end();

        if (!hasMonoLoader && !hasAudioLoader) {
            LOGE("No audio loading algorithms available. Cannot load audio file.");
            env->ReleaseStringUTFChars(jaudioPath, audioPath);
            return JNI_FALSE;
        }

        if (hasMonoLoader) {
            // Use MonoLoader if available
            LOGI("Using MonoLoader to load audio file");
            std::unique_ptr<essentia::standard::Algorithm> loader(factory.create("MonoLoader"));

            // Configure the algorithm with user-provided sample rate
            loader->configure("filename", audioPathStr,
                             "sampleRate", sampleRate);

            // Load the audio file
            std::vector<essentia::Real> audio;
            loader->output("audio").set(audio);
            loader->compute();

            // Store the audio for later processing
            audioBuffer = audio;
            isAudioLoaded = true;

            LOGI("Loaded audio file: %s, %zu samples at %.1f Hz", audioPathStr.c_str(), audio.size(), sampleRate);
        }
        else if (std::find(availableAlgorithms.begin(), availableAlgorithms.end(), "AudioLoader") != availableAlgorithms.end()) {
            // Try AudioLoader as an alternative
            LOGI("MonoLoader not available, using AudioLoader as alternative");

            std::unique_ptr<essentia::standard::Algorithm> audioLoader(factory.create("AudioLoader"));
            audioLoader->configure("filename", audioPathStr);

            std::vector<essentia::StereoSample> audioStereo;
            essentia::Real fileSampleRate;
            int numChannels, bit_rate;
            std::string md5sum, codec;

            audioLoader->output("audio").set(audioStereo);
            audioLoader->output("sampleRate").set(fileSampleRate);
            audioLoader->output("numberChannels").set(numChannels);
            audioLoader->output("bit_rate").set(bit_rate);
            audioLoader->output("md5_audio").set(md5sum);
            audioLoader->output("codec").set(codec);

            audioLoader->compute();

            LOGI("Loaded audio file: %s, %zu samples, %d channels, original SR: %.1f Hz",
                audioPathStr.c_str(), audioStereo.size(), numChannels, fileSampleRate);

            // If stereo, convert to mono by averaging channels
            audioBuffer.resize(audioStereo.size());
            for (size_t i = 0; i < audioStereo.size(); ++i) {
                audioBuffer[i] = (audioStereo[i].left() + audioStereo[i].right()) / 2.0;
            }

            // If requested sample rate is different from file sample rate, we need to resample
            if (std::abs(fileSampleRate - sampleRate) > 1.0 &&
                std::find(availableAlgorithms.begin(), availableAlgorithms.end(), "Resample") != availableAlgorithms.end()) {
                LOGI("Resampling from %.1f Hz to %.1f Hz", fileSampleRate, sampleRate);

                try {
                    std::unique_ptr<essentia::standard::Algorithm> resampler(factory.create("Resample"));
                    resampler->configure("inputSampleRate", fileSampleRate,
                                        "outputSampleRate", sampleRate);

                    std::vector<essentia::Real> resampledAudio;
                    resampler->input("signal").set(audioBuffer);
                    resampler->output("signal").set(resampledAudio);
                    resampler->compute();

                    // Replace the original audio with the resampled one
                    audioBuffer = resampledAudio;

                    LOGI("Resampling complete, new size: %zu samples", resampledAudio.size());
                }
                catch (const std::exception& e) {
                    LOGE("Error during resampling: %s", e.what());
                    LOGI("Using original sample rate: %.1f Hz", fileSampleRate);
                }
            }

            isAudioLoaded = true;
        }
        else {
            // No suitable loader available
            LOGE("No audio loading algorithms available. Cannot load audio file.");
            env->ReleaseStringUTFChars(jaudioPath, audioPath);
            return JNI_FALSE;
        }

        env->ReleaseStringUTFChars(jaudioPath, audioPath);
        return JNI_TRUE;
    } catch (const std::exception& e) {
        LOGE("Error loading audio file: %s", e.what());
        LOGI("File path attempted: %s", audioPathStr.c_str());
        LOGI("Check file exists and has read permissions");
        env->ReleaseStringUTFChars(jaudioPath, audioPath);
        return JNI_FALSE;
    }
}

JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_unloadAudioFile(JNIEnv *env, jobject thiz) {
    if (!isEssentiaInitialized) {
        LOGE("Essentia not initialized!");
        return JNI_FALSE;
    }

    try {
        // Clear the audio buffer
        audioBuffer.clear();
        isAudioLoaded = false;

        // Clear the global pool
        globalPool.clear();

        LOGI("Unloaded audio file");
        return JNI_TRUE;
    } catch (const std::exception& e) {
        LOGE("Error unloading audio file: %s", e.what());
        return JNI_FALSE;
    }
}

JNIEXPORT jboolean JNICALL
Java_com_essentia_EssentiaModule_processAudioFrames(JNIEnv *env, jobject thiz, jint frameSize, jint hopSize) {
    if (!isEssentiaInitialized) {
        LOGE("Essentia not initialized!");
        return JNI_FALSE;
    }

    if (!isAudioLoaded || audioBuffer.empty()) {
        LOGE("No audio loaded!");
        return JNI_FALSE;
    }

    try {
        // Example: Process audio frames using a FrameCutter
        essentia::standard::AlgorithmFactory& factory = essentia::standard::AlgorithmFactory::instance();

        // Create a FrameCutter
        std::unique_ptr<essentia::standard::Algorithm> frameCutter(factory.create("FrameCutter"));
        frameCutter->configure("frameSize", (int)frameSize,
                              "hopSize", (int)hopSize);

        // Create a Windowing algorithm (Hann window)
        std::unique_ptr<essentia::standard::Algorithm> windowing(factory.create("Windowing"));
        windowing->configure("type", "hann");

        // Create an FFT algorithm
        std::unique_ptr<essentia::standard::Algorithm> fft(factory.create("FFT"));

        // Connect the algorithms
        frameCutter->input("signal").set(audioBuffer);

        std::vector<essentia::Real> frame, windowedFrame;
        std::vector<std::complex<essentia::Real>> fftFrame;
        std::vector<essentia::Real> magnitude, phase;

        frameCutter->output("frame").set(frame);
        windowing->input("frame").set(frame);
        windowing->output("frame").set(windowedFrame);
        fft->input("frame").set(windowedFrame);
        fft->output("fft").set(fftFrame);

        // Process all frames
        while (true) {
            // Get a frame
            frameCutter->compute();

            // If the frame is empty, we're done
            if (frame.empty()) {
                break;
            }

            // Apply window
            windowing->compute();

            // Compute FFT
            fft->compute();

            // Store the magnitudes in the pool
            for (const auto& fftBin : fftFrame) {
                magnitude.push_back(std::abs(fftBin));
                phase.push_back(std::arg(fftBin));
            }
        }

        // Store the processed data in the global pool
        globalPool.set("audio.frames", frame);
        globalPool.set("spectrum.magnitude", magnitude);
        globalPool.set("spectrum.phase", phase);

        LOGI("Processed audio with frameSize=%d, hopSize=%d", frameSize, hopSize);
        return JNI_TRUE;
    } catch (const std::exception& e) {
        LOGE("Error processing audio frames: %s", e.what());
        return JNI_FALSE;
    }
}
