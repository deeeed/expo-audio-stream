package net.siteed.audiostream

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.annotation.RequiresApi
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.interfaces.permissions.Permissions

class ExpoAudioStreamModule() : Module(), EventSender {
    private lateinit var audioRecorderManager: AudioRecorderManager
    private lateinit var audioProcessor: AudioProcessor

    @RequiresApi(Build.VERSION_CODES.R)
    override fun definition() = ModuleDefinition {
        // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
        // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
        // The module will be accessible from `requireNativeModule('ExpoAudioStream')` in JavaScript.
        Name("ExpoAudioStream")

        Events(Constants.AUDIO_EVENT_NAME, Constants.AUDIO_ANALYSIS_EVENT_NAME)

        // Initialize AudioRecorderManager
        initializeManager()

        AsyncFunction("startRecording") { options: Map<String, Any?>, promise: Promise ->
            audioRecorderManager.startRecording(options, promise)
        }

        Function("clearAudioFiles") {
            audioRecorderManager.clearAudioStorage()
        }

        Function("status") {
            return@Function audioRecorderManager.getStatus()
        }

        AsyncFunction("listAudioFiles") { promise: Promise ->
            audioRecorderManager.listAudioFiles(promise)
        }

        AsyncFunction("pauseRecording") { promise: Promise ->
            audioRecorderManager.pauseRecording(promise)
        }

        AsyncFunction("extractAudioAnalysis") { options: Map<String, Any>, promise: Promise ->
            val fileUri = options["fileUri"] as? String
            val pointsPerSecond =  (options["pointsPerSecond"] as? Double) ?: 20.0
            val algorithm = options["algorithm"] as? String ?: "rms"
            val featuresMap = options["features"] as? Map<*, *>
            val features = featuresMap?.filterKeys { it is String }
                ?.filterValues { it is Boolean }
                ?.mapKeys { it.key as String }
                ?.mapValues { it.value as Boolean }
                ?: emptyMap()
            val skipWavHeader = (options["skipWavHeader"] as? Boolean) ?: false

            if (fileUri == null) {
                promise.reject("INVALID_ARGUMENTS", "fileUri is required", null)
                return@AsyncFunction
            }

            try {
                val audioData = audioProcessor.loadAudioFile(fileUri, skipWavHeader)
                if (audioData == null) {
                    promise.reject("PROCESSING_ERROR", "Failed to load audio file", null)
                    return@AsyncFunction
                }

                val recordingConfig = RecordingConfig(
                    sampleRate = audioData.sampleRate,
                    channels = audioData.channels,
                    encoding = "pcm_${audioData.bitDepth}bit",
                    pointsPerSecond = pointsPerSecond,
                    algorithm = algorithm,
                    features = features
                )

                Log.d("ExpoAudioStreamModule", "extractAudioAnalysis: $recordingConfig")

                val analysisData = audioProcessor.processAudioData(audioData.data, recordingConfig)
                promise.resolve(analysisData.toDictionary())
            } catch (e: Exception) {
                promise.reject("PROCESSING_ERROR", "Failed to process audio file: ${e.message}", e)
            }
        }

        AsyncFunction("resumeRecording") { promise: Promise ->
            audioRecorderManager.resumeRecording(promise)
        }

        AsyncFunction("stopRecording") { promise: Promise ->
            audioRecorderManager.stopRecording(promise)
        }

        AsyncFunction("requestPermissionsAsync") { promise: Promise ->
            Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.RECORD_AUDIO)
        }

        AsyncFunction("getPermissionsAsync") { promise: Promise ->
            Permissions.getPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun initializeManager() {
        val androidContext =
            appContext.reactContext ?: throw IllegalStateException("Android context not available")
        val permissionUtils = PermissionUtils(androidContext)
        val audioEncoder = AudioDataEncoder()
        audioRecorderManager =
            AudioRecorderManager(androidContext.filesDir, permissionUtils, audioEncoder, this)
        audioProcessor = AudioProcessor(androidContext.filesDir) // Instantiate here with filesDir
    }

    override fun sendExpoEvent(eventName: String, params: Bundle) {
        Log.d(Constants.TAG, "Sending event: $eventName")
        this@ExpoAudioStreamModule.sendEvent(eventName, params)
    }

}
