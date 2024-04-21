import ExpoModulesCore

public class ExpoAudioStreamModule: Module {
    private var streamManager = AudioStreamManager()
    
    public func definition() -> ModuleDefinition {
        Name("ExpoAudioStream")
        
        // Defines event names that the module can send to JavaScript.
        Events("AudioData")
        
        AsyncFunction("startRecording") { (options: [String: Any], promise: Promise) in
            guard let sampleRate = options["sampleRate"] as? Double,
                  let numberOfChannels = options["numberOfChannels"] as? Int,
                  let bitDepth = options["bitDepth"] as? Int else {
                promise.reject("INVALID_OPTIONS", "Invalid recording options provided")
                return
            }
            
            let settings = RecordingSettings(sampleRate: sampleRate, numberOfChannels: numberOfChannels, bitDepth: bitDepth)
            self.streamManager.startRecording(settings: settings) { success, error in
                if success {
                    promise.resolve(nil)
                } else {
                    promise.reject("START_FAILED", error?.localizedDescription ?? "Unknown error")
                }
            }
        }
        
        Function("status") {
            return self.streamManager.status()
        }
        
        Function("getApiKey") {
            return Bundle.main.object(forInfoDictionaryKey: "MY_CUSTOM_API_KEY") as? String
        }
        
        AsyncFunction("stopRecording") { (promise: Promise) in
            self.streamManager.stopRecording()
            promise.resolve(nil)
        }
        
        AsyncFunction("listAudioFiles") { (promise: Promise) in
            let files = self.streamManager.listAudioFiles().map { $0.absoluteString }
            promise.resolve(files)
        }
        
        Function("clearAudioFiles") {
            self.streamManager.clearAudioFiles()
        }
    }
    
    
}
