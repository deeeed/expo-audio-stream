// packages/react-native-essentia/cpp/Utils.h
#ifndef UTILS_H
#define UTILS_H

// Add this guard to prevent conflicts with Objective-C headers
#ifdef __cplusplus

#include <string>
#include <map>
#include <vector>
#include <algorithm>
#include <sstream>
#include "nlohmann/json.hpp"
#include "essentia/essentia.h"
#include "essentia/algorithmfactory.h"
#include "essentia/essentiamath.h"
#include "essentia/pool.h"
#include "essentia/version.h"

// Android logging macros
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

struct FeatureConfig {
    std::string name;           // Algorithm name
    std::map<std::string, essentia::Parameter> params; // Algorithm parameters
    std::string inputName;      // Name of the input to connect to
    std::string outputName;     // Name of the output to expose
    bool computeMean = false;   // Whether to compute mean of the result
};

// Inline definition of createErrorResponse
inline std::string createErrorResponse(const std::string& errorMessage,
                                       const std::string& errorCode = "UNKNOWN_ERROR",
                                       const std::string& details = "") {
    std::string json = "{\"error\":{\"code\":\"" + errorCode + "\",\"message\":\"" + errorMessage + "\"";
    if (!details.empty()) {
        json += ",\"details\":\"" + details + "\"";
    }
    json += "}}";
    return json;
}

// Inline definition of paramsMapToJson
inline std::string paramsMapToJson(const std::map<std::string, essentia::Parameter>& params) {
    nlohmann::json result;
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
        } catch (const std::exception& e) {
            result[pair.first] = "unknown_type";
        }
    }
    return result.dump();
}

