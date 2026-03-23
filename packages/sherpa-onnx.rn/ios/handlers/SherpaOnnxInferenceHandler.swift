import Foundation
import COnnxRuntime

@objc public class SherpaOnnxInferenceHandler: NSObject {
    private static let TAG = "[SherpaOnnxInference]"

    private struct SessionData {
        let session: OpaquePointer
        let inputNames: [String]
        let outputNames: [String]
    }

    private var sessions: [String: SessionData] = [:]
    private let lock = NSLock()
    private var nextId: Int = 0
    private var globalEnv: OpaquePointer? = nil

    @objc public override init() {
        super.init()
    }

    deinit {
        lock.lock()
        let allSessions = sessions
        sessions.removeAll()
        lock.unlock()

        if let api = getApi() {
            for (_, data) in allSessions {
                api.pointee.ReleaseSession(data.session)
            }
            if let env = globalEnv {
                api.pointee.ReleaseEnv(env)
            }
        }
    }

    private func getOrCreateEnv(_ api: UnsafePointer<OrtApi>) -> OpaquePointer? {
        if let env = globalEnv { return env }
        var env: OpaquePointer? = nil
        let status = api.pointee.CreateEnv(ORT_LOGGING_LEVEL_WARNING, "onnx_inference", &env)
        if let err = checkStatus(api, status) {
            NSLog("%@ Failed to create global OrtEnv: %@", SherpaOnnxInferenceHandler.TAG, err)
            return nil
        }
        globalEnv = env
        return env
    }

    // MARK: - Helpers

    private func getApi() -> UnsafePointer<OrtApi>? {
        guard let apiBase = OrtGetApiBase() else { return nil }
        return apiBase.pointee.GetApi(UInt32(ORT_API_VERSION))
    }

    private func checkStatus(_ api: UnsafePointer<OrtApi>, _ status: OpaquePointer?) -> String? {
        guard let status = status else { return nil }
        guard let msgPtr = api.pointee.GetErrorMessage(status) else {
            api.pointee.ReleaseStatus(status)
            return "Unknown ORT error"
        }
        let msg = String(cString: msgPtr)
        api.pointee.ReleaseStatus(status)
        return msg
    }

    private func elementSize(for type: ONNXTensorElementDataType) -> Int {
        switch type {
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT:  return 4
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8:  return 1
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8:   return 1
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT16:  return 2
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32:  return 4
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64:  return 8
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE: return 8
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT16: return 2
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT32: return 4
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT64: return 8
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL:   return 1
        default:
            NSLog("%@ Unsupported tensor element type: %d, defaulting to 4", SherpaOnnxInferenceHandler.TAG, type.rawValue)
            return 0
        }
    }

    private func typeStringToOrt(_ typeStr: String) -> ONNXTensorElementDataType {
        switch typeStr {
        case "float32": return ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT
        case "int32":   return ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32
        case "int64":   return ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64
        case "uint8":   return ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8
        case "int8":    return ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8
        case "float64": return ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE
        case "bool":    return ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL
        default:        return ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT
        }
    }

    private func ortTypeToString(_ type: ONNXTensorElementDataType) -> String {
        switch type {
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT:  return "float32"
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_UINT8:  return "uint8"
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT8:   return "int8"
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT32:  return "int32"
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64:  return "int64"
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_DOUBLE: return "float64"
        case ONNX_TENSOR_ELEMENT_DATA_TYPE_BOOL:   return "bool"
        default: return "float32"
        }
    }

    // MARK: - Create Session

