// AudioStreamError.swift

enum AudioStreamError: Error {
    case audioSessionSetupFailed(String)
    case fileCreationFailed(URL)
    case audioProcessingError(String)
}
