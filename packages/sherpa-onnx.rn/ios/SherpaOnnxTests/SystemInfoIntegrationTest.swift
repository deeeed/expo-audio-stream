import XCTest
import ExpoModulesTestCore
@testable import sherpa_onnx_rn

class SystemInfoIntegrationTest: XCTestCase {
    
    var module: SherpaOnnxRnModule!
    var mockContext: MockReactApplicationContext!
    
    override func setUp() {
        super.setUp()
        mockContext = MockReactApplicationContext()
        module = SherpaOnnxRnModule(appContext: mockContext)
    }
    
    override func tearDown() {
        module = nil
        mockContext = nil
        super.tearDown()
    }
    
    func testGetSystemInfo() {
        let expectation = self.expectation(description: "System info should be retrieved")
        var systemInfoResult: [String: Any]?
        var errorResult: Error?
        
        // Create a promise-like structure for iOS testing
        let promise = MockPromise { result in
            systemInfoResult = result as? [String: Any]
            expectation.fulfill()
        } onReject: { error in
            errorResult = error
            expectation.fulfill()
        }
        
        // Call getSystemInfo
        module.getSystemInfo(promise)
        
        // Wait for async completion
        waitForExpectations(timeout: 5.0) { error in
            XCTAssertNil(error, "Test should not timeout")
        }
        
        // Verify results
        XCTAssertNil(errorResult, "Should not have error")
        XCTAssertNotNil(systemInfoResult, "Should have system info result")
        
        guard let systemInfo = systemInfoResult else {
            XCTFail("System info result is nil")
            return
        }
        
        // Verify architecture information
        if let architecture = systemInfo["architecture"] as? [String: Any] {
            XCTAssertNotNil(architecture["type"], "Should have architecture type")
            XCTAssertNotNil(architecture["description"], "Should have architecture description")
            XCTAssertNotNil(architecture["moduleType"], "Should have module type")
            
            let archType = architecture["type"] as? String
            XCTAssertTrue(archType == "old" || archType == "new", "Architecture type should be 'old' or 'new'")
        } else {
            XCTFail("Should have architecture information")
        }
        
        // Verify memory information
        if let memory = systemInfo["memory"] as? [String: Any] {
            let totalMemory = memory["totalMemoryMB"] as? Double ?? 0
            let usedMemory = memory["usedMemoryMB"] as? Double ?? 0
            
            XCTAssertGreaterThan(totalMemory, 0, "Total memory should be positive")
            XCTAssertGreaterThanOrEqual(usedMemory, 0, "Used memory should be non-negative")
        } else {
            XCTFail("Should have memory information")
        }
        
        // Verify CPU information
        if let cpu = systemInfo["cpu"] as? [String: Any] {
            let processors = cpu["availableProcessors"] as? Int ?? 0
            let supportedAbis = cpu["supportedAbis"] as? [String] ?? []
            
            XCTAssertGreaterThan(processors, 0, "Should have at least one processor")
            XCTAssertFalse(supportedAbis.isEmpty, "Should have supported ABIs")
            XCTAssertTrue(supportedAbis.contains("arm64"), "iOS should support arm64")
        } else {
            XCTFail("Should have CPU information")
        }
        
        // Verify device information (iOS-specific)
        if let device = systemInfo["device"] as? [String: Any] {
            XCTAssertEqual(device["brand"] as? String, "Apple", "Brand should be Apple")
            XCTAssertEqual(device["manufacturer"] as? String, "Apple", "Manufacturer should be Apple")
            XCTAssertNotNil(device["model"], "Should have device model")
            XCTAssertNotNil(device["iosVersion"], "Should have iOS version")
        } else {
            XCTFail("Should have device information")
        }
        
        // Verify GPU information (iOS-specific)
        if let gpu = systemInfo["gpu"] as? [String: Any] {
            XCTAssertNotNil(gpu["metalVersion"], "Should have Metal version info")
        } else {
            XCTFail("Should have GPU information")
        }
        
        // Verify library status
        let libraryLoaded = systemInfo["libraryLoaded"] as? Bool ?? false
        // Note: Library might not be loaded in test environment, so just verify the field exists
        XCTAssertNotNil(systemInfo["libraryLoaded"], "Should have library loaded status")
        
        // Verify thread information
        if let thread = systemInfo["thread"] as? [String: Any] {
            XCTAssertNotNil(thread["currentThread"], "Should have current thread name")
            XCTAssertNotNil(thread["threadId"], "Should have thread ID")
        } else {
            XCTFail("Should have thread information")
        }
    }
    
    func testArchitectureDetection() {
        let expectation = self.expectation(description: "Architecture info should be retrieved")
        var archInfoResult: [String: Any]?
        var errorResult: Error?
        
        let promise = MockPromise { result in
            archInfoResult = result as? [String: Any]
            expectation.fulfill()
        } onReject: { error in
            errorResult = error
            expectation.fulfill()
        }
        
        module.getArchitectureInfo(promise)
        
        waitForExpectations(timeout: 5.0) { error in
            XCTAssertNil(error, "Test should not timeout")
        }
        
        XCTAssertNil(errorResult, "Should not have error")
        XCTAssertNotNil(archInfoResult, "Should have architecture info result")
        
        // Since getArchitectureInfo now returns full system info,
        // verify it has the same structure as getSystemInfo
        if let archInfo = archInfoResult {
            XCTAssertNotNil(archInfo["architecture"], "Should have architecture info")
            XCTAssertNotNil(archInfo["memory"], "Should have memory info")
            XCTAssertNotNil(archInfo["device"], "Should have device info")
        }
    }
    
    func testSystemInfoPerformance() {
        // Test rapid successive calls to verify performance
        let numCalls = 10
        var durations: [TimeInterval] = []
        
        for i in 0..<numCalls {
            let startTime = CFAbsoluteTimeGetCurrent()
            let expectation = self.expectation(description: "Performance test call \(i)")
            
            let promise = MockPromise { _ in
                let duration = CFAbsoluteTimeGetCurrent() - startTime
                durations.append(duration)
                expectation.fulfill()
            } onReject: { _ in
                expectation.fulfill()
            }
            
            module.getSystemInfo(promise)
            
            waitForExpectations(timeout: 2.0) { error in
                XCTAssertNil(error, "Performance test should not timeout")
            }
        }
        
        // Analyze performance
        let avgDuration = durations.reduce(0, +) / Double(durations.count)
        let maxDuration = durations.max() ?? 0
        
        print("iOS System Info Performance:")
        print("  Average duration: \(String(format: "%.3f", avgDuration))s")
        print("  Max duration: \(String(format: "%.3f", maxDuration))s")
        
        // Performance should be reasonable
        XCTAssertLessThan(avgDuration, 0.1, "Average call should be under 100ms")
        XCTAssertLessThan(maxDuration, 0.2, "Max call should be under 200ms")
    }
}

// Mock classes for testing
class MockReactApplicationContext {
    // Minimal mock implementation
}

class MockPromise {
    private let onResolve: (Any?) -> Void
    private let onReject: (Error) -> Void
    
    init(onResolve: @escaping (Any?) -> Void, onReject: @escaping (Error) -> Void) {
        self.onResolve = onResolve
        self.onReject = onReject
    }
    
    func resolve(_ value: Any?) {
        onResolve(value)
    }
    
    func reject(_ error: Error) {
        onReject(error)
    }
}