    @objc public func createSession(_ config: NSDictionary) -> NSDictionary {
        NSLog("%@ createSession called", SherpaOnnxInferenceHandler.TAG)

        guard let modelPath = config["modelPath"] as? String else {
            return ["success": false, "error": "modelPath is required"]
        }
        let numThreads = config["numThreads"] as? Int ?? 1

        guard let api = getApi() else {
            return ["success": false, "error": "Failed to get ORT API"]
        }

        guard let env = getOrCreateEnv(api) else {
            return ["success": false, "error": "Failed to create ORT environment"]
        }

        // Create session options
        var sessionOptions: OpaquePointer? = nil
        var status = api.pointee.CreateSessionOptions(&sessionOptions)
        if let err = checkStatus(api, status) {
            return ["success": false, "error": "CreateSessionOptions failed: \(err)"]
        }
        _ = api.pointee.SetIntraOpNumThreads(sessionOptions, Int32(numThreads))

        // Create session
        var session: OpaquePointer? = nil
        status = api.pointee.CreateSession(env, modelPath, sessionOptions, &session)
        api.pointee.ReleaseSessionOptions(sessionOptions)

        if let err = checkStatus(api, status) {
            return ["success": false, "error": "CreateSession failed: \(err)"]
        }

        // Get allocator (typed pointer)
        var allocator: UnsafeMutablePointer<OrtAllocator>? = nil
        _ = api.pointee.GetAllocatorWithDefaultOptions(&allocator)

        // Get input names
        var inputCount: Int = 0
        _ = api.pointee.SessionGetInputCount(session, &inputCount)
        var inputNames: [String] = []
        for i in 0..<inputCount {
            var name: UnsafeMutablePointer<CChar>? = nil
            _ = api.pointee.SessionGetInputName(session, i, allocator, &name)
            if let name = name {
                inputNames.append(String(cString: name))
                _ = allocator?.pointee.Free(allocator, name)
            }
        }

        // Get input types
        var inputTypes: [String] = []
        for i in 0..<inputCount {
            var typeInfo: OpaquePointer? = nil
            _ = api.pointee.SessionGetInputTypeInfo(session, i, &typeInfo)
            if let typeInfo = typeInfo {
                var tensorInfo: OpaquePointer? = nil
                _ = api.pointee.CastTypeInfoToTensorInfo(typeInfo, &tensorInfo)
                if let tensorInfo = tensorInfo {
                    var elemType: ONNXTensorElementDataType = ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED
                    _ = api.pointee.GetTensorElementType(tensorInfo, &elemType)
                    inputTypes.append(ortTypeToString(elemType))
                }
                api.pointee.ReleaseTypeInfo(typeInfo)
            }
        }

        // Get output names
        var outputCount: Int = 0
        _ = api.pointee.SessionGetOutputCount(session, &outputCount)
        var outputNames: [String] = []
        for i in 0..<outputCount {
            var name: UnsafeMutablePointer<CChar>? = nil
            _ = api.pointee.SessionGetOutputName(session, i, allocator, &name)
            if let name = name {
                outputNames.append(String(cString: name))
                _ = allocator?.pointee.Free(allocator, name)
            }
        }

        // Get output types
        var outputTypes: [String] = []
        for i in 0..<outputCount {
            var typeInfo: OpaquePointer? = nil
            _ = api.pointee.SessionGetOutputTypeInfo(session, i, &typeInfo)
            if let typeInfo = typeInfo {
                var tensorInfo: OpaquePointer? = nil
                _ = api.pointee.CastTypeInfoToTensorInfo(typeInfo, &tensorInfo)
                if let tensorInfo = tensorInfo {
                    var elemType: ONNXTensorElementDataType = ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED
                    _ = api.pointee.GetTensorElementType(tensorInfo, &elemType)
                    outputTypes.append(ortTypeToString(elemType))
                }
                api.pointee.ReleaseTypeInfo(typeInfo)
            }
        }

        // Store session
        lock.lock()
        nextId += 1
        let sessionId = "onnx_\(nextId)"
        sessions[sessionId] = SessionData(
            session: session!,
            inputNames: inputNames,
            outputNames: outputNames
        )
        lock.unlock()

        NSLog("%@ Session created: %@ inputs=%@ outputs=%@", SherpaOnnxInferenceHandler.TAG, sessionId, inputNames, outputNames)
        return [
            "success": true,
            "sessionId": sessionId,
            "inputNames": inputNames,
            "outputNames": outputNames,
            "inputTypes": inputTypes,
            "outputTypes": outputTypes
        ]
    }

