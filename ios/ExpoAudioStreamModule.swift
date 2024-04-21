import ExpoModulesCore

public class ExpoAudioStreamModule: Module, AudioStreamManagerDelegate {
    private var streamManager = AudioStreamManager()
    
    public func onCreate() {
        streamManager.delegate = self
    }
    
    public func definition() -> ModuleDefinition {
        Name("ExpoAudioStream")
        
        // Defines event names that the module can send to JavaScript.
        Events("AudioData")
                
        AsyncFunction("startRecording") { (options: [String: Any], promise: Promise) in
            self.checkMicrophonePermission { granted in
                guard granted else {
                    promise.reject("PERMISSION_DENIED", "Recording permission has not been granted")
                    return
                }
                
                // Extract settings from provided options, using default values if necessary
                let sampleRate = options["sampleRate"] as? Double ?? 44100.0
                let numberOfChannels = options["channelConfig"] as? Int ?? 1
                let bitDepth = options["audioFormat"] as? Int ?? 16
                let interval = options["interval"] as? Int ?? 1000
                
                let settings = RecordingSettings(sampleRate: sampleRate, numberOfChannels: numberOfChannels, bitDepth: bitDepth)
                self.streamManager.startRecording(settings: settings, intervalMilliseconds: interval)
                
                promise.resolve(nil)
            }
        }
        
        Function("status") {
            return self.streamManager.getStatus()
        }
        
        AsyncFunction("stopRecording") { (promise: Promise) in
            self.streamManager.stopRecording()
            promise.resolve(nil)
        }
        
        AsyncFunction("listAudioFiles") { (promise: Promise) in
            let files = listAudioFiles()
            promise.resolve(files)
        }
        
        Function("clearAudioFiles") {
            clearAudioFiles()
        }
    }
    
    func audioStreamManager(_ manager: AudioStreamManager, didReceiveAudioData data: Data, recordingTime: TimeInterval, totalDataSize: Int64) {
        guard let fileURL = manager.recordingFileURL else { return }
        let encodedData = data.base64EncodedString()
        
        // Assuming `lastEmittedSize` and `streamUuid` are tracked within `AudioStreamManager`
        let deltaSize = data.count  // This needs to be calculated based on what was last sent if using chunks
        let fileSize = totalDataSize  // Total data size in bytes
        
        // Construct the event payload similar to Android
        let eventBody: [String: Any] = [
            "fileUri": fileURL.absoluteString,
            "from": manager.lastEmittedSize,  // Needs to be maintained within AudioStreamManager
            "encoded": encodedData,
            "deltaSize": deltaSize,
            "totalSize": fileSize,
            "streamUuid": manager.recordingUUID?.uuidString ?? UUID().uuidString
        ]
        
        // Update the last emitted size for the next calculation
        manager.lastEmittedSize += Int64(deltaSize)
        
        // Emit the event to JavaScript
        sendEvent("AudioData", eventBody)
    }
    
    private func checkMicrophonePermission(completion: @escaping (Bool) -> Void) {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            completion(true)
        case .denied:
            completion(false)
        case .undetermined:
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        @unknown default:
            completion(false)
        }
    }
    
    private func clearAudioFiles() {
        let files = listAudioFiles()
        files.forEach { file in
            try? FileManager.default.removeItem(at: file)
        }
    }
    
    func listAudioFiles() -> [URL] {
        let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        let files = try? FileManager.default.contentsOfDirectory(at: documentDirectory!, includingPropertiesForKeys: nil)
        return files?.filter { $0.pathExtension == "pcm" } ?? []
    }
    
}
