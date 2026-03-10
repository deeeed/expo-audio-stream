// packages/sherpa-onnx.rn/ios/native/SherpaOnnxClasses.swift
// NOTE: Config builder functions (sherpaOnnxOnlineModelConfig, sherpaOnnxFeatureConfig, etc.)
// are provided by the upstream SherpaOnnx.swift wrapper in prebuilt/swift/sherpa-onnx/.
// Do NOT re-declare them here — it causes duplicate symbol errors.

import Foundation
import CSherpaOnnx

@objc public class SherpaOnnxTester: NSObject {
    @objc public func testIntegration(_ completion: @escaping ([String: Any]) -> Void) {
        let result = SherpaOnnxFileExists("/tmp")

        var response: [String: Any] = [:]

        if result >= 0 {
            response["status"] = "C library integration successful"
            response["success"] = true
        } else {
            response["status"] = "C library integration failed"
            response["success"] = false
        }

        completion(response)
    }
}
