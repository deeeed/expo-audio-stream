cmake_minimum_required(VERSION 3.18)
project(audio-studio-cpp)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../cpp")


add_library(audio-studio-cpp SHARED
    ${CPP_DIR}/MelSpectrogram.cpp
    ${CPP_DIR}/MelSpectrogramBridge.cpp
    ${CPP_DIR}/kiss_fft/kiss_fft.c
    ${CPP_DIR}/kiss_fft/kiss_fftr.c
    jni/MelSpectrogramJNI.cpp
)

target_include_directories(audio-studio-cpp PRIVATE
    ${CPP_DIR}
    ${CPP_DIR}/kiss_fft
)

target_link_libraries(audio-studio-cpp
    android
    log
)