    // MARK: - Run Session

    @objc public func runSession(_ sessionId: String, inputsJson: String) -> NSDictionary {
        NSLog("%@ runSession called for %@", SherpaOnnxInferenceHandler.TAG, sessionId)

        lock.lock()
        guard let data = sessions[sessionId] else {
            lock.unlock()
            return ["success": false, "error": "Session not found: \(sessionId)"]
        }
        // Hold lock for entire run to prevent concurrent release
        defer { lock.unlock() }

        guard let api = getApi() else {
            return ["success": false, "error": "Failed to get ORT API"]
        }

        // Parse inputs JSON
        guard let jsonData = inputsJson.data(using: .utf8),
              let inputs = try? JSONSerialization.jsonObject(with: jsonData) as? [String: [String: Any]] else {
            return ["success": false, "error": "Failed to parse inputs JSON"]
        }

        // Create memory info
        var memoryInfo: OpaquePointer? = nil
        var status = api.pointee.CreateCpuMemoryInfo(OrtArenaAllocator, OrtMemTypeDefault, &memoryInfo)
        if let err = checkStatus(api, status) {
            return ["success": false, "error": "CreateCpuMemoryInfo failed: \(err)"]
        }
        defer { api.pointee.ReleaseMemoryInfo(memoryInfo) }

        // Build input tensors
        let inputNames = data.inputNames
        var inputValues: [OpaquePointer?] = []
        var inputBuffers: [UnsafeMutableRawPointer] = [] // keep alive until Run completes

        for name in inputNames {
            guard let tensorInfo = inputs[name] else {
                for v in inputValues { if let v = v { api.pointee.ReleaseValue(v) } }
                for b in inputBuffers { b.deallocate() }
                return ["success": false, "error": "Missing input tensor: \(name)"]
            }

            guard let typeStr = tensorInfo["type"] as? String,
                  let dimsAny = tensorInfo["dims"] as? [Any],
                  let dataB64 = tensorInfo["data"] as? String,
                  let rawData = Data(base64Encoded: dataB64) else {
                for v in inputValues { if let v = v { api.pointee.ReleaseValue(v) } }
                for b in inputBuffers { b.deallocate() }
                return ["success": false, "error": "Invalid tensor format for input: \(name)"]
            }

            let ortType = typeStringToOrt(typeStr)
            let dims: [Int64] = dimsAny.map { dim in
                if let n = dim as? Int { return Int64(n) }
                if let n = dim as? Int64 { return n }
                if let n = dim as? Double { return Int64(n) }
                return 0
            }

            // Copy data to a mutable buffer (ORT requires mutable pointer)
            let buffer = UnsafeMutableRawPointer.allocate(byteCount: rawData.count, alignment: 8)
            rawData.copyBytes(to: buffer.assumingMemoryBound(to: UInt8.self), count: rawData.count)
            inputBuffers.append(buffer)

            var ortValue: OpaquePointer? = nil
            var shapeDims = dims
            status = shapeDims.withUnsafeMutableBufferPointer { dimsPtr in
                api.pointee.CreateTensorWithDataAsOrtValue(
                    memoryInfo,
                    buffer,
                    rawData.count,
                    dimsPtr.baseAddress,
                    dims.count,
                    ortType,
                    &ortValue
                )
            }

            if let err = checkStatus(api, status) {
                for v in inputValues { if let v = v { api.pointee.ReleaseValue(v) } }
                for b in inputBuffers { b.deallocate() }
                return ["success": false, "error": "CreateTensor failed for \(name): \(err)"]
            }

            inputValues.append(ortValue)
        }

        // Prepare name C strings (as optional pointers for C API compatibility)
        let inputNameCStrings: [UnsafePointer<CChar>?] = inputNames.map { UnsafePointer(strdup($0)!) }
        let outputNameCStrings: [UnsafePointer<CChar>?] = data.outputNames.map { UnsafePointer(strdup($0)!) }
        defer {
            for p in inputNameCStrings { if let p = p { free(UnsafeMutablePointer(mutating: p)) } }
            for p in outputNameCStrings { if let p = p { free(UnsafeMutablePointer(mutating: p)) } }
        }

        // Prepare output values array
        let outputCount = data.outputNames.count
        var outputValues = [OpaquePointer?](repeating: nil, count: outputCount)

        // Run inference
        status = inputNameCStrings.withUnsafeBufferPointer { inNamesPtr in
            outputNameCStrings.withUnsafeBufferPointer { outNamesPtr in
                inputValues.withUnsafeBufferPointer { inValsPtr in
                    return api.pointee.Run(
                        data.session,
                        nil,
                        inNamesPtr.baseAddress!,
                        inValsPtr.baseAddress!,
                        inputNames.count,
                        outNamesPtr.baseAddress!,
                        outputCount,
                        &outputValues
                    )
                }
            }
        }

        // Release input values and buffers
        for v in inputValues { if let v = v { api.pointee.ReleaseValue(v) } }
        for b in inputBuffers { b.deallocate() }

        if let err = checkStatus(api, status) {
            return ["success": false, "error": "Run failed: \(err)"]
        }

        // Build output response
        var outputsDict: [String: Any] = [:]
        for i in 0..<outputCount {
            guard let outValue = outputValues[i] else { continue }
            defer { api.pointee.ReleaseValue(outValue) }

            let name = data.outputNames[i]

            // Get type and shape
            var typeAndShape: OpaquePointer? = nil
            _ = api.pointee.GetTensorTypeAndShape(outValue, &typeAndShape)
            guard let typeAndShape = typeAndShape else { continue }
            defer { api.pointee.ReleaseTensorTypeAndShapeInfo(typeAndShape) }

            var elementType: ONNXTensorElementDataType = ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED
            _ = api.pointee.GetTensorElementType(typeAndShape, &elementType)

            var dimCount: Int = 0
            _ = api.pointee.GetDimensionsCount(typeAndShape, &dimCount)
            var dims = [Int64](repeating: 0, count: dimCount)
            if dimCount > 0 {
                _ = dims.withUnsafeMutableBufferPointer { ptr in
                    api.pointee.GetDimensions(typeAndShape, ptr.baseAddress, dimCount)
                }
            }

            // Get data
            var rawPtr: UnsafeMutableRawPointer? = nil
            _ = api.pointee.GetTensorMutableData(outValue, &rawPtr)
            guard let dataPtr = rawPtr else { continue }

            let totalElements = dims.reduce(1) { $0 * Int($1) }
            let elSize = elementSize(for: elementType)
            let dataSize = totalElements * elSize
            let outData = Data(bytes: dataPtr, count: dataSize)
            let b64 = outData.base64EncodedString()

            outputsDict[name] = [
                "data": b64,
                "dims": dims.map { NSNumber(value: $0) },
                "type": ortTypeToString(elementType)
            ]
        }

        // Serialize outputs to JSON
        guard let outputJsonData = try? JSONSerialization.data(withJSONObject: outputsDict),
              let outputJsonString = String(data: outputJsonData, encoding: .utf8) else {
            return ["success": false, "error": "Failed to serialize outputs"]
        }

        return ["success": true, "outputs": outputJsonString]
    }

    // MARK: - Release Session

    @objc public func releaseSession(_ sessionId: String) -> NSDictionary {
        NSLog("%@ releaseSession called for %@", SherpaOnnxInferenceHandler.TAG, sessionId)

        lock.lock()
        let data = sessions.removeValue(forKey: sessionId)
        lock.unlock()

        guard let data = data else {
            return ["released": false]
        }

        guard let api = getApi() else {
            return ["released": false]
        }

        api.pointee.ReleaseSession(data.session)

        NSLog("%@ Session released: %@", SherpaOnnxInferenceHandler.TAG, sessionId)
        return ["released": true]
    }
}
