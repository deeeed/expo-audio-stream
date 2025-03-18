#include "SimpleWrapper.h"
#include "Utils.h"

SimpleWrapper::SimpleWrapper() {
    // Initialize
    LOGI("SimpleWrapper initialized\n");
}

SimpleWrapper::~SimpleWrapper() {
    // Clean up
}

std::string SimpleWrapper::getVersion() {
    return "SimpleWrapper 1.0.0";
}

std::vector<float> SimpleWrapper::doubleValues(const std::vector<float>& input) {
    std::vector<float> output;
    for (float value : input) {
        output.push_back(value * 2.0f);
    }
    LOGI("Output: %s\n", vectorToJsonString(output).c_str());
    return output;
}