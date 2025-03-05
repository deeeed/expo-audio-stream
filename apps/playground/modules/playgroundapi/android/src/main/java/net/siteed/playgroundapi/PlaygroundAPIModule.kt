package net.siteed.playgroundapi

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL
import net.siteed.audiostream.AudioProcessor
import net.siteed.audiostream.DecodingConfig

class PlaygroundAPIModule : Module() {
  // Create a lazy-initialized instance of AudioProcessor
  private val audioProcessor by lazy { 
    AudioProcessor(appContext.reactContext?.filesDir ?: throw IllegalStateException("React context not available")) 
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
}
