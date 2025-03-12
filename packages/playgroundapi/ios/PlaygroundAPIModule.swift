import ExpoModulesCore
import ExpoAudioStream

public class PlaygroundAPIModule: Module {
  // Get the audio module using the correct method from ModuleRegistry
  private var audioModule: ExpoAudioStreamModule? {
    // Safely unwrap appContext before accessing moduleRegistry
    guard let context = appContext else {
      return nil
    }
    // Use the moduleWithName method and cast to the correct type
    return context.moduleRegistry.get(moduleWithName: "ExpoAudioStream") as? ExpoAudioStreamModule
  }

  private var audioProcessor: AudioProcessor?
  
  public func definition() -> ModuleDefinition {
   
    // Define the module using the correct pattern
    Name("PlaygroundAPI")
    
    Constants([
      "PI": Double.pi
    ])
    
    Events("onChange")
    
    Function("hello") {
      return "Hello world! 👋"
    }
    
    AsyncFunction("validateAudioProcessorIntegration") {
      let processor = AudioProcessor(
        resolve: { _ in },
        reject: { _, _ in }
      )
      
      return [
        "success": true,
        "message": "AudioProcessor is properly integrated",
        "audioProcessorClass": String(describing: type(of: processor))
      ]
    }
    
    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }
    
    // Initialize the audio processor in the constructor or when needed
    AsyncFunction("initializeAudioProcessor") {
      self.audioProcessor = AudioProcessor(
        resolve: { _ in },
        reject: { _, _ in }
      )
      
      return [
        "success": true,
        "message": "Audio processor initialized successfully"
      ]
    }
    
    AsyncFunction("processAudio") { (fileUri: String) -> [String: Any] in
      // Lazy initialize the audioProcessor if it doesn't exist yet
      if self.audioProcessor == nil {
        self.audioProcessor = AudioProcessor(
          resolve: { _ in },
          reject: { _, _ in }
        )
      }
      
      guard let audioProcessor = self.audioProcessor else {
        throw NSError(domain: "PlaygroundAPI", code: 1, userInfo: [NSLocalizedDescriptionKey: "Audio processor not available"])
      }
      
      // Use the URL initializer and then process the audio
      guard let url = URL(string: fileUri) else {
        throw NSError(domain: "PlaygroundAPI", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid file URI"])
      }
      
      // Create a new processor with the file URL
      let fileProcessor = try AudioProcessor(
        url: url,
        resolve: { _ in /* No-op resolve handler */ },
        reject: { _, _ in /* No-op reject handler */ }
      )
      
      // Extract audio features with default options
      let audioData = fileProcessor.processAudioData(
        numberOfSamples: nil,
        offset: 0,
        length: nil,
        segmentDurationMs: 100,
        featureOptions: [:],
        bitDepth: 16,
        numberOfChannels: 1
      )
      
      guard let data = audioData else {
        throw NSError(domain: "PlaygroundAPI", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to process audio data"])
      }
      
      return [
        "sampleRate": data.sampleRate,
        "channels": data.numberOfChannels,
        "bitDepth": data.bitDepth,
        "durationMs": data.durationMs,
        "dataPoints": data.dataPoints.count
      ]
    }
    
    AsyncFunction("processAudioWithModule") { (fileUri: String) -> [String: Any] in
      do {
        // Lazy initialize the audioProcessor if it doesn't exist yet
        if self.audioProcessor == nil {
          self.audioProcessor = AudioProcessor(
            resolve: { _ in },
            reject: { _, _ in }
          )
        }
        
        guard let audioProcessor = self.audioProcessor else {
          return [
            "moduleAvailable": false,
            "error": "Audio processor not available"
          ]
        }
        
        // Use the URL initializer and then process the audio
        guard let url = URL(string: fileUri) else {
          return [
            "moduleAvailable": false,
            "error": "Invalid file URI"
          ]
        }
        
        // Create a new processor with the file URL
        let fileProcessor = try AudioProcessor(
          url: url,
          resolve: { _ in /* No-op resolve handler */ },
          reject: { _, _ in /* No-op reject handler */ }
        )
        
        // Use the processAudioData method with specific feature options
        let featureOptions: [String: Bool] = [
          "rms": true,
          "energy": true
        ]
        
        // Use the processAudioData method with mono channel configuration
        let audioData = fileProcessor.processAudioData(
          numberOfSamples: nil,
          offset: 0,
          length: nil,
          segmentDurationMs: 100,
          featureOptions: featureOptions,
          bitDepth: 16,
          numberOfChannels: 1  // Force mono channel
        )
        
        guard let data = audioData else {
          return [
            "moduleAvailable": false,
            "error": "Failed to process audio data"
          ]
        }
        
        return [
          "moduleAvailable": true,
          "message": "Successfully processed audio file",
          "durationMs": data.durationMs
        ]
      } catch {
        return [
          "moduleAvailable": false,
          "error": error.localizedDescription
        ]
      }
    }
    
    View(PlaygroundAPIView.self) {
      Prop("url") { (view: PlaygroundAPIView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }
      
      Events("onLoad")
    }
  }
}
