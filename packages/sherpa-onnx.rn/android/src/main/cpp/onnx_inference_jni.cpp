#include <jni.h>
#include <string>
#include <unordered_map>
#include <mutex>
#include <vector>
#include <sstream>
#include <atomic>
#include <memory>
#include <android/log.h>

#include "onnxruntime/onnxruntime_c_api.h"

#define LOG_TAG "OnnxInferenceJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static const OrtApi* g_ort = nullptr;
static OrtEnv* g_env = nullptr;

struct SessionData {
    OrtSession* session = nullptr;
    OrtSessionOptions* session_options = nullptr;
    std::vector<std::string> input_names;
    std::vector<std::string> output_names;
    std::vector<ONNXTensorElementDataType> input_types;
    std::vector<ONNXTensorElementDataType> output_types;

    SessionData() = default;
    SessionData(SessionData&& o) noexcept
        : session(o.session), session_options(o.session_options),
          input_names(std::move(o.input_names)), output_names(std::move(o.output_names)),
          input_types(std::move(o.input_types)), output_types(std::move(o.output_types)) {
        o.session = nullptr;
        o.session_options = nullptr;
    }
    SessionData(const SessionData&) = delete;
    SessionData& operator=(const SessionData&) = delete;

    ~SessionData() {
        if (g_ort) {
            if (session) g_ort->ReleaseSession(session);
            if (session_options) g_ort->ReleaseSessionOptions(session_options);
        }
    }
};

static std::unordered_map<std::string, std::shared_ptr<SessionData>> g_sessions;
static std::mutex g_mutex;
static std::atomic<int> g_session_counter{0};

static void throw_jni_exception(JNIEnv* env, const char* msg) {
    jclass cls = env->FindClass("java/lang/RuntimeException");
    env->ThrowNew(cls, msg);
}

static void check_ort_status(const OrtApi* api, OrtStatus* status) {
    if (status != nullptr) {
        const char* msg = api->GetErrorMessage(status);
        std::string err(msg);
        api->ReleaseStatus(status);
        throw std::runtime_error(err);
    }
}

static void init_ort_api() {
    if (g_ort == nullptr) {
        g_ort = OrtGetApiBase()->GetApi(ORT_API_VERSION);
        LOGI("ORT API initialized (version %d)", ORT_API_VERSION);
    }
    if (g_env == nullptr) {
        check_ort_status(g_ort, g_ort->CreateEnv(ORT_LOGGING_LEVEL_WARNING, "onnx_inference", &g_env));
        LOGI("Global OrtEnv created");
    }
}