// Inline definition of jsonToParamsMap
inline std::map<std::string, essentia::Parameter> jsonToParamsMap(const std::string& jsonStr) {
    std::map<std::string, essentia::Parameter> params;
    try {
        nlohmann::json j = nlohmann::json::parse(jsonStr);
        for (auto it = j.begin(); it != j.end(); ++it) {
            const std::string& key = it.key();
            if (it.value().is_number_integer()) {
                params.insert(std::make_pair(key, essentia::Parameter(static_cast<int>(it.value()))));
            } else if (it.value().is_number_float()) {
                params.insert(std::make_pair(key, essentia::Parameter(static_cast<float>(it.value()))));
            } else if (it.value().is_boolean()) {
                params.insert(std::make_pair(key, essentia::Parameter(it.value().get<bool>())));
            } else if (it.value().is_string()) {
                params.insert(std::make_pair(key, essentia::Parameter(it.value().get<std::string>())));
            } else if (it.value().is_array()) {
                if (!it.value().empty()) {
                    const auto& firstItem = it.value()[0];
                    if (firstItem.is_number()) {
                        std::vector<essentia::Real> vec;
                        for (const auto& item : it.value()) {
                            if (item.is_number()) {
                                vec.push_back(static_cast<essentia::Real>(item.get<double>()));
                            }
                        }
                        params.insert(std::make_pair(key, essentia::Parameter(vec)));
                    } else if (firstItem.is_string()) {
                        std::vector<std::string> vec;
                        for (const auto& item : it.value()) {
                            if (item.is_string()) {
                                vec.push_back(item.get<std::string>());
                            }
                        }
                        params.insert(std::make_pair(key, essentia::Parameter(vec)));
                    } else if (firstItem.is_boolean()) {
                        std::vector<bool> vec;
                        for (const auto& item : it.value()) {
                            if (item.is_boolean()) {
                                vec.push_back(item.get<bool>());
                            }
                        }
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
                    std::vector<essentia::Real> emptyVec;
                    params.insert(std::make_pair(key, essentia::Parameter(emptyVec)));
                }
            } else if (it.value().is_object()) {
                std::string nestedJson = it.value().dump();
                params.insert(std::make_pair(key, essentia::Parameter(nestedJson)));
                LOGI("Nested object parameter %s: %s", key.c_str(), nestedJson.c_str());
            }
        }
    } catch (const nlohmann::json::exception& e) {
        LOGE("JSON parsing error: %s", e.what());
    }
    return params;
}

// Inline definition of poolToJson
inline std::string poolToJson(const essentia::Pool& pool) {
    nlohmann::json result;
    for (const auto& key : pool.descriptorNames()) {
        try {
            if (pool.contains<std::vector<std::vector<essentia::Real>>>(key)) {
                const auto& vecOfVecs = pool.value<std::vector<std::vector<essentia::Real>>>(key);
                nlohmann::json framesArray = nlohmann::json::array();
                for (const auto& vec : vecOfVecs) {
                    framesArray.push_back(vec);
                }
                result[key] = framesArray;
                LOGI("Serialized %s with %zu frames", key.c_str(), vecOfVecs.size());
            } else if (pool.contains<std::vector<essentia::Real>>(key)) {
                const auto& values = pool.value<std::vector<essentia::Real>>(key);
                result[key] = values;
                LOGI("Serialized %s with %zu values", key.c_str(), values.size());
            } else if (pool.contains<essentia::Real>(key)) {
                result[key] = pool.value<essentia::Real>(key);
                LOGI("Serialized %s as single value", key.c_str());
            } else if (pool.contains<std::string>(key)) {
                result[key] = pool.value<std::string>(key);
                LOGI("Serialized %s as string", key.c_str());
            } else if (pool.contains<std::vector<std::string>>(key)) {
                const auto& values = pool.value<std::vector<std::string>>(key);
                result[key] = values;
                LOGI("Serialized %s with %zu strings", key.c_str(), values.size());
            } else {
                result[key] = "unsupported_type";
                LOGI("Unsupported type for %s", key.c_str());
            }
        } catch (const std::exception& e) {
            LOGE("Error serializing %s: %s", key.c_str(), e.what());
            result[key] = "error_reading_value";
        }
    }
    std::string jsonResult = result.dump();
    std::string safeResult;
    safeResult.reserve(jsonResult.size());
    for (size_t i = 0; i < jsonResult.size(); i++) {
        unsigned char c = jsonResult[i];
        if (c < 128) {
            safeResult.push_back(c);
            continue;
        }
        if ((c & 0xE0) == 0xC0) {
            if (i + 1 < jsonResult.size() && (jsonResult[i+1] & 0xC0) == 0x80) {
                safeResult.push_back(c);
                safeResult.push_back(jsonResult[++i]);
            } else {
                safeResult.append("?");
            }
        } else if ((c & 0xF0) == 0xE0) {
            if (i + 2 < jsonResult.size() && (jsonResult[i+1] & 0xC0) == 0x80 && (jsonResult[i+2] & 0xC0) == 0x80) {
                safeResult.push_back(c);
                safeResult.push_back(jsonResult[++i]);
                safeResult.push_back(jsonResult[++i]);
            } else {
                safeResult.append("?");
            }
        } else if ((c & 0xF8) == 0xF0) {
            if (i + 3 < jsonResult.size() && (jsonResult[i+1] & 0xC0) == 0x80 && (jsonResult[i+2] & 0xC0) == 0x80 && (jsonResult[i+3] & 0xC0) == 0x80) {
                safeResult.push_back(c);
                safeResult.push_back(jsonResult[++i]);
                safeResult.push_back(jsonResult[++i]);
                safeResult.push_back(jsonResult[++i]);
            } else {
                safeResult.append("?");
            }
        } else {
            safeResult.append("?");
        }
    }
    return safeResult;
}

inline std::string vectorToJsonString(const std::vector<float>& vec) {
    std::stringstream ss;
    ss << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        ss << vec[i];
        if (i < vec.size() - 1) ss << ",";
    }
    ss << "]";
    return ss.str();
}

// Inline definition of convertToParameterMap
inline essentia::ParameterMap convertToParameterMap(const std::map<std::string, essentia::Parameter>& params) {
    essentia::ParameterMap parameterMap;
    for (const auto& pair : params) {
        parameterMap.add(pair.first, pair.second);
    }
    return parameterMap;
}

#endif // __cplusplus
#endif // UTILS_H
