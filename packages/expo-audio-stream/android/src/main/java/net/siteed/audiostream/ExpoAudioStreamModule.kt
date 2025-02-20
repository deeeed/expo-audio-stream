// packages/expo-audio-stream/android/src/main/java/net/siteed/audiostream/ExpoAudioStreamModule.kt
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
                
                // Get byte range options (optional)
                val position = (options["position"] as? Number)?.toLong()
                val length = (options["length"] as? Number)?.toLong()
                
                Log.d(Constants.TAG, """
                    Extracting audio analysis:
                    - fileUri: $fileUri
                    - position: ${position ?: "start"}
                    - length: ${length ?: "until end"}
                """.trimIndent())
                
                // Get decoding options
                val decodingOptionsMap = options["decodingOptions"] as? Map<String, Any>
                val decodingConfig = if (decodingOptionsMap != null) {
                    DecodingConfig(
                        targetSampleRate = decodingOptionsMap["targetSampleRate"] as? Int,
                        targetChannels = decodingOptionsMap["targetChannels"] as? Int,
                        targetBitDepth = (decodingOptionsMap["targetBitDepth"] as? Int) ?: 16,
                        normalizeAudio = (decodingOptionsMap["normalizeAudio"] as? Boolean) ?: false
                    ).also {
                        Log.d(Constants.TAG, """
                            Using decoding config:
                            - targetSampleRate: ${it.targetSampleRate ?: "original"}
                            - targetChannels: ${it.targetChannels ?: "original"}
                            - targetBitDepth: ${it.targetBitDepth}
                            - normalizeAudio: ${it.normalizeAudio}
                        """.trimIndent())
                    }
                } else null

                // Convert position/length to time if specified
                val audioData = if (position != null && length != null) {
                    // Get audio format to calculate time
                    val format = audioProcessor.getAudioFormat(fileUri)
                    if (format != null) {
                        val bytesPerSecond = format.sampleRate * format.channels * (format.bitDepth / 8)
                        val startTimeMs = (position * 1000L) / bytesPerSecond
                        val durationMs = (length * 1000L) / bytesPerSecond
                        
                        Log.d(Constants.TAG, """
                            Converting byte range to time:
                            - bytesPerSecond: $bytesPerSecond
                            - startTimeMs: $startTimeMs
                            - durationMs: $durationMs
                        """.trimIndent())
                        
                        audioProcessor.loadAudioRange(
                            fileUri = fileUri,
                            startTimeMs = startTimeMs,
                            endTimeMs = startTimeMs + durationMs,
                            config = decodingConfig ?: DecodingConfig(
                                targetSampleRate = null,
                                targetChannels = null,
                                targetBitDepth = 16,
                                normalizeAudio = false
                            )
                        )
                    } else {
                        Log.w(Constants.TAG, "Could not determine audio format, loading entire file")
                        audioProcessor.loadAudioFromAnyFormat(fileUri, decodingConfig)
                    }
                } else {
                    Log.d(Constants.TAG, "No range specified, loading entire file")
                    audioProcessor.loadAudioFromAnyFormat(fileUri, decodingConfig)
                } ?: throw IllegalStateException("Failed to load audio file")

                val pointsPerSecond = (options["pointsPerSecond"] as? Double) ?: 20.0
                val algorithm = options["algorithm"] as? String ?: "peak"
                val featuresMap = options["features"] as? Map<*, *>
                val features = Features.parseFeatureOptions(featuresMap)

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
                val permissions = mutableListOf(
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.READ_PHONE_STATE
                )

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
            val permissions = mutableListOf(
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.READ_PHONE_STATE
            )

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

        AsyncFunction("extractPreview") { options: Map<String, Any>, promise: Promise ->
            try {
                val fileUri = requireNotNull(options["fileUri"] as? String) { "fileUri is required" }
                val numberOfPoints = (options["numberOfPoints"] as? Int) ?: 100
                val algorithm = (options["algorithm"] as? String)?.lowercase() ?: "rms"
                val startTime = (options["startTime"] as? Number)?.toLong()
                val endTime = (options["endTime"] as? Number)?.toLong()
                
                Log.d(Constants.TAG, """
                    Extracting preview with params:
                    - fileUri: $fileUri
                    - numberOfPoints: $numberOfPoints
                    - algorithm: $algorithm
                    - startTime: ${startTime ?: "none"}
                    - endTime: ${endTime ?: "none"}
                """.trimIndent())
                
                // Get decoding options with defaults
                val decodingOptionsMap = options["decodingOptions"] as? Map<String, Any>
                val decodingConfig = if (decodingOptionsMap != null) {
                    DecodingConfig(
                        targetSampleRate = decodingOptionsMap["targetSampleRate"] as? Int ?: 22050,
                        targetChannels = decodingOptionsMap["targetChannels"] as? Int ?: 1,
                        targetBitDepth = (decodingOptionsMap["targetBitDepth"] as? Int) ?: 16,
                        normalizeAudio = (decodingOptionsMap["normalizeAudio"] as? Boolean) ?: false
                    )
                } else DecodingConfig(
                    targetSampleRate = 16000,
                    targetChannels = 1,
                    targetBitDepth = 16,
                    normalizeAudio = false
                )

                Log.d(Constants.TAG, """
                    Using decoding config:
                    - targetSampleRate: ${decodingConfig.targetSampleRate}
                    - targetChannels: ${decodingConfig.targetChannels}
                    - targetBitDepth: ${decodingConfig.targetBitDepth}
                    - normalizeAudio: ${decodingConfig.normalizeAudio}
                """.trimIndent())

                // Use loadAudioRange when time range is specified, otherwise fall back to loadAudioFromAnyFormat
                val audioData = if (startTime != null && endTime != null) {
                    audioProcessor.loadAudioRange(fileUri, startTime, endTime, decodingConfig)
                } else {
                    audioProcessor.loadAudioFromAnyFormat(fileUri, decodingConfig)
                } ?: throw IllegalStateException("Failed to load audio file")

                val previewConfig = RecordingConfig(
                    sampleRate = audioData.sampleRate,
                    channels = audioData.channels,
                    encoding = when (audioData.bitDepth) {
                        8 -> "pcm_8bit"
                        16 -> "pcm_16bit"
                        32 -> "pcm_32bit"
                        else -> throw IllegalArgumentException("Unsupported bit depth: ${audioData.bitDepth}")
                    },
                    pointsPerSecond = 0.0, // Will be overridden by numberOfPoints
                    algorithm = algorithm,
                    features = emptyMap() // No features needed for preview
                )

                val preview = audioProcessor.generatePreview(
                    audioData = audioData,
                    numberOfPoints = numberOfPoints,
                    startTimeMs = startTime,
                    endTimeMs = endTime,
                    config = previewConfig
                )
                
                Log.d(Constants.TAG, "Preview generated successfully with ${preview.dataPoints.size} points")
                promise.resolve(preview.toDictionary())
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Preview generation failed: ${e.message}", e)
                Log.e(Constants.TAG, "Stack trace: ${e.stackTraceToString()}")
                promise.reject("PROCESSING_ERROR", e.message ?: "Unknown error", e)
            }
        }

        AsyncFunction("trimAudio") { options: Map<String, Any>, promise: Promise ->
            try {
                val fileUri = requireNotNull(options["fileUri"] as? String) { "fileUri is required" }
                val startTimeMs = requireNotNull(options["startTimeMs"] as? Number)?.toLong() 
                    ?: throw IllegalArgumentException("startTimeMs is required")
                val endTimeMs = requireNotNull(options["endTimeMs"] as? Number)?.toLong()
                    ?: throw IllegalArgumentException("endTimeMs is required")
                val outputFileName = options["outputFileName"] as? String
                
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

                Log.d(Constants.TAG, """
                    Trimming audio with params:
                    - fileUri: $fileUri
                    - startTimeMs: $startTimeMs
                    - endTimeMs: $endTimeMs
                    - outputFileName: ${outputFileName ?: "auto-generated"}
                """.trimIndent())

                val trimmedAudio = audioProcessor.trimAudio(
                    fileUri = fileUri,
                    startTimeMs = startTimeMs,
                    endTimeMs = endTimeMs,
                    config = decodingConfig,
                    outputFileName = outputFileName
                ) ?: throw IllegalStateException("Failed to trim audio")

                // Create a map with the available data
                val resultMap = mapOf<String, Any>(
                    "sampleRate" to trimmedAudio.sampleRate,
                    "channels" to trimmedAudio.channels,
                    "bitDepth" to trimmedAudio.bitDepth,
                    "dataSize" to trimmedAudio.data.size
                )

                promise.resolve(resultMap)
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Failed to trim audio: ${e.message}", e)
                promise.reject("TRIM_ERROR", e.message ?: "Unknown error", e)
            }
        }

        AsyncFunction("extractFullFileFeatures") { options: Map<String, Any>, promise: Promise ->
            try {
                val fileUri = requireNotNull(options["fileUri"] as? String) { "fileUri is required" }
                
                val decodingConfig = DecodingConfig(
                    targetSampleRate = 16000,
                    targetChannels = 1,        // Mono audio
                    targetBitDepth = 16,       // 16-bit PCM
                    normalizeAudio = false
                )

                val audioData = audioProcessor.loadAudioFromAnyFormat(fileUri, decodingConfig)
                    ?: throw IllegalStateException("Failed to load audio file")

                val features = audioProcessor.processEntireFile(audioData)
                
                // Use the existing toDictionary() method from Features class
                promise.resolve(features.toDictionary())
                
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Failed to extract full file features", e)
                promise.reject("PROCESSING_ERROR", e.message ?: "Unknown error", e)
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
