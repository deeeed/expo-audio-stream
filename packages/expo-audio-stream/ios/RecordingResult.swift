// RecordingResult.swift

struct RecordingResult {
    var fileUri: String
    var filename: String
    var mimeType: String
    var duration: Int64
    var size: Int64
    var channels: Int
    var bitDepth: Int
    var sampleRate: Double
    var compression: CompressedRecordingInfo?
}

struct StartRecordingResult {
    var fileUri: String
    var mimeType: String
    var channels: Int
    var bitDepth: Int
    var sampleRate: Double
    var compression: CompressedRecordingInfo?
}
