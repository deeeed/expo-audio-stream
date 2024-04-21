import ExpoModulesCore

let audioDataEvent: String = "AudioData"

public class ExpoAudioStreamModule: Module, AudioStreamManagerDelegate {
    private var streamManager = AudioStreamManager()

    public func definition() -> ModuleDefinition {
        Name("ExpoAudioStream")
        
        // Defines event names that the module can send to JavaScript.
        Events(audioDataEvent)
        
        OnCreate {
            print("Setting streamManager delegate")
            streamManager.delegate = self
        }
           
        AsyncFunction("startRecording") { (options: [String: Any], promise: Promise) in
            self.checkMicrophonePermission { granted in
                guard granted else {
                    promise.reject("PERMISSION_DENIED", "Recording permission has not been granted")
                    return
                }
                
                // Extract settings from provided options, using default values if necessary
                let sampleRate = options["sampleRate"] as? Double ?? 48000.0
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
        print("audioStreamManager debug sending data")
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
        
        print("Sending audio data", eventBody)
        // Emit the event to JavaScript
        sendEvent(audioDataEvent, eventBody)
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
        let filenames = listAudioFiles()
        let documentDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        
        filenames.forEach { filename in
            let fileURL = documentDirectory.appendingPathComponent(filename)
            do {
                try FileManager.default.removeItem(at: fileURL)
                print("Removed file at:", fileURL.path)
            } catch {
                print("Error removing file at \(fileURL.path):", error.localizedDescription)
            }
        }
    }
    
    func listAudioFiles() -> [String] {
        guard let documentDirectory = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false) else {
            print("Failed to access document directory.")
            return []
        }
        
        do {
            let files = try FileManager.default.contentsOfDirectory(at: documentDirectory, includingPropertiesForKeys: nil)
            let audioFiles = files.filter { $0.pathExtension == "pcm" }.map { $0.lastPathComponent }
            return audioFiles
        } catch {
            print("Error listing audio files:", error.localizedDescription)
            return []
        }
    }
    
}
