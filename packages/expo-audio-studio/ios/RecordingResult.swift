// RecordingResult.swift

struct RecordingResult {
    /// Empty if skipped file writing
    var fileUri: String
    /// Empty if skipped file writing
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
    /// Empty if skipped file writing
    var fileUri: String
    var mimeType: String
    var channels: Int
    var bitDepth: Int
    var sampleRate: Double
    var compression: CompressedRecordingInfo?
}
