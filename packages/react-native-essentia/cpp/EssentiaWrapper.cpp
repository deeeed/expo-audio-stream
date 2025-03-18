// packages/react-native-essentia/cpp/EssentiaWrapper.cpp
#include "EssentiaWrapper.h"
#include "Utils.h"
#include "nlohmann/json.hpp"

// Use the json library with a namespace alias for convenience
using json = nlohmann::json;

// Define the Tonnetz transformation matrix as a constant (add near the top with other constants)
const std::array<std::array<float, 12>, 6> EssentiaWrapper::TONNETZ_MATRIX = {{
    {1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0},
    {0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0},
    {0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0},
    {0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1},
    {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0},
    {0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1}
}};


// Map of primary output names for common Essentia algorithms
const std::map<std::string, std::string> EssentiaWrapper::primaryOutputs = {
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


EssentiaWrapper::EssentiaWrapper() : mIsInitialized(false), sampleRate(44100.0), spectrumComputed(false) {}


EssentiaWrapper::~EssentiaWrapper() {
    if (mIsInitialized) {
        essentia::shutdown();
        mIsInitialized = false;
    }
}

bool EssentiaWrapper::initialize() {
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

bool EssentiaWrapper::setAudioData(const std::vector<essentia::Real>& data, double rate) {
    if (data.empty()) {
        return false;
    }

    try {
        audioBuffer.clear();
        spectrumComputed = false;
        cachedSpectrum.clear();
        allSpectra.clear();

        audioBuffer = data;

        if (audioBuffer.size() % 2 != 0) {
            audioBuffer.push_back(0.0);
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

std::string EssentiaWrapper::executeAlgorithm(const std::string& algorithm, const std::string& paramsJson) {
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
            auto it = params.find("frameSize");
            if (it != params.end()) {
                // Ensure frameSize is even for FFT
                int frameSize = it->second.toInt();
                if (frameSize % 2 != 0) {
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

// Execute specific optimized algorithms
std::string EssentiaWrapper::executeSpecificAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params) {
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
      else if (algorithm == "Chromagram") {
          LOGI("Processing Chromagram algorithm");

          // ConstantQ requires 16384 frame size for the given parameters
          int frameSize = 16384; // Hard-code to required size for ConstantQ
          int hopSize = frameSize / 4; // Use 1/4 overlap for better analysis

          LOGI("Using fixed frameSize=%d, hopSize=%d for Chromagram (required by ConstantQ)", frameSize, hopSize);

          // Create FrameCutter to split audio into frames
          auto frameCutter = essentia::standard::AlgorithmFactory::create("FrameCutter",
              "frameSize", frameSize,
              "hopSize", hopSize);

          // Create Chromagram algorithm
          auto chromagramAlgo = essentia::standard::AlgorithmFactory::create("Chromagram");
          // Remove frameSize and hopSize from params as they're used for framing
          auto chromagramParams = params;
          chromagramParams.erase("frameSize");
          chromagramParams.erase("hopSize");
          chromagramAlgo->configure(convertToParameterMap(chromagramParams));

          // Connect inputs and outputs
          std::vector<essentia::Real> frame;
          frameCutter->input("signal").set(audioBuffer);
          frameCutter->output("frame").set(frame);

          std::vector<std::vector<essentia::Real>> chromagramFrames;

          // Process each frame
          while (true) {
              frameCutter->compute();
              if (frame.empty()) {
                  break; // No more frames
              }

              std::vector<essentia::Real> chromagram;
              chromagramAlgo->input("frame").set(frame);
              chromagramAlgo->output("chromagram").set(chromagram);
              chromagramAlgo->compute();
              chromagramFrames.push_back(chromagram);
          }

          // Store results in pool with key "chroma" to match JS expectations
          for (const auto& frame : chromagramFrames) {
              pool.add("chroma", frame);
          }

          // Clean up
          delete frameCutter;
          delete chromagramAlgo;
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

          // Create SpectralPeaks algorithm
          auto spectralPeaksAlgo = essentia::standard::AlgorithmFactory::create("SpectralPeaks");
          spectralPeaksAlgo->configure(
              "sampleRate", static_cast<float>(sampleRate),
              "maxPeaks", 100,
              "magnitudeThreshold", 0.0f
          );

          // Create HPCP algorithm
          auto hpcpAlgo = essentia::standard::AlgorithmFactory::create("HPCP");
          essentia::ParameterMap hpcpParams;
          hpcpParams.add("size", 12);
          hpcpParams.add("referenceFrequency", 440.0f);
          hpcpAlgo->configure(hpcpParams);

          // Create Key algorithm
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
              std::vector<essentia::Real> firstToSecondRelativeStrengthFrames;

              int frameCount = 0;
              for (const auto& spectrumFrame : allSpectra) {
                  frameCount++;
                  LOGI("Processing Key frame %d of %zu, frame size: %zu",
                        frameCount, allSpectra.size(), spectrumFrame.size());

                  // Compute spectral peaks
                  std::vector<essentia::Real> frequencies, magnitudes;
                  spectralPeaksAlgo->input("spectrum").set(spectrumFrame);
                  spectralPeaksAlgo->output("frequencies").set(frequencies);
                  spectralPeaksAlgo->output("magnitudes").set(magnitudes);
                  spectralPeaksAlgo->compute();
                  LOGI("Computed spectral peaks for frame %d: %zu peaks", frameCount, frequencies.size());

                  // Compute HPCP from peaks
                  std::vector<essentia::Real> hpcp;
                  hpcpAlgo->input("frequencies").set(frequencies);
                  hpcpAlgo->input("magnitudes").set(magnitudes);
                  hpcpAlgo->output("hpcp").set(hpcp);
                  hpcpAlgo->compute();
                  LOGI("Computed HPCP for frame %d, hpcp size: %zu", frameCount, hpcp.size());

                  // Compute Key from HPCP
                  std::string key, scale;
                  essentia::Real strength, firstToSecondRelativeStrength;
                  keyAlgo->input("pcp").set(hpcp);
                  keyAlgo->output("key").set(key);
                  keyAlgo->output("scale").set(scale);
                  keyAlgo->output("strength").set(strength);
                  keyAlgo->output("firstToSecondRelativeStrength").set(firstToSecondRelativeStrength);
                  keyAlgo->compute();
                  LOGI("Computed Key for frame %d: key=%s, scale=%s, strength=%.4f, firstToSecondRelativeStrength=%.4f",
                        frameCount, key.c_str(), scale.c_str(), strength, firstToSecondRelativeStrength);

                  keyFrames.push_back(key);
                  scaleFrames.push_back(scale);
                  strengthFrames.push_back(strength);
                  firstToSecondRelativeStrengthFrames.push_back(firstToSecondRelativeStrength);
              }

              pool.add("key_values", keyFrames);
              pool.add("scale_values", scaleFrames);
              pool.add("strength_values", strengthFrames);
              pool.add("first_to_second_relative_strength_values", firstToSecondRelativeStrengthFrames);
              LOGI("Added %zu key frames", keyFrames.size());
          } else {
              // Process the average HPCP for a single result
              std::vector<essentia::Real> averageHpcp(12, 0.0);
              int frameCount = 0;

              // Calculate average HPCP across frames
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
              essentia::Real strength, firstToSecondRelativeStrength;
              keyAlgo->input("pcp").set(averageHpcp);
              keyAlgo->output("key").set(key);
              keyAlgo->output("scale").set(scale);
              keyAlgo->output("strength").set(strength);
              keyAlgo->output("firstToSecondRelativeStrength").set(firstToSecondRelativeStrength);
              keyAlgo->compute();

              pool.set("key", key);
              pool.set("scale", scale);
              pool.set("strength", strength);
              pool.set("first_to_second_relative_strength", firstToSecondRelativeStrength);
              LOGI("Computed key: %s %s (strength: %f, firstToSecondRelativeStrength: %f)",
                    key.c_str(), scale.c_str(), strength, firstToSecondRelativeStrength);
          }

          // Clean up algorithms
          delete spectralPeaksAlgo;
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
      else if (algorithm == "MelBands") {
          LOGI("Processing MelBands algorithm");
          if (!spectrumComputed || allSpectra.empty()) {
              computeSpectrum(frameSize, hopSize);
          }
          if (allSpectra.empty()) {
              LOGE("No spectrum frames computed for MelBands");
              return createErrorResponse("No valid spectrum frames computed", "NO_DATA");
          }

          auto melBandsAlgo = essentia::standard::AlgorithmFactory::create("MelBands");
          // Remove 'framewise' from params to avoid invalid configuration
          auto melBandsParams = params;
          melBandsParams.erase("framewise");
          melBandsAlgo->configure(convertToParameterMap(melBandsParams));

          LOGI("Processing %zu spectrum frames through MelBands", allSpectra.size());
          for (const auto& spectrumFrame : allSpectra) {
          std::vector<essentia::Real> bands;
              melBandsAlgo->input("spectrum").set(spectrumFrame);
              melBandsAlgo->output("bands").set(bands);
              melBandsAlgo->compute();
              pool.add("melbands", bands);
              LOGI("Added MelBands frame of size %zu", bands.size());
          }

          // Compute mean if requested
          bool computeMean = params.count("computeMean") && params.at("computeMean").toBool();
          if (computeMean) {
              try {
                  const auto& melBandsFrames = pool.value<std::vector<std::vector<essentia::Real>>>("melbands");
                  if (!melBandsFrames.empty()) {
                      size_t frameSize = melBandsFrames[0].size();
                      std::vector<essentia::Real> meanMelBands(frameSize, 0.0);

                      for (const auto& frame : melBandsFrames) {
                          for (size_t i = 0; i < frameSize; ++i) {
                              meanMelBands[i] += frame[i];
                          }
                      }

                      for (auto& val : meanMelBands) {
                          val /= melBandsFrames.size();
                      }

                      pool.set("melbands_mean", meanMelBands);
                      LOGI("Computed mean MelBands values");
                  } else {
                      LOGW("No MelBands frames available to compute mean");
              }
          } catch (const std::exception& e) {
                  LOGW("Could not compute mean MelBands: %s", e.what());
                  // Continue execution, this is not a fatal error
              }
          }

          delete melBandsAlgo;
      }
      else if (algorithm == "FrameCutter") {
          LOGI("Processing FrameCutter algorithm");

          // Create and configure FrameCutter algorithm
          auto frameCutter = essentia::standard::AlgorithmFactory::create("FrameCutter");

          // Remove 'framewise' and 'computeMean' if present (not used by FrameCutter)
          auto frameCutterParams = params;
          frameCutterParams.erase("framewise");
          frameCutterParams.erase("computeMean");
          frameCutter->configure(convertToParameterMap(frameCutterParams));

          // Set input and prepare output
          frameCutter->input("signal").set(audioBuffer);
          std::vector<essentia::Real> frame;
          frameCutter->output("frame").set(frame);

          // Process all frames in a loop
          std::vector<std::vector<essentia::Real>> frames;
          int frameCount = 0;

          while (true) {
              // Clear frame for next iteration
              frame.clear();

              // Compute next frame
              frameCutter->compute();

              // Check if we've reached the end of the signal
              if (frame.empty()) {
                  LOGI("No more frames to process, total frames: %d", frameCount);
                  break;
              }

              // Store the frame and continue
              frames.push_back(frame);
              frameCount++;

              if (frameCount % 100 == 0) {
                  LOGI("Processed %d frames so far", frameCount);
              }
          }

          if (frames.empty()) {
              LOGE("No frames extracted by FrameCutter");
              return createErrorResponse("No frames could be extracted from audio data", "NO_DATA");
          }

          // Add each frame individually to the pool
          for (const auto& frame : frames) {
              pool.add("frame", frame);
          }
          LOGI("Successfully processed %zu frames with FrameCutter", frames.size());

          // Clean up
          delete frameCutter;
      }
      else if (algorithm == "SpectralContrast") {
          LOGI("Processing SpectralContrast algorithm");
          if (!spectrumComputed || allSpectra.empty()) {
              computeSpectrum(frameSize, hopSize);
          }
          if (allSpectra.empty()) {
              LOGE("No spectrum frames computed for SpectralContrast");
              return createErrorResponse("No valid spectrum frames computed", "NO_DATA");
          }

          auto spectralContrastAlgo = essentia::standard::AlgorithmFactory::create("SpectralContrast");
          // Remove 'framewise' from params to avoid invalid configuration
          auto spectralContrastParams = params;
          spectralContrastParams.erase("framewise");
          spectralContrastAlgo->configure(convertToParameterMap(spectralContrastParams));

          LOGI("Processing %zu spectrum frames through SpectralContrast", allSpectra.size());
          for (const auto& spectrumFrame : allSpectra) {
              std::vector<essentia::Real> spectralContrast, spectralValley;
              spectralContrastAlgo->input("spectrum").set(spectrumFrame);
              spectralContrastAlgo->output("spectralContrast").set(spectralContrast);
              spectralContrastAlgo->output("spectralValley").set(spectralValley);
              spectralContrastAlgo->compute();
              pool.add("spectralContrast", spectralContrast);
              pool.add("spectralValley", spectralValley);
              LOGI("Added SpectralContrast frame of size %zu and SpectralValley frame of size %zu",
                   spectralContrast.size(), spectralValley.size());
          }

          // Compute mean if requested
          bool computeMean = params.count("computeMean") && params.at("computeMean").toBool();
          if (computeMean) {
              try {
                  const auto& contrastFrames = pool.value<std::vector<std::vector<essentia::Real>>>("spectralContrast");
                  const auto& valleyFrames = pool.value<std::vector<std::vector<essentia::Real>>>("spectralValley");

                  if (!contrastFrames.empty() && !valleyFrames.empty()) {
                      size_t contrastSize = contrastFrames[0].size();
                      size_t valleySize = valleyFrames[0].size();

                      std::vector<essentia::Real> meanContrast(contrastSize, 0.0);
                      std::vector<essentia::Real> meanValley(valleySize, 0.0);

                      for (const auto& frame : contrastFrames) {
                          for (size_t i = 0; i < contrastSize; ++i) {
                              meanContrast[i] += frame[i];
                          }
                      }

                      for (const auto& frame : valleyFrames) {
                          for (size_t i = 0; i < valleySize; ++i) {
                              meanValley[i] += frame[i];
                          }
                      }

                      for (auto& val : meanContrast) {
                          val /= contrastFrames.size();
                      }

                      for (auto& val : meanValley) {
                          val /= valleyFrames.size();
                      }

                      pool.set("spectralContrast_mean", meanContrast);
                      pool.set("spectralValley_mean", meanValley);
                      LOGI("Computed mean SpectralContrast and SpectralValley values");
                  } else {
                      LOGW("No SpectralContrast frames available to compute mean");
                  }
              } catch (const std::exception& e) {
                  LOGW("Could not compute mean SpectralContrast: %s", e.what());
                  // Continue execution, this is not a fatal error
              }
          }

          delete spectralContrastAlgo;
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

// Execute dynamic algorithm
std::string EssentiaWrapper::executeDynamicAlgorithm(const std::string& algorithm, const std::map<std::string, essentia::Parameter>& params) {
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


void EssentiaWrapper::computeSpectrum(int frameSize, int hopSize) {
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
std::string EssentiaWrapper::getAlgorithmInfo(const std::string& algorithm) {
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

// Get all algorithms
std::string EssentiaWrapper::getAllAlgorithms() {
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

// Apply Tonnetz transform (vector version)
std::vector<essentia::Real> EssentiaWrapper::applyTonnetzTransform(const std::vector<essentia::Real>& hpcp) {
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


std::string EssentiaWrapper::findMatchingInputName(essentia::standard::Algorithm* algo, const std::string& expectedName,
                                                   const std::vector<std::string>& alternatives) {
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
