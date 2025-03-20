cmake_minimum_required(VERSION 3.4.1)
project(Essentia)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Define the source files directory - use relative paths from the CMakeLists.txt location
set(RNESSENTIA_LIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../cpp)
set(ESSENTIA_SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../third_party/essentia)

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

# Enhanced validation for pre-built Essentia library
message(STATUS "======== ESSENTIA ANDROID LIBRARY VALIDATION (C++17) ========")
message(STATUS "Checking for pre-built Essentia library for ${ANDROID_ABI}")
set(LIBRARY_PATH ${CMAKE_SOURCE_DIR}/jniLibs/${ANDROID_ABI}/libessentia.a)

if(EXISTS ${LIBRARY_PATH})
    message(STATUS "Found library for ${ANDROID_ABI}: ${LIBRARY_PATH}")

    # Check file size
    file(SIZE ${LIBRARY_PATH} LIBRARY_SIZE)
    message(STATUS "Library size: ${LIBRARY_SIZE} bytes")

    if(LIBRARY_SIZE LESS 1000)
        message(WARNING "Library file is suspiciously small (< 1KB), might be a dummy or placeholder")

        # Read the first few bytes to check if it's a Git LFS pointer
        file(READ ${LIBRARY_PATH} LIBRARY_CONTENT LIMIT 100)
        string(FIND "${LIBRARY_CONTENT}" "git-lfs" GIT_LFS_POS)

        if(NOT ${GIT_LFS_POS} EQUAL -1)
            message(STATUS "Library appears to be a Git LFS pointer file, attempting to download...")
            execute_process(
                COMMAND node ${CMAKE_SOURCE_DIR}/../../../install.js
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/../../..
                RESULT_VARIABLE INSTALL_RESULT
            )

            if(NOT INSTALL_RESULT EQUAL 0)
                message(FATAL_ERROR "Failed to download libraries. Please run './build-essentia-android.sh' or replace with a proper library file.")
            endif()

            # Check if the file was properly downloaded
            file(SIZE ${LIBRARY_PATH} NEW_LIBRARY_SIZE)
            if(NEW_LIBRARY_SIZE LESS 1000)
                message(FATAL_ERROR "Library is still too small after download attempt (${NEW_LIBRARY_SIZE} bytes). Please run './build-essentia-android.sh' or replace with a proper library file.")
            endif()
        else
            message(FATAL_ERROR "Library for ${ANDROID_ABI} is too small to be valid (${LIBRARY_SIZE} bytes). Please run './build-essentia-android.sh' or replace with a proper library file.")
        endif()
    endif()

    # Import the library
    add_library(essentia STATIC IMPORTED)
    set_target_properties(essentia PROPERTIES IMPORTED_LOCATION ${LIBRARY_PATH})
else()
    message(FATAL_ERROR "Library not found for ${ANDROID_ABI}: ${LIBRARY_PATH}. Please run './build-essentia-android.sh' or ensure the library is in the correct location.")
endif()

message(STATUS "======== END ESSENTIA ANDROID LIBRARY VALIDATION ========")

# Add include directories for Essentia headers and third-party libraries
include_directories(
    ${RNESSENTIA_LIB_DIR}/include  # Essentia headers in cpp/include/essentia
    ${RNESSENTIA_LIB_DIR}/third_party  # Path to third-party libraries
    ${RNESSENTIA_LIB_DIR}  # Include the cpp directory for local header files
)

# Custom wrapper code
add_library(react-native-essentia SHARED
    ${RNESSENTIA_LIB_DIR}/JNIBindings.cpp
    ${RNESSENTIA_LIB_DIR}/EssentiaWrapper.cpp
    ${RNESSENTIA_LIB_DIR}/FeatureExtractor.cpp
)

# Ensure C++17 is used for the wrapper code
target_compile_features(react-native-essentia PRIVATE cxx_std_17)

# Link libraries to react-native-essentia
target_link_libraries(
    react-native-essentia
    essentia
    android
    log  # For Android logging
)
