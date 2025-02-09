package net.siteed.audiostream

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.os.bundleOf
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.interfaces.permissions.Permissions

class ExpoAudioStreamModule : Module(), EventSender {
    private lateinit var audioRecorderManager: AudioRecorderManager
    private lateinit var audioProcessor: AudioProcessor

    @RequiresApi(Build.VERSION_CODES.R)
    override fun definition() = ModuleDefinition {
        // The module will be accessible from `requireNativeModule('ExpoAudioStream')` in JavaScript.
        Name("ExpoAudioStream")

        Events(
            Constants.AUDIO_EVENT_NAME,
            Constants.AUDIO_ANALYSIS_EVENT_NAME,
            Constants.RECORDING_INTERRUPTED_EVENT_NAME
        )

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
            try {
                val fileUri = requireNotNull(options["fileUri"] as? String) { "fileUri is required" }
                
                // Get decoding options
                val decodingOptionsMap = options["decodingOptions"] as? Map<String, Any>
                val decodingConfig = if (decodingOptionsMap != null) {
                    DecodingConfig(
                        targetSampleRate = decodingOptionsMap["targetSampleRate"] as? Int,
                        targetChannels = decodingOptionsMap["targetChannels"] as? Int,
                        targetBitDepth = (decodingOptionsMap["targetBitDepth"] as? Int) ?: 16,
                        normalizeAudio = (decodingOptionsMap["normalizeAudio"] as? Boolean) ?: false
                    )
                } else null

                val audioData = audioProcessor.loadAudioFromAnyFormat(fileUri, decodingConfig)
                    ?: throw IllegalStateException("Failed to load audio file")

                val pointsPerSecond = (options["pointsPerSecond"] as? Double) ?: 20.0
                val algorithm = options["algorithm"] as? String ?: "peak"
                val featuresMap = options["features"] as? Map<*, *>
                val features = featuresMap?.filterKeys { it is String }
                    ?.filterValues { it is Boolean }
                    ?.mapKeys { it.key as String }
                    ?.mapValues { it.value as Boolean }
                    ?: emptyMap()

                val recordingConfig = RecordingConfig(
                    sampleRate = audioData.sampleRate,
                    channels = audioData.channels,
                    encoding = when (audioData.bitDepth) {
                        8 -> "pcm_8bit"
                        16 -> "pcm_16bit"
                        32 -> "pcm_32bit"
                        else -> throw IllegalArgumentException("Unsupported bit depth: ${audioData.bitDepth}")
                    },
                    pointsPerSecond = pointsPerSecond,
                    algorithm = algorithm,
                    features = features
                )

                Log.d(Constants.TAG, "extractAudioAnalysis: $recordingConfig")
                audioProcessor.resetCumulativeAmplitudeRange()

                val analysisData = audioProcessor.processAudioData(audioData.data, recordingConfig)
                promise.resolve(analysisData.toDictionary())
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Audio processing failed: ${e.message}", e)
                promise.reject("PROCESSING_ERROR", e.message ?: "Unknown error", e)
            }
        }

        AsyncFunction("resumeRecording") { promise: Promise ->
            audioRecorderManager.resumeRecording(promise)
        }

        AsyncFunction("stopRecording") { promise: Promise ->
            audioRecorderManager.stopRecording(promise)
        }

        AsyncFunction("requestPermissionsAsync") { promise: Promise ->
            try {
                val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)

                // Add foreground service permission for Android 14+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    Log.d(Constants.TAG, "Adding FOREGROUND_SERVICE_MICROPHONE permission request")
                    permissions.add(Manifest.permission.FOREGROUND_SERVICE_MICROPHONE)
                }

                Log.d(Constants.TAG, "Requesting permissions: $permissions")
                Permissions.askForPermissionsWithPermissionsManager(
                    appContext.permissions,
                    promise,
                    *permissions.toTypedArray()
                )
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Error requesting permissions", e)
                promise.reject("PERMISSION_ERROR", "Failed to request permissions: ${e.message}", e)
            }
        }

        AsyncFunction("getPermissionsAsync") { promise: Promise ->
            val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                permissions.add(Manifest.permission.FOREGROUND_SERVICE_MICROPHONE)
            }

            Permissions.getPermissionsWithPermissionsManager(
                appContext.permissions,
                promise,
                *permissions.toTypedArray()
            )
        }

        AsyncFunction("requestNotificationPermissionsAsync") { promise: Promise ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Permissions.askForPermissionsWithPermissionsManager(
                    appContext.permissions,
                    promise,
                    Manifest.permission.POST_NOTIFICATIONS
                )
            } else {
                promise.resolve(
                    bundleOf(
                        "status" to "granted",
                        "expires" to "never",
                        "granted" to true
                    )
                )
            }
        }

        AsyncFunction("getNotificationPermissionsAsync") { promise: Promise ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Permissions.getPermissionsWithPermissionsManager(
                    appContext.permissions,
                    promise,
                    Manifest.permission.POST_NOTIFICATIONS
                )
            } else {
                promise.resolve(
                    bundleOf(
                        "status" to "granted",
                        "expires" to "never",
                        "granted" to true
                    )
                )
            }
        }

        OnDestroy {
            AudioRecorderManager.destroy()
        }

        // Add a new function to check if recording is actually running
        AsyncFunction("checkRecordingStatus") { promise: Promise ->
            val isServiceRunning = AudioRecordingService::class.java.name.let { className ->
                val manager = appContext.reactContext?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                manager?.getRunningServices(Integer.MAX_VALUE)
                    ?.any { it.service.className == className }
            } ?: false

            val status = audioRecorderManager.getStatus()
            
            // If service is running but isRecording is false, we need to cleanup
            if (isServiceRunning && !status.getBoolean("isRecording")) {
                audioRecorderManager.cleanup()
                AudioRecordingService.stopService(appContext.reactContext!!)
            }
            
            promise.resolve(status)
        }
    }

    private fun initializeManager() {
        val androidContext =
            appContext.reactContext ?: throw IllegalStateException("Android context not available")
        val permissionUtils = PermissionUtils(androidContext)
        val audioEncoder = AudioDataEncoder()
        audioRecorderManager =
            AudioRecorderManager(androidContext, androidContext.filesDir, permissionUtils, audioEncoder, this)
        audioRecorderManager = AudioRecorderManager.initialize(
            androidContext,
            androidContext.filesDir,
            permissionUtils,
            audioEncoder,
            this
        )
        audioProcessor = AudioProcessor(androidContext.filesDir)
    }


    override fun sendExpoEvent(eventName: String, params: Bundle) {
        Log.d(Constants.TAG, "Sending event: $eventName")
        this@ExpoAudioStreamModule.sendEvent(eventName, params)
    }

}
