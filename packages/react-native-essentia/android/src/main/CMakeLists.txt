cmake_minimum_required(VERSION 3.4.1)
project(Essentia)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 14)

# Define the source files directory
set(RNESSENTIA_LIB_DIR ${CMAKE_SOURCE_DIR}/../../../cpp)

# Create third_party directory if it doesn't exist
file(MAKE_DIRECTORY ${RNESSENTIA_LIB_DIR}/third_party/nlohmann)

# Download nlohmann/json if not already present
if(NOT EXISTS ${RNESSENTIA_LIB_DIR}/third_party/nlohmann/json.hpp)
    message(STATUS "Downloading nlohmann/json library...")
    file(DOWNLOAD
        https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp
        ${RNESSENTIA_LIB_DIR}/third_party/nlohmann/json.hpp
        SHOW_PROGRESS
        STATUS download_status
    )
    list(GET download_status 0 status_code)
    if(NOT status_code EQUAL 0)
        message(FATAL_ERROR "Failed to download nlohmann/json library")
    endif()
    message(STATUS "nlohmann/json library downloaded successfully")
endif()

# Add include directories for Essentia headers and third-party libraries
include_directories(
    ../../../cpp/include  # Essentia headers in cpp/include/essentia
    ${RNESSENTIA_LIB_DIR}/third_party  # Path to third-party libraries
)

# Add the react-native-essentia shared library
add_library(react-native-essentia SHARED
    ${RNESSENTIA_LIB_DIR}/react-native-essentia.cpp
)

# Define the Essentia static library as an imported target
add_library(essentia STATIC IMPORTED)
set_target_properties(essentia PROPERTIES IMPORTED_LOCATION
    ${CMAKE_SOURCE_DIR}/jniLibs/${ANDROID_ABI}/libessentia.a  # Corrected path
)

# Link libraries to react-native-essentia
target_link_libraries(
    react-native-essentia
    essentia
    android
    log  # For Android logging
)
