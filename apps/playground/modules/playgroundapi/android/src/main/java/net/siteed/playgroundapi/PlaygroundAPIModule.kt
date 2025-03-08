package net.siteed.playgroundapi

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL
import android.util.Log
import net.siteed.audiostream.AudioProcessor
import net.siteed.audiostream.DecodingConfig

class PlaygroundAPIModule : Module() {
  // Create a lazy-initialized instance of AudioProcessor
  private val audioProcessor by lazy { 
    AudioProcessor(appContext.reactContext?.filesDir ?: throw IllegalStateException("React context not available")) 
  }
  
  // For safely accessing the Essentia module
  private var essentiaModuleInstance: Any? = null

  // Helper method to get Essentia module
  private fun getEssentiaModule(): Any? {
    if (essentiaModuleInstance != null) return essentiaModuleInstance
    
    try {
      val reactContext = appContext.reactContext ?: return null
      val essentiaClass = Class.forName("net.siteed.essentia.EssentiaModule")
      val constructor = essentiaClass.getConstructor(
        Class.forName("com.facebook.react.bridge.ReactApplicationContext")
      )
      essentiaModuleInstance = constructor.newInstance(reactContext)
      return essentiaModuleInstance
    } catch (e: Exception) {
      Log.e("PlaygroundAPI", "Failed to get Essentia module: ${e.message}", e)
      return null
    }
  }

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('PlaygroundAPI')` in JavaScript.
    Name("PlaygroundAPI")

    // Sets constant properties on the module. Can take a dictionary or a closure that returns a dictionary.
    Constants(
      "PI" to Math.PI
    )

    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      "Hello world! 👋"
    }

    // Add a new function to validate AudioProcessor integration
    AsyncFunction("validateAudioProcessorIntegration") { 
      try {
        val result = mapOf(
          "audioProcessorInitialized" to (true),
          "audioProcessorClass" to audioProcessor.javaClass.name,
          "success" to true,
          "message" to "AudioProcessor is properly integrated"
        )
        result
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "error" to (e.message ?: "Unknown error"),
          "errorType" to e.javaClass.name
        )
      }
    }

    // Enhanced validation function that calls a native method directly
    AsyncFunction("validateEssentiaIntegration") {
      try {
        val result = mutableMapOf(
          "success" to true,
          "validationSteps" to mutableListOf<String>()
        )
        
        val steps = result["validationSteps"] as MutableList<String>
        steps.add("Starting Essentia module validation")
        
        // 1. Check for the existence of the EssentiaModule class
        try {
          val essentiaModuleClass = Class.forName("net.siteed.essentia.EssentiaModule")
          result["essentiaModuleClassFound"] = true
          result["essentiaModuleClassName"] = essentiaModuleClass.name
          steps.add("Found EssentiaModule class")
          
          // 2. Attempt to call a native static method using reflection
          try {
            // Try to get the testJniConnection method
            val testJniMethod = essentiaModuleClass.getDeclaredMethod("testJniConnection")
            testJniMethod.isAccessible = true
            
            // Create a temporary instance of the class with context
            steps.add("Attempting to call testJniConnection native method")
            
            // Create an instance with the ReactContext
            val constructor = essentiaModuleClass.getConstructor(
              Class.forName("com.facebook.react.bridge.ReactApplicationContext")
            )
            val reactContext = appContext.reactContext
            val essentiaInstance = constructor.newInstance(reactContext)
            
            // Call method on instance
            val jniTestResult = testJniMethod.invoke(essentiaInstance) as? String
            
            result["jniTestResult"] = jniTestResult ?: "No result"
            result["jniConnectionSuccessful"] = true
            steps.add("Successfully called native method")
          } catch (e: Exception) {
            steps.add("Failed to call native method: ${e.javaClass.simpleName}")
            
            // Try an alternative approach - loading the library manually
            steps.add("Attempting to load native library manually")
            try {
              System.loadLibrary("react-native-essentia")
              result["manualLibraryLoadSuccessful"] = true
              steps.add("Successfully loaded native library")
            } catch (e2: Exception) {
              result["manualLibraryLoadSuccessful"] = false
              result["manualLibraryLoadError"] = e2.message ?: "Unknown error"
              steps.add("Failed to load native library: ${e2.message}")
            }
          }
          
          // 3. Check if the NAME constant is accessible (doesn't require native methods)
          try {
            val nameField = essentiaModuleClass.getDeclaredField("NAME")
            nameField.isAccessible = true
            val moduleName = nameField.get(null) as? String
            result["essentiaModuleName"] = moduleName ?: "Unknown"
            steps.add("Retrieved module NAME constant: $moduleName")
          } catch (e: Exception) {
            result["essentiaModuleNameError"] = e.message ?: "Unknown error"
            steps.add("Failed to get NAME constant: ${e.message}")
          }
          
        } catch (e: ClassNotFoundException) {
          result["essentiaModuleClassFound"] = false
          result["essentiaModuleClassError"] = "Class not found: ${e.message}"
          steps.add("Failed to find EssentiaModule class")
          result["success"] = false
        }
        
        // 4. Check for native module availability through JNI
        steps.add("Checking native module availability through JNI environment")
        try {
          // This is a different approach that doesn't require creating an EssentiaModule instance
          // It checks if the native library exports the expected symbols
          val Runtime = Runtime.getRuntime()
          val process = Runtime.exec("nm -D /data/app/*/net.siteed.playground-*/lib/arm64/libreact-native-essentia.so | grep testJniConnection")
          val output = process.inputStream.bufferedReader().use { reader -> 
            reader.readText() 
          }
          
          if (output.contains("testJniConnection")) {
            result["nativeSymbolFound"] = true
            steps.add("Found native symbol 'testJniConnection' in library")
          } else {
            result["nativeSymbolFound"] = false
            steps.add("Could not find native symbol in library")
          }
        } catch (e: Exception) {
          // This might fail due to security permissions or if the command is not available
          steps.add("Failed to check native symbols: ${e.message}")
        }
        
        result
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "error" to (e.message ?: "Unknown error"),
          "errorType" to e.javaClass.name,
          "stackTrace" to e.stackTraceToString()
        )
      }
    }

    // Add a function to check module imports
    AsyncFunction("checkModuleImports") {
      try {
        val result = mutableMapOf<String, Any>()
        
        // Check AudioProcessor import
        try {
          val audioProcessorClass = Class.forName("net.siteed.audiostream.AudioProcessor")
          result["audioProcessorImported"] = true
          result["audioProcessorClass"] = audioProcessorClass.name
        } catch (e: Exception) {
          result["audioProcessorImported"] = false
          result["audioProcessorError"] = e.message ?: "Unknown error"
        }
        
        // Check EssentiaModule import
        try {
          val essentiaModuleClass = Class.forName("net.siteed.essentia.EssentiaModule")
          result["essentiaModuleImported"] = true
          result["essentiaModuleClass"] = essentiaModuleClass.name
        } catch (e: Exception) {
          result["essentiaModuleImported"] = false 
          result["essentiaModuleError"] = e.message ?: "Unknown error"
        }
        
        // Test project paths/modules
        result["modules"] = listOf(
          mapOf("name" to "siteed-expo-audio-studio", "exists" to isModuleAvailable(":siteed-expo-audio-studio")),
          mapOf("name" to "siteed_react-native-essentia", "exists" to isModuleAvailable(":siteed_react-native-essentia"))
        )
        
        result["success"] = true
        return@AsyncFunction result
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "error" to (e.message ?: "Unknown error")
        )
      }
    }
    
    // Add function to test Essentia version
    AsyncFunction("testEssentiaVersion") {
      try {
        val essentia = getEssentiaModule() ?: throw Exception("Failed to get Essentia module")
        val getVersionMethod = essentia.javaClass.getDeclaredMethod("getVersion")
        getVersionMethod.isAccessible = true
        val version = getVersionMethod.invoke(essentia) as String
        mapOf(
          "success" to true,
          "version" to version
        )
      } catch (e: Exception) {
        mapOf(
          "success" to false,
          "error" to (e.message ?: "Unknown error")
        )
      }
    }

    AsyncFunction("setValueAsync") { value: String ->
      // Send an event to JavaScript.
      sendEvent("onChange", mapOf(
        "value" to value
      ))
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of
    // the view definition: Prop, Events.
    View(PlaygroundAPIView::class) {
      // Defines a setter for the `url` prop.
      Prop("url") { view: PlaygroundAPIView, url: URL ->
        view.webView.loadUrl(url.toString())
      }
      // Defines an event that the view can send to JavaScript.
      Events("onLoad")
    }

    // Use the audio processor directly
    AsyncFunction("processAudioWithModule") { fileUri: String ->
      try {
        // Access the audio processor directly since you've already instantiated it
        val result = audioProcessor.loadAudioFromAnyFormat(fileUri, DecodingConfig(
          targetSampleRate = null,
          targetChannels = 1,
          targetBitDepth = 16,
          normalizeAudio = false
        ))
        
        mapOf(
          "moduleAvailable" to true,
          "message" to "Successfully processed audio file",
          "durationMs" to (result?.durationMs ?: 0)
        )
      } catch (e: Exception) {
        mapOf(
          "moduleAvailable" to false,
          "error" to (e.message ?: "Unknown error")
        )
      }
    }
  }
  
  // Helper method to check module availability
  private fun isModuleAvailable(modulePath: String): Boolean {
    return try {
      val reactContext = appContext.reactContext
      if (reactContext != null) {
        // For the purpose of this check, just see if we can load a class from each module
        when (modulePath) {
          ":siteed-expo-audio-studio" -> Class.forName("net.siteed.audiostream.AudioProcessor") != null
          ":siteed_react-native-essentia" -> Class.forName("net.siteed.essentia.EssentiaModule") != null
          else -> false
        }
      } else {
        false
      }
    } catch (e: Exception) {
      false
    }
  }
}
