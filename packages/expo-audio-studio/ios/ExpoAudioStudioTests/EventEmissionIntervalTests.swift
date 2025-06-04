import XCTest
@testable import ExpoAudioStudio

class EventEmissionIntervalTests: XCTestCase {
    
    var audioStreamManager: AudioStreamManager!
    
    override func setUp() {
        super.setUp()
        audioStreamManager = AudioStreamManager()
    }
    
    override func tearDown() {
        audioStreamManager = nil
        super.tearDown()
    }
    
    func testIntervalClamping() {
        // Test case 1: Interval below minimum (10ms)
        let config1 = RecordingConfig()
        config1.interval = 10
        config1.intervalAnalysis = 10
        
        audioStreamManager.prepareRecording(with: config1) { error in
            XCTAssertNil(error, "Should prepare successfully")
        }
        
        // After our fix, this should be 10ms (0.01s), not 100ms (0.1s)
        XCTAssertEqual(audioStreamManager.emissionInterval, 0.01, accuracy: 0.001)
        XCTAssertEqual(audioStreamManager.emissionIntervalAnalysis, 0.01, accuracy: 0.001)
        
        // Test case 2: Interval at old minimum (100ms)
        let config2 = RecordingConfig()
        config2.interval = 100
        config2.intervalAnalysis = 100
        
        audioStreamManager.prepareRecording(with: config2) { error in
            XCTAssertNil(error, "Should prepare successfully")
        }
        
        XCTAssertEqual(audioStreamManager.emissionInterval, 0.1, accuracy: 0.001)
        XCTAssertEqual(audioStreamManager.emissionIntervalAnalysis, 0.1, accuracy: 0.001)
        
        // Test case 3: Interval above minimum (200ms)
        let config3 = RecordingConfig()
        config3.interval = 200
        config3.intervalAnalysis = 200
        
        audioStreamManager.prepareRecording(with: config3) { error in
            XCTAssertNil(error, "Should prepare successfully")
        }
        
        XCTAssertEqual(audioStreamManager.emissionInterval, 0.2, accuracy: 0.001)
        XCTAssertEqual(audioStreamManager.emissionIntervalAnalysis, 0.2, accuracy: 0.001)
    }
    
    func testEventEmissionTiming() {
        let expectation = self.expectation(description: "Should emit events at correct intervals")
        var eventTimestamps: [TimeInterval] = []
        let testDuration: TimeInterval = 0.5 // 500ms
        
        // Configure for 10ms intervals
        let config = RecordingConfig()
        config.interval = 10
        config.intervalAnalysis = 10
        config.enableProcessing = true
        config.features = ["fft": true]
        
        // Mock event handler to capture timestamps
        audioStreamManager.onAudioData = { _ in
            eventTimestamps.append(Date().timeIntervalSince1970)
        }
        
        audioStreamManager.startRecording(with: config) { error in
            XCTAssertNil(error, "Should start recording successfully")
            
            // Record for test duration
            DispatchQueue.main.asyncAfter(deadline: .now() + testDuration) {
                self.audioStreamManager.stopRecording()
                
                // Analyze intervals
                if eventTimestamps.count > 1 {
                    var intervals: [TimeInterval] = []
                    for i in 1..<eventTimestamps.count {
                        intervals.append((eventTimestamps[i] - eventTimestamps[i-1]) * 1000) // Convert to ms
                    }
                    
                    let avgInterval = intervals.reduce(0, +) / Double(intervals.count)
                    let minInterval = intervals.min() ?? 0
                    let maxInterval = intervals.max() ?? 0
                    
                    print("Event emission intervals - Avg: \(avgInterval)ms, Min: \(minInterval)ms, Max: \(maxInterval)ms")
                    
                    // With the fix, average should be close to 10ms
                    XCTAssertLessThan(abs(avgInterval - 10), 5, "Average interval should be close to 10ms")
                    XCTAssertGreaterThan(minInterval, 5, "Minimum interval should be at least 5ms")
                }
                
                expectation.fulfill()
            }
        }
        
        waitForExpectations(timeout: testDuration + 1.0)
    }
}