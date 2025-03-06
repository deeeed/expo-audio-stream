cmake_minimum_required(VERSION 3.4.1)
project(Essentia)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 14)

# Define the source files directory - use relative paths from the CMakeLists.txt location
set(RNESSENTIA_LIB_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../cpp)

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

# Check if the library exists for the current ABI
set(LIBRARY_PATH ${CMAKE_SOURCE_DIR}/jniLibs/${ANDROID_ABI}/libessentia.a)
if(NOT EXISTS ${LIBRARY_PATH})
    message(WARNING "Library not found for ${ANDROID_ABI}: ${LIBRARY_PATH}")

    # Create a dummy library file
    file(WRITE ${CMAKE_BINARY_DIR}/dummy.cpp "
        // Dummy implementation for when the real library is missing
        #include <string>
        namespace essentia {
            namespace standard {
                namespace {
                    struct DummyParam {};
                    class AlgorithmFactory {
                    public:
                        static AlgorithmFactory& instance() { static AlgorithmFactory f; return f; }
                    };
                }
            }
            using Real = float;
            using Parameter = DummyParam;
        }
        extern \"C\" {
            // Dummy functions for the JNI interface
            jlong Java_net_siteed_essentia_EssentiaModule_nativeCreateEssentiaWrapper(JNIEnv*, jobject) { return 0; }
            void Java_net_siteed_essentia_EssentiaModule_nativeDestroyEssentiaWrapper(JNIEnv*, jobject, jlong) {}
            jboolean Java_net_siteed_essentia_EssentiaModule_nativeInitializeEssentia(JNIEnv*, jobject, jlong) { return JNI_FALSE; }
            jboolean Java_net_siteed_essentia_EssentiaModule_nativeSetAudioData(JNIEnv*, jobject, jlong, jfloatArray, jdouble) { return JNI_FALSE; }
            jstring Java_net_siteed_essentia_EssentiaModule_nativeExecuteAlgorithm(JNIEnv* env, jobject, jlong, jstring, jstring) {
                return env->NewStringUTF(\"{\\\"error\\\":{\\\"code\\\":\\\"NO_LIBRARY\\\",\\\"message\\\":\\\"Native library not available for this architecture\\\"}}\");
            }
            jstring Java_net_siteed_essentia_EssentiaModule_nativeGetAlgorithmInfo(JNIEnv* env, jobject, jlong, jstring) {
                return env->NewStringUTF(\"{\\\"error\\\":{\\\"code\\\":\\\"NO_LIBRARY\\\",\\\"message\\\":\\\"Native library not available for this architecture\\\"}}\");
            }
            jstring Java_net_siteed_essentia_EssentiaModule_nativeGetAllAlgorithms(JNIEnv* env, jobject, jlong) {
                return env->NewStringUTF(\"{\\\"error\\\":{\\\"code\\\":\\\"NO_LIBRARY\\\",\\\"message\\\":\\\"Native library not available for this architecture\\\"}}\");
            }
            jstring Java_net_siteed_essentia_EssentiaModule_nativeExtractFeatures(JNIEnv* env, jobject, jlong, jstring) {
                return env->NewStringUTF(\"{\\\"error\\\":{\\\"code\\\":\\\"NO_LIBRARY\\\",\\\"message\\\":\\\"Native library not available for this architecture\\\"}}\");
            }
            jstring Java_net_siteed_essentia_EssentiaModule_testJniConnection(JNIEnv* env, jobject) {
                return env->NewStringUTF(\"JNI connection successful, but native library not available for this architecture\");
            }
            jstring Java_net_siteed_essentia_EssentiaModule_getVersion(JNIEnv* env, jobject) {
                return env->NewStringUTF(\"0.0.0-dummy\");
            }
        }
    ")

    # Create a static library from the dummy file
    add_library(essentia STATIC ${CMAKE_BINARY_DIR}/dummy.cpp)
    target_include_directories(essentia PRIVATE ${ANDROID_NDK}/sources/android/support/include)
else()
    # Define the Essentia static library as an imported target
    add_library(essentia STATIC IMPORTED)
    set_target_properties(essentia PROPERTIES IMPORTED_LOCATION ${LIBRARY_PATH})
endif()

# Add include directories for Essentia headers and third-party libraries
include_directories(
    ${RNESSENTIA_LIB_DIR}/include  # Essentia headers in cpp/include/essentia
    ${RNESSENTIA_LIB_DIR}/third_party  # Path to third-party libraries
)

# Add the react-native-essentia shared library
add_library(react-native-essentia SHARED
    ${RNESSENTIA_LIB_DIR}/react-native-essentia.cpp
)

# Link libraries to react-native-essentia
target_link_libraries(
    react-native-essentia
    essentia
    android
    log  # For Android logging
)
