import Foundation
import COnnxRuntime

@objc public class SherpaOnnxInferenceHandler: NSObject {
    private static let TAG = "[SherpaOnnxInference]"

    private class SessionData {
        let session: OpaquePointer
        let inputNames: [String]
        let outputNames: [String]
        let api: UnsafePointer<OrtApi>

        init(session: OpaquePointer, inputNames: [String], outputNames: [String], api: UnsafePointer<OrtApi>) {
            self.session = session
            self.inputNames = inputNames
            self.outputNames = outputNames
            self.api = api
        }

        deinit {
            api.pointee.ReleaseSession(session)
        }
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
        sessions.removeAll()  // SessionData.deinit releases ORT sessions via ARC
        lock.unlock()

        if let api = getApi(), let env = globalEnv {
            api.pointee.ReleaseEnv(env)
        }
    }

    private func getOrCreateEnv(_ api: UnsafePointer<OrtApi>) -> OpaquePointer? {
        lock.lock()
        defer { lock.unlock() }
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
            NSLog("%@ Unsupported tensor element type: %d", SherpaOnnxInferenceHandler.TAG, type.rawValue)
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
        default:        return ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED
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
        default: return "unknown"
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
        status = api.pointee.SetIntraOpNumThreads(sessionOptions, Int32(numThreads))
        if let err = checkStatus(api, status) {
            api.pointee.ReleaseSessionOptions(sessionOptions)
            return ["success": false, "error": "SetIntraOpNumThreads failed: \(err)"]
        }

        // Create session
        var session: OpaquePointer? = nil
        status = api.pointee.CreateSession(env, modelPath, sessionOptions, &session)
        api.pointee.ReleaseSessionOptions(sessionOptions)

        if let err = checkStatus(api, status) {
            return ["success": false, "error": "CreateSession failed: \(err)"]
        }

        // Get allocator (typed pointer)
        var allocator: UnsafeMutablePointer<OrtAllocator>? = nil
        status = api.pointee.GetAllocatorWithDefaultOptions(&allocator)
        if let err = checkStatus(api, status) {
            api.pointee.ReleaseSession(session!)
            return ["success": false, "error": "GetAllocatorWithDefaultOptions failed: \(err)"]
        }

        // Get input names
        var inputCount: Int = 0
        status = api.pointee.SessionGetInputCount(session, &inputCount)
        if let err = checkStatus(api, status) {
            api.pointee.ReleaseSession(session!)
            return ["success": false, "error": "SessionGetInputCount failed: \(err)"]
        }
        var inputNames: [String] = []
        for i in 0..<inputCount {
            var name: UnsafeMutablePointer<CChar>? = nil
            status = api.pointee.SessionGetInputName(session, i, allocator, &name)
            if let err = checkStatus(api, status) {
                api.pointee.ReleaseSession(session!)
                return ["success": false, "error": "SessionGetInputName failed: \(err)"]
            }
            if let name = name {
                inputNames.append(String(cString: name))
                _ = allocator?.pointee.Free(allocator, name)
            }
        }

        // Get input types
        var inputTypes: [String] = []
        for i in 0..<inputCount {
            var typeInfo: OpaquePointer? = nil
            status = api.pointee.SessionGetInputTypeInfo(session, i, &typeInfo)
            if let err = checkStatus(api, status) {
                api.pointee.ReleaseSession(session!)
                return ["success": false, "error": "SessionGetInputTypeInfo failed: \(err)"]
            }
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
        status = api.pointee.SessionGetOutputCount(session, &outputCount)
        if let err = checkStatus(api, status) {
            api.pointee.ReleaseSession(session!)
            return ["success": false, "error": "SessionGetOutputCount failed: \(err)"]
        }
        var outputNames: [String] = []
        for i in 0..<outputCount {
            var name: UnsafeMutablePointer<CChar>? = nil
            status = api.pointee.SessionGetOutputName(session, i, allocator, &name)
            if let err = checkStatus(api, status) {
                api.pointee.ReleaseSession(session!)
                return ["success": false, "error": "SessionGetOutputName failed: \(err)"]
            }
            if let name = name {
                outputNames.append(String(cString: name))
                _ = allocator?.pointee.Free(allocator, name)
            }
        }

        // Get output types
        var outputTypes: [String] = []
        for i in 0..<outputCount {
            var typeInfo: OpaquePointer? = nil
            status = api.pointee.SessionGetOutputTypeInfo(session, i, &typeInfo)
            if let err = checkStatus(api, status) {
                api.pointee.ReleaseSession(session!)
                return ["success": false, "error": "SessionGetOutputTypeInfo failed: \(err)"]
            }
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
            outputNames: outputNames,
            api: api
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

    // MARK: - Run Session (array-based, no JSON serialization)

    @objc public func runSessionWithArrays(_ sessionId: String,
                                           inputNames inNames: [String],
                                           inputTypes inTypes: [String],
                                           inputDims inDims: [String],
                                           inputData inData: [String]) -> NSDictionary {
        NSLog("%@ runSession called for %@", SherpaOnnxInferenceHandler.TAG, sessionId)

        lock.lock()
        guard let data = sessions[sessionId] else {
            lock.unlock()
            return ["success": false, "error": "Session not found: \(sessionId)"]
        }
        lock.unlock()

        guard let api = getApi() else {
            return ["success": false, "error": "Failed to get ORT API"]
        }

        let numInputs = inNames.count

        // Create memory info
        var memoryInfo: OpaquePointer? = nil
        var status = api.pointee.CreateCpuMemoryInfo(OrtArenaAllocator, OrtMemTypeDefault, &memoryInfo)
        if let err = checkStatus(api, status) {
            return ["success": false, "error": "CreateCpuMemoryInfo failed: \(err)"]
        }
        defer { api.pointee.ReleaseMemoryInfo(memoryInfo) }

        // Build input tensors from parallel arrays
        var inputValues: [OpaquePointer?] = []
        var inputBuffers: [UnsafeMutableRawPointer] = []

        for i in 0..<numInputs {
            let typeStr = inTypes[i]
            let dimsStr = inDims[i]
            let dataB64 = inData[i]

            guard let rawData = Data(base64Encoded: dataB64) else {
                for v in inputValues { if let v = v { api.pointee.ReleaseValue(v) } }
                for b in inputBuffers { b.deallocate() }
                return ["success": false, "error": "Invalid base64 for input: \(inNames[i])"]
            }

            let ortType = typeStringToOrt(typeStr)
            if ortType == ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED {
                for v in inputValues { if let v = v { api.pointee.ReleaseValue(v) } }
                for b in inputBuffers { b.deallocate() }
                return ["success": false, "error": "Unknown tensor type '\(typeStr)' for input: \(inNames[i])"]
            }
            let dims: [Int64] = dimsStr.split(separator: ",").map { Int64($0.trimmingCharacters(in: .whitespaces)) ?? 0 }

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
                return ["success": false, "error": "CreateTensor failed for \(inNames[i]): \(err)"]
            }

            inputValues.append(ortValue)
        }

        // Prepare name C strings
        let inputNameCStrings: [UnsafePointer<CChar>?] = inNames.map { UnsafePointer(strdup($0)!) }
        let outputNameCStrings: [UnsafePointer<CChar>?] = data.outputNames.map { UnsafePointer(strdup($0)!) }
        defer {
            for p in inputNameCStrings { if let p = p { free(UnsafeMutablePointer(mutating: p)) } }
            for p in outputNameCStrings { if let p = p { free(UnsafeMutablePointer(mutating: p)) } }
        }

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
                        numInputs,
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

        // Build output response as parallel arrays
        var outNames: [String] = []
        var outTypes: [String] = []
        var outDims: [String] = []
        var outData: [String] = []

        for i in 0..<outputCount {
            guard let outValue = outputValues[i] else { continue }
            defer { api.pointee.ReleaseValue(outValue) }

            outNames.append(data.outputNames[i])

            var typeAndShape: OpaquePointer? = nil
            status = api.pointee.GetTensorTypeAndShape(outValue, &typeAndShape)
            if let err = checkStatus(api, status) {
                for j in (i+1)..<outputCount {
                    if let v = outputValues[j] { api.pointee.ReleaseValue(v) }
                }
                return ["success": false, "error": "GetTensorTypeAndShape failed: \(err)"]
            }
            guard let typeAndShape = typeAndShape else { continue }
            defer { api.pointee.ReleaseTensorTypeAndShapeInfo(typeAndShape) }

            var elementType: ONNXTensorElementDataType = ONNX_TENSOR_ELEMENT_DATA_TYPE_UNDEFINED
            status = api.pointee.GetTensorElementType(typeAndShape, &elementType)
            if let err = checkStatus(api, status) {
                for j in (i+1)..<outputCount {
                    if let v = outputValues[j] { api.pointee.ReleaseValue(v) }
                }
                return ["success": false, "error": "GetTensorElementType failed: \(err)"]
            }
            outTypes.append(ortTypeToString(elementType))

            var dimCount: Int = 0
            status = api.pointee.GetDimensionsCount(typeAndShape, &dimCount)
            if let err = checkStatus(api, status) {
                for j in (i+1)..<outputCount {
                    if let v = outputValues[j] { api.pointee.ReleaseValue(v) }
                }
                return ["success": false, "error": "GetDimensionsCount failed: \(err)"]
            }
            var dims = [Int64](repeating: 0, count: dimCount)
            if dimCount > 0 {
                status = dims.withUnsafeMutableBufferPointer { ptr in
                    api.pointee.GetDimensions(typeAndShape, ptr.baseAddress, dimCount)
                }
                if let err = checkStatus(api, status) {
                    for j in (i+1)..<outputCount {
                        if let v = outputValues[j] { api.pointee.ReleaseValue(v) }
                    }
                    return ["success": false, "error": "GetDimensions failed: \(err)"]
                }
            }
            outDims.append(dims.map { String($0) }.joined(separator: ","))

            var rawPtr: UnsafeMutableRawPointer? = nil
            status = api.pointee.GetTensorMutableData(outValue, &rawPtr)
            if let err = checkStatus(api, status) {
                for j in (i+1)..<outputCount {
                    if let v = outputValues[j] { api.pointee.ReleaseValue(v) }
                }
                return ["success": false, "error": "GetTensorMutableData failed: \(err)"]
            }
            guard let dataPtr = rawPtr else {
                outData.append("")
                continue
            }

            let totalElements = dims.reduce(1) { $0 * Int($1) }
            let elSize = elementSize(for: elementType)
            if elSize == 0 {
                for j in (i+1)..<outputCount {
                    if let v = outputValues[j] { api.pointee.ReleaseValue(v) }
                }
                return ["success": false, "error": "Unsupported output tensor element type: \(elementType.rawValue)"]
            }
            let dataSize = totalElements * elSize
            let resultData = Data(bytes: dataPtr, count: dataSize)
            outData.append(resultData.base64EncodedString())
        }

        return [
            "success": true,
            "outputNames": outNames,
            "outputTypes": outTypes,
            "outputDims": outDims,
            "outputData": outData
        ]
    }

    // MARK: - Release Session

    @objc public func releaseSession(_ sessionId: String) -> NSDictionary {
        NSLog("%@ releaseSession called for %@", SherpaOnnxInferenceHandler.TAG, sessionId)

        lock.lock()
        let data = sessions.removeValue(forKey: sessionId)
        lock.unlock()

        guard data != nil else {
            return ["released": false]
        }

        // SessionData.deinit releases ORT session via ARC when last reference drops
        NSLog("%@ Session released: %@", SherpaOnnxInferenceHandler.TAG, sessionId)
        return ["released": true]
    }
}
