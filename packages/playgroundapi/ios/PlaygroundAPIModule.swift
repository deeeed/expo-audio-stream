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
  
  // Helper method to get Essentia module (matching Kotlin implementation but using Swift naming)
  private func getEssentiaModule() -> Any? {
    return essentiaModule
  }

  // Move helper methods to class scope
  private func listAvailableModules() -> [String] {
    guard let context = appContext else {
      print("[PlaygroundAPI] Warning: No app context available")
      return []
    }
    
    let moduleNames = context.moduleRegistry.getModuleNames()
    print("[PlaygroundAPI] All available modules:")
    
    for name in moduleNames {
      print("[PlaygroundAPI] - Module: \(name)")
    }
    
    return moduleNames
  }

  private func isModuleAvailable(_ className: String) -> Bool {
    guard let context = appContext else {
      return false
    }
    
    // First check if the class exists
    let classExists = NSClassFromString(className) != nil
    
    // Then check if it's registered in the module registry
    let moduleNames = context.moduleRegistry.getModuleNames()
    
    // Print all module names for debugging
    print("[PlaygroundAPI] Available modules for comparison:")
    moduleNames.forEach { name in
        print("[PlaygroundAPI] - '\(name)' vs '\(className)'")
    }
    
    // Exact match instead of contains
    let moduleExists = moduleNames.contains(className)
    
    print("[PlaygroundAPI] Checking module availability: \(className)")
    print("[PlaygroundAPI] - Class exists: \(classExists)")
    print("[PlaygroundAPI] - Module registered: \(moduleExists)")
    print("[PlaygroundAPI] - Module names: \(moduleNames)")
    
    return moduleExists // Return just moduleExists since we're checking exact names
  }

  // Get the Essentia module through React Native bridge
  private var essentiaModule: Any? {
    guard let context = appContext,
          let bridge = context.reactBridge else {
        print("[PlaygroundAPI] Warning: No React bridge available")
        return nil
    }

    // Get module directly since we know it exists as "Essentia"
    if let module = bridge.module(forName: "Essentia") {
        print("[PlaygroundAPI] Found Essentia module: \(type(of: module))")
        return module
    }
    return nil
  }

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
    
    // Update validateEssentiaIntegration to match Kotlin implementation
    AsyncFunction("validateEssentiaIntegration") {
      var result: [String: Any] = [
        "success": true,
        "validationSteps": [] as [String]
      ]
      
      var steps = result["validationSteps"] as! [String]
      steps.append("Starting Essentia module validation")
      
      do {
        if let essentiaModuleClass = NSClassFromString("net_siteed_essentia_EssentiaModule") {
          result["essentiaModuleClassFound"] = true
          result["essentiaModuleClassName"] = String(describing: essentiaModuleClass)
          steps.append("Found EssentiaModule class")
          
          if let instance = self.getEssentiaModule() as? NSObject {
            steps.append("Attempting to call testNativeBridge native method")
            
            let testSelector = NSSelectorFromString("testNativeBridge")
            if instance.responds(to: testSelector) {
              if let testResult = instance.perform(testSelector)?.takeUnretainedValue() as? String {
                result["jniTestResult"] = testResult
                result["jniConnectionSuccessful"] = true
                steps.append("Successfully called native method")
              } else {
                result["jniTestResult"] = "No result"
                result["jniConnectionSuccessful"] = false
                steps.append("Method call returned no result")
              }
            } else {
              steps.append("Method 'testNativeBridge' not found")
              result["jniConnectionSuccessful"] = false
            }
          } else {
            steps.append("Failed to create module instance")
            result["success"] = false
          }
        } else {
          result["essentiaModuleClassFound"] = false
          result["essentiaModuleClassError"] = "Class not found"
          steps.append("Failed to find EssentiaModule class")
          result["success"] = false
        }
        
        result["validationSteps"] = steps
        return result
      } catch {
        return [
          "success": false,
          "error": error.localizedDescription,
          "errorType": String(describing: type(of: error))
        ]
      }
    }

    AsyncFunction("checkModuleImports") {
      print("[PlaygroundAPI] Starting module imports check...")
      var result: [String: Any] = [:]
      
      // Check AudioProcessor
      if let audioModule = audioModule {
          print("[PlaygroundAPI] AudioModule found: \(String(describing: type(of: audioModule)))")
          result["audioModuleImported"] = true
          result["audioModuleClass"] = String(describing: type(of: audioModule))
          
          // Try to create an AudioProcessor instance
          do {
              let url = URL(string: "file://test.wav")!
              let processor = try AudioProcessor(
                  url: url,
                  resolve: { _ in },
                  reject: { _, _ in }
              )
              result["audioProcessorImported"] = true
              result["audioProcessorClass"] = String(describing: type(of: processor))
          } catch {
              print("[PlaygroundAPI] Error during audio processing tests: \(error)")
              result["audioProcessorError"] = error.localizedDescription
          }
      } else {
          result["audioModuleImported"] = false
          result["audioModuleError"] = "Module not found"
      }
      
      // Check Essentia (as a React Native module)
      if let essentia = essentiaModule {
          result["essentiaModuleImported"] = true
          result["essentiaModuleClass"] = String(describing: type(of: essentia))
          result["essentiaModuleType"] = "react-native"
      } else {
          result["essentiaModuleImported"] = false
          result["essentiaModuleError"] = "Module not found in React Native bridge"
          result["essentiaModuleType"] = "react-native"
      }
      
      // Add list of available modules
      result["availableModules"] = listAvailableModules()
      
      // Check specific modules
      let modules = [
          ["name": "ExpoAudioStream", "class": "ExpoAudioStream"],
          ["name": "PlaygroundAPI", "class": "PlaygroundAPI"]
      ]
      
      result["modules"] = modules.map { moduleInfo -> [String: Any] in
          let name = moduleInfo["name"]!
          return ["name": name, "exists": isModuleAvailable(name)]
      }
      
      result["success"] = true
      return result
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
