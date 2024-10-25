// RecordingSettings.swift

struct RecordingSettings {
    var sampleRate: Double
    var desiredSampleRate: Double
    var numberOfChannels: Int = 1
    var bitDepth: Int = 16
    var keepAwake: Bool = true // Keep the device awake while recording
    var maxRecentDataDuration: Double? = 10.0 // Default to 10 seconds
    var enableProcessing: Bool = false // Flag to enable/disable processing
    var pointsPerSecond: Int? = 1000 // Default value
    var algorithm: String? = "rms" // Default algorithm
    var featureOptions: [String: Bool]? = ["rms": true, "zcr": true] // Default features
}
