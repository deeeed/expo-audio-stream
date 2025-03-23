cmake_minimum_required(VERSION 3.4.1)

# Set path to prebuilt libraries
set(PREBUILT_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../prebuilt)

# Include C++ header files
include_directories(${PREBUILT_DIR}/include)

# Add sherpa-onnx-jni library
add_library(sherpa-onnx-jni SHARED IMPORTED)
set_target_properties(sherpa-onnx-jni PROPERTIES IMPORTED_LOCATION
        ${PREBUILT_DIR}/android/${ANDROID_ABI}/libsherpa-onnx-jni.so)

# Add onnxruntime library
add_library(onnxruntime SHARED IMPORTED)
set_target_properties(onnxruntime PROPERTIES IMPORTED_LOCATION
        ${PREBUILT_DIR}/android/${ANDROID_ABI}/libonnxruntime.so)

# If we need to add our own native code, uncomment and customize:
# add_library(sherpa-onnx-extra SHARED
#   src/main/cpp/sherpa-onnx-extra.cpp
# )

# target_link_libraries(sherpa-onnx-extra
#   sherpa-onnx-jni
#   onnxruntime
# ) 