extern "C" {

JNIEXPORT jstring JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeCreateSession(
    JNIEnv* env, jobject thiz, jstring model_path, jint num_threads) {

    try {
        init_ort_api();

        const char* path = env->GetStringUTFChars(model_path, nullptr);
        std::string model_path_str(path);
        env->ReleaseStringUTFChars(model_path, path);

        SessionData data;

        check_ort_status(g_ort, g_ort->CreateSessionOptions(&data.session_options));
        check_ort_status(g_ort, g_ort->SetIntraOpNumThreads(data.session_options, num_threads));
        check_ort_status(g_ort, g_ort->SetSessionGraphOptimizationLevel(data.session_options, ORT_ENABLE_ALL));

        LOGI("Creating session from: %s", model_path_str.c_str());
        check_ort_status(g_ort, g_ort->CreateSession(g_env, model_path_str.c_str(), data.session_options, &data.session));

        OrtAllocator* allocator;
        check_ort_status(g_ort, g_ort->GetAllocatorWithDefaultOptions(&allocator));

        // Get input info
        size_t num_inputs;
        check_ort_status(g_ort, g_ort->SessionGetInputCount(data.session, &num_inputs));
        for (size_t i = 0; i < num_inputs; i++) {
            char* name;
            check_ort_status(g_ort, g_ort->SessionGetInputName(data.session, i, allocator, &name));
            data.input_names.push_back(name);
            check_ort_status(g_ort, g_ort->AllocatorFree(allocator, name));

            OrtTypeInfo* type_info;
            check_ort_status(g_ort, g_ort->SessionGetInputTypeInfo(data.session, i, &type_info));
            const OrtTensorTypeAndShapeInfo* tensor_info;
            check_ort_status(g_ort, g_ort->CastTypeInfoToTensorInfo(type_info, &tensor_info));
            ONNXTensorElementDataType elem_type;
            check_ort_status(g_ort, g_ort->GetTensorElementType(tensor_info, &elem_type));
            data.input_types.push_back(elem_type);
            g_ort->ReleaseTypeInfo(type_info);
        }

        // Get output info
        size_t num_outputs;
        check_ort_status(g_ort, g_ort->SessionGetOutputCount(data.session, &num_outputs));
        for (size_t i = 0; i < num_outputs; i++) {
            char* name;
            check_ort_status(g_ort, g_ort->SessionGetOutputName(data.session, i, allocator, &name));
            data.output_names.push_back(name);
            check_ort_status(g_ort, g_ort->AllocatorFree(allocator, name));

            OrtTypeInfo* type_info;
            check_ort_status(g_ort, g_ort->SessionGetOutputTypeInfo(data.session, i, &type_info));
            const OrtTensorTypeAndShapeInfo* tensor_info;
            check_ort_status(g_ort, g_ort->CastTypeInfoToTensorInfo(type_info, &tensor_info));
            ONNXTensorElementDataType elem_type;
            check_ort_status(g_ort, g_ort->GetTensorElementType(tensor_info, &elem_type));
            data.output_types.push_back(elem_type);
            g_ort->ReleaseTypeInfo(type_info);
        }

        int id = g_session_counter.fetch_add(1);
        std::string session_id = "session_" + std::to_string(id);

        {
            std::lock_guard<std::mutex> lock(g_mutex);
            g_sessions[session_id] = std::make_shared<SessionData>(std::move(data));
        }

        LOGI("Session created: %s (inputs=%zu, outputs=%zu)", session_id.c_str(), num_inputs, num_outputs);
        return env->NewStringUTF(session_id.c_str());

    } catch (const std::exception& e) {
        LOGE("createSession error: %s", e.what());
        throw_jni_exception(env, e.what());
        return nullptr;
    }
}

JNIEXPORT jobjectArray JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeGetInputNames(
    JNIEnv* env, jobject thiz, jstring session_id_j) {

    try {
        const char* sid = env->GetStringUTFChars(session_id_j, nullptr);
        std::string session_id(sid);
        env->ReleaseStringUTFChars(session_id_j, sid);

        std::lock_guard<std::mutex> lock(g_mutex);
        auto it = g_sessions.find(session_id);
        if (it == g_sessions.end()) {
            throw std::runtime_error("Session not found: " + session_id);
        }

        auto& names = it->second->input_names;
        jclass str_cls = env->FindClass("java/lang/String");
        jobjectArray result = env->NewObjectArray(names.size(), str_cls, nullptr);
        for (size_t i = 0; i < names.size(); i++) {
            env->SetObjectArrayElement(result, i, env->NewStringUTF(names[i].c_str()));
        }
        return result;

    } catch (const std::exception& e) {
        throw_jni_exception(env, e.what());
        return nullptr;
    }
}

JNIEXPORT jobjectArray JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeGetOutputNames(
    JNIEnv* env, jobject thiz, jstring session_id_j) {

    try {
        const char* sid = env->GetStringUTFChars(session_id_j, nullptr);
        std::string session_id(sid);
        env->ReleaseStringUTFChars(session_id_j, sid);

        std::lock_guard<std::mutex> lock(g_mutex);
        auto it = g_sessions.find(session_id);
        if (it == g_sessions.end()) {
            throw std::runtime_error("Session not found: " + session_id);
        }

        auto& names = it->second->output_names;
        jclass str_cls = env->FindClass("java/lang/String");
        jobjectArray result = env->NewObjectArray(names.size(), str_cls, nullptr);
        for (size_t i = 0; i < names.size(); i++) {
            env->SetObjectArrayElement(result, i, env->NewStringUTF(names[i].c_str()));
        }
        return result;

    } catch (const std::exception& e) {
        throw_jni_exception(env, e.what());
        return nullptr;
    }
}

JNIEXPORT jobjectArray JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeGetInputTypes(
    JNIEnv* env, jobject thiz, jstring session_id_j) {

    try {
        const char* sid = env->GetStringUTFChars(session_id_j, nullptr);
        std::string session_id(sid);
        env->ReleaseStringUTFChars(session_id_j, sid);

        std::lock_guard<std::mutex> lock(g_mutex);
        auto it = g_sessions.find(session_id);
        if (it == g_sessions.end()) {
            throw std::runtime_error("Session not found: " + session_id);
        }

        auto& types = it->second->input_types;
        jclass str_cls = env->FindClass("java/lang/String");
        jobjectArray result = env->NewObjectArray(types.size(), str_cls, nullptr);
        for (size_t i = 0; i < types.size(); i++) {
            std::string type_str;
            switch (types[i]) {
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT: type_str = "float32"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32: type_str = "int32"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64: type_str = "int64"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8: type_str = "uint8"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8: type_str = "int8"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE: type_str = "float64"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL: type_str = "bool"; break;
                default: type_str = "unknown"; break;
            }
            env->SetObjectArrayElement(result, i, env->NewStringUTF(type_str.c_str()));
        }
        return result;

    } catch (const std::exception& e) {
        throw_jni_exception(env, e.what());
        return nullptr;
    }
}

JNIEXPORT jobjectArray JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeGetOutputTypes(
    JNIEnv* env, jobject thiz, jstring session_id_j) {

    try {
        const char* sid = env->GetStringUTFChars(session_id_j, nullptr);
        std::string session_id(sid);
        env->ReleaseStringUTFChars(session_id_j, sid);

        std::lock_guard<std::mutex> lock(g_mutex);
        auto it = g_sessions.find(session_id);
        if (it == g_sessions.end()) {
            throw std::runtime_error("Session not found: " + session_id);
        }

        auto& types = it->second->output_types;
        jclass str_cls = env->FindClass("java/lang/String");
        jobjectArray result = env->NewObjectArray(types.size(), str_cls, nullptr);
        for (size_t i = 0; i < types.size(); i++) {
            std::string type_str;
            switch (types[i]) {
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT: type_str = "float32"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32: type_str = "int32"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64: type_str = "int64"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8: type_str = "uint8"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8: type_str = "int8"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE: type_str = "float64"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL: type_str = "bool"; break;
                default: type_str = "unknown"; break;
            }
            env->SetObjectArrayElement(result, i, env->NewStringUTF(type_str.c_str()));
        }
        return result;

    } catch (const std::exception& e) {
        throw_jni_exception(env, e.what());
        return nullptr;
    }
}

static size_t element_size_for_type(ONNXTensorElementDataType type) {
    switch (type) {
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT: return 4;
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32: return 4;
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64: return 8;
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8: return 1;
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8: return 1;
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE: return 8;
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL: return 1;
        default:
            throw std::runtime_error("Unsupported tensor element type: " + std::to_string((int)type));
    }
}

static ONNXTensorElementDataType type_from_string(const char* type_str) {
    if (strcmp(type_str, "float32") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT;
    if (strcmp(type_str, "int32") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32;
    if (strcmp(type_str, "int64") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64;
    if (strcmp(type_str, "uint8") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8;
    if (strcmp(type_str, "int8") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8;
    if (strcmp(type_str, "float64") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE;
    if (strcmp(type_str, "bool") == 0) return ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL;
    return ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED;
}

// nativeRunSession:
// inputNames: String[], inputTypes: String[], inputShapes: int[][], inputData: byte[][]
// Returns: RunResult object with outputNames, outputTypes, outputShapes, outputData
JNIEXPORT jobject JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeRunSession(
    JNIEnv* env, jobject thiz, jstring session_id_j,
    jobjectArray input_names_j, jobjectArray input_types_j,
    jobjectArray input_shapes_j, jobjectArray input_data_j) {

    try {
        const char* sid = env->GetStringUTFChars(session_id_j, nullptr);
        std::string session_id(sid);
        env->ReleaseStringUTFChars(session_id_j, sid);

        std::shared_ptr<SessionData> session_data;
        {
            std::lock_guard<std::mutex> lock(g_mutex);
            auto it = g_sessions.find(session_id);
            if (it == g_sessions.end()) {
                throw std::runtime_error("Session not found: " + session_id);
            }
            session_data = it->second;
        }

        OrtAllocator* allocator;
        check_ort_status(g_ort, g_ort->GetAllocatorWithDefaultOptions(&allocator));

        OrtMemoryInfo* memory_info;
        check_ort_status(g_ort, g_ort->CreateCpuMemoryInfo(OrtArenaAllocator, OrtMemTypeDefault, &memory_info));

        int num_inputs = env->GetArrayLength(input_names_j);

        std::vector<OrtValue*> input_tensors(num_inputs);
        std::vector<const char*> input_name_ptrs(num_inputs);
        std::vector<std::string> input_name_strs(num_inputs);

        // Keep references to JNI arrays so we can release them after Run
        struct InputRef {
            jbyteArray data_j;
            jbyte* data_ptr;
        };
        std::vector<InputRef> input_refs(num_inputs);

        for (int i = 0; i < num_inputs; i++) {
            // Get input name
            jstring name_j = (jstring)env->GetObjectArrayElement(input_names_j, i);
            const char* name = env->GetStringUTFChars(name_j, nullptr);
            input_name_strs[i] = name;
            input_name_ptrs[i] = input_name_strs[i].c_str();
            env->ReleaseStringUTFChars(name_j, name);

            // Get input type
            jstring type_j = (jstring)env->GetObjectArrayElement(input_types_j, i);
            const char* type_str = env->GetStringUTFChars(type_j, nullptr);
            ONNXTensorElementDataType elem_type = type_from_string(type_str);
            env->ReleaseStringUTFChars(type_j, type_str);

            if (elem_type == ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED) {
                throw std::runtime_error("Unsupported tensor type for input: " + input_name_strs[i]);
            }

            // Get shape
            jintArray shape_j = (jintArray)env->GetObjectArrayElement(input_shapes_j, i);
            int num_dims = env->GetArrayLength(shape_j);
            jint* shape_data = env->GetIntArrayElements(shape_j, nullptr);
            std::vector<int64_t> shape(num_dims);
            size_t total_elements = 1;
            for (int d = 0; d < num_dims; d++) {
                shape[d] = shape_data[d];
                total_elements *= shape_data[d];
            }
            env->ReleaseIntArrayElements(shape_j, shape_data, 0);

            // Get data — keep reference alive until after OrtRun
            jbyteArray data_j = (jbyteArray)env->GetObjectArrayElement(input_data_j, i);
            int data_len = env->GetArrayLength(data_j);
            jbyte* data_ptr = env->GetByteArrayElements(data_j, nullptr);
            input_refs[i] = {data_j, data_ptr};

            size_t expected_size = total_elements * element_size_for_type(elem_type);
            if ((size_t)data_len != expected_size) {
                // Release all held refs before throwing
                for (int j = 0; j <= i; j++) {
                    env->ReleaseByteArrayElements(input_refs[j].data_j, input_refs[j].data_ptr, JNI_ABORT);
                }
                std::ostringstream oss;
                oss << "Data size mismatch for input " << input_name_strs[i]
                    << ": expected " << expected_size << " bytes, got " << data_len;
                throw std::runtime_error(oss.str());
            }

            check_ort_status(g_ort, g_ort->CreateTensorWithDataAsOrtValue(
                memory_info, (void*)data_ptr, data_len,
                shape.data(), num_dims, elem_type, &input_tensors[i]));
        }

        // Prepare output names
        size_t num_outputs = session_data->output_names.size();
        std::vector<const char*> output_name_ptrs(num_outputs);
        for (size_t i = 0; i < num_outputs; i++) {
            output_name_ptrs[i] = session_data->output_names[i].c_str();
        }

        // Run
        std::vector<OrtValue*> output_tensors(num_outputs, nullptr);
        LOGI("Running session %s with %d inputs, %zu outputs", session_id.c_str(), num_inputs, num_outputs);

        check_ort_status(g_ort, g_ort->Run(
            session_data->session, nullptr,
            input_name_ptrs.data(), (const OrtValue* const*)input_tensors.data(), num_inputs,
            output_name_ptrs.data(), num_outputs, output_tensors.data()));

        // Release input tensors and JNI byte array refs
        for (int i = 0; i < num_inputs; i++) {
            g_ort->ReleaseValue(input_tensors[i]);
            env->ReleaseByteArrayElements(input_refs[i].data_j, input_refs[i].data_ptr, JNI_ABORT);
        }

        g_ort->ReleaseMemoryInfo(memory_info);

        // Build result object: RunResult(outputNames, outputTypes, outputShapes, outputData)
        jclass result_cls = env->FindClass("net/siteed/sherpaonnx/handlers/OnnxRunResult");
        jmethodID ctor = env->GetMethodID(result_cls, "<init>",
            "([Ljava/lang/String;[Ljava/lang/String;[[I[[B)V");

        jclass str_cls = env->FindClass("java/lang/String");
        jobjectArray out_names = env->NewObjectArray(num_outputs, str_cls, nullptr);
        jobjectArray out_types = env->NewObjectArray(num_outputs, str_cls, nullptr);

        jclass int_arr_cls = env->FindClass("[I");
        jobjectArray out_shapes = env->NewObjectArray(num_outputs, int_arr_cls, nullptr);

        jclass byte_arr_cls = env->FindClass("[B");
        jobjectArray out_data = env->NewObjectArray(num_outputs, byte_arr_cls, nullptr);

        for (size_t i = 0; i < num_outputs; i++) {
            // Name
            env->SetObjectArrayElement(out_names, i, env->NewStringUTF(session_data->output_names[i].c_str()));

            // Get tensor info
            OrtTensorTypeAndShapeInfo* tensor_info;
            check_ort_status(g_ort, g_ort->GetTensorTypeAndShape(output_tensors[i], &tensor_info));

            ONNXTensorElementDataType elem_type;
            check_ort_status(g_ort, g_ort->GetTensorElementType(tensor_info, &elem_type));

            std::string type_str;
            switch (elem_type) {
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT: type_str = "float32"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32: type_str = "int32"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64: type_str = "int64"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8: type_str = "uint8"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8: type_str = "int8"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE: type_str = "float64"; break;
                case ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL: type_str = "bool"; break;
                default: type_str = "unknown"; break;
            }
            env->SetObjectArrayElement(out_types, i, env->NewStringUTF(type_str.c_str()));

            // Shape
            size_t num_dims;
            check_ort_status(g_ort, g_ort->GetDimensionsCount(tensor_info, &num_dims));
            std::vector<int64_t> dims(num_dims);
            check_ort_status(g_ort, g_ort->GetDimensions(tensor_info, dims.data(), num_dims));

            jintArray shape_arr = env->NewIntArray(num_dims);
            std::vector<jint> shape_ints(num_dims);
            size_t total_elements = 1;
            for (size_t d = 0; d < num_dims; d++) {
                shape_ints[d] = (jint)dims[d];
                total_elements *= dims[d];
            }
            env->SetIntArrayRegion(shape_arr, 0, num_dims, shape_ints.data());
            env->SetObjectArrayElement(out_shapes, i, shape_arr);

            g_ort->ReleaseTensorTypeAndShapeInfo(tensor_info);

            // Data
            void* output_data;
            check_ort_status(g_ort, g_ort->GetTensorMutableData(output_tensors[i], &output_data));
            size_t data_size = total_elements * element_size_for_type(elem_type);

            jbyteArray data_arr = env->NewByteArray(data_size);
            env->SetByteArrayRegion(data_arr, 0, data_size, (const jbyte*)output_data);
            env->SetObjectArrayElement(out_data, i, data_arr);

            g_ort->ReleaseValue(output_tensors[i]);
        }

        LOGI("Session %s run complete", session_id.c_str());
        return env->NewObject(result_cls, ctor, out_names, out_types, out_shapes, out_data);

    } catch (const std::exception& e) {
        LOGE("runSession error: %s", e.what());
        throw_jni_exception(env, e.what());
        return nullptr;
    }
}

JNIEXPORT void JNICALL
Java_net_siteed_sherpaonnx_handlers_OnnxInferenceHandler_nativeReleaseSession(
    JNIEnv* env, jobject thiz, jstring session_id_j) {

    try {
        const char* sid = env->GetStringUTFChars(session_id_j, nullptr);
        std::string session_id(sid);
        env->ReleaseStringUTFChars(session_id_j, sid);

        {
            std::lock_guard<std::mutex> lock(g_mutex);
            auto it = g_sessions.find(session_id);
            if (it == g_sessions.end()) {
                LOGI("Session already released or not found: %s", session_id.c_str());
                return;
            }
            g_sessions.erase(it);
        }
        // SessionData destructor releases ORT resources when last shared_ptr drops
        LOGI("Session released: %s", session_id.c_str());

    } catch (const std::exception& e) {
        LOGE("releaseSession error: %s", e.what());
        throw_jni_exception(env, e.what());
    }
}

} // extern "C"
