#pragma once

#include <string>
#include <vector>

class SimpleWrapper {
public:
    SimpleWrapper();
    ~SimpleWrapper();

    std::string getVersion();
    std::vector<float> doubleValues(const std::vector<float>& input);
};