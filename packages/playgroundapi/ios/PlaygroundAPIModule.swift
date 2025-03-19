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
    let moduleExists = moduleNames.contains { name in
      name.contains(className)
    }
    
    print("[PlaygroundAPI] Checking module availability: \(className)")
    print("[PlaygroundAPI] - Class exists: \(classExists)")
    print("[PlaygroundAPI] - Module registered: \(moduleExists)")
    
    return classExists || moduleExists
  }

  // Get the Essentia module through module registry
  private var essentiaModule: Any? {
    guard let context = appContext else {
      print("[PlaygroundAPI] Warning: No app context available for Essentia module")
      return nil
    }
    let module = context.moduleRegistry.get(moduleWithName: "Essentia")
    if let module = module {
      print("[PlaygroundAPI] Found Essentia module: \(String(describing: type(of: module)))")
    } else {
      print("[PlaygroundAPI] Essentia module not found in registry")
    }
    return module
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
      do {
        print("[PlaygroundAPI] Starting module imports check...")
        var result: [String: Any] = [:]
        
        // List all available modules first
        let availableModules = self.listAvailableModules()
        print("[PlaygroundAPI] Found \(availableModules.count) total modules")
        
        // Check AudioProcessor
        if let audioModule = audioModule {
            print("[PlaygroundAPI] AudioModule found: \(String(describing: type(of: audioModule)))")
            result["audioModuleImported"] = true
            result["audioModuleClass"] = String(describing: type(of: audioModule))
            
            // Create a new AudioProcessor instance
            let processor = AudioProcessor(
                resolve: { _ in },
                reject: { _, _ in }
            )
            
            print("[PlaygroundAPI] AudioProcessor created: \(String(describing: type(of: processor)))")
            result["audioProcessorImported"] = true
            result["audioProcessorClass"] = String(describing: type(of: processor))
        } else {
            print("[PlaygroundAPI] AudioModule not found")
            result["audioModuleImported"] = false
            result["audioModuleError"] = "Module not found"
        }
        
        // Check Essentia
        if let essentia = essentiaModule {
          print("[PlaygroundAPI] Essentia module found: \(String(describing: type(of: essentia)))")
          result["essentiaModuleImported"] = true
          result["essentiaModuleClass"] = String(describing: type(of: essentia))
        } else {
          print("[PlaygroundAPI] Essentia module not found")
          result["essentiaModuleImported"] = false
          result["essentiaModuleError"] = "Module not found"
        }
        
        // Add list of all available modules to result
        result["availableModules"] = availableModules
        
        // Check specific modules with detailed logging
        let modules = [
          ["name": "siteed-expo-audio-studio", "class": "AudioProcessor"],
          ["name": "siteed_react-native-essentia", "class": "EssentiaModule"]
        ]
        
        print("[PlaygroundAPI] Checking specific module availability:")
        let modulesStatus = modules.map { moduleInfo -> [String: Any] in
          let name = moduleInfo["name"]!
          let className = moduleInfo["class"]!
          let exists = self.isModuleAvailable(className)
          print("[PlaygroundAPI] - \(name) (\(className)): \(exists)")
          return ["name": name, "exists": exists]
        }
        
        result["modules"] = modulesStatus
        result["success"] = true
        
        print("[PlaygroundAPI] Module imports check completed successfully")
        return result
      } catch {
        print("[PlaygroundAPI] Error during module imports check: \(error)")
        return [
          "success": false,
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
