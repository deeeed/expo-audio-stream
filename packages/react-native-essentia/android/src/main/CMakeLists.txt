cmake_minimum_required(VERSION 3.4.1)
project(Essentia)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 14)

# Define the source files directory
set(RNESSENTIA_LIB_DIR ${CMAKE_SOURCE_DIR}/../../../cpp)

# Add include directories for Essentia headers
include_directories(
    ../../../cpp/include  # Essentia headers in cpp/include/essentia
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
