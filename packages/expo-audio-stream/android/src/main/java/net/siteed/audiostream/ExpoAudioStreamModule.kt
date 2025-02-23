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
import java.util.zip.CRC32

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
                
                // Get time or byte range options
                val startTimeMs = options["startTimeMs"] as? Number
                val endTimeMs = options["endTimeMs"] as? Number
                val position = options["position"] as? Number
                val length = options["length"] as? Number
                val segmentDurationMs = (options["segmentDurationMs"] as? Number)?.toInt() ?: 100
                
                // Validate ranges - can have time range OR byte range OR no range
                val hasTimeRange = startTimeMs != null && endTimeMs != null
                val hasByteRange = position != null && length != null
                
                // Only throw if both ranges are provided
                if (hasTimeRange && hasByteRange) {
                    throw IllegalArgumentException("Cannot specify both time range and byte range")
                }

                // Get decoding options with default configuration
                val defaultConfig = DecodingConfig(
                    targetSampleRate = null,
                    targetChannels = 1, // Default to mono
                    targetBitDepth = 16,
                    normalizeAudio = false
                )
                
                val config = (options["decodingOptions"] as? Map<String, Any>)?.let { decodingOptionsMap ->
                    DecodingConfig(
                        targetSampleRate = decodingOptionsMap["targetSampleRate"] as? Int,
                        targetChannels = decodingOptionsMap["targetChannels"] as? Int,
                        targetBitDepth = (decodingOptionsMap["targetBitDepth"] as? Int) ?: 16,
                        normalizeAudio = (decodingOptionsMap["normalizeAudio"] as? Boolean) ?: false
                    )
                } ?: defaultConfig

                // Load audio data based on range type (or full file if no range specified)
                val audioData = when {
                    hasByteRange -> {
                        val format = audioProcessor.getAudioFormat(fileUri) 
                            ?: throw IllegalArgumentException("Could not determine audio format")
                        
                        // Calculate time range from byte position
                        val bytesPerSecond = format.sampleRate * format.channels * (format.bitDepth / 8)
                        val effectiveStartTimeMs = (position!!.toLong() * 1000) / bytesPerSecond
                        val effectiveEndTimeMs = effectiveStartTimeMs + (length!!.toLong() * 1000) / bytesPerSecond
                        
                        Log.d(Constants.TAG, "Loading audio with byte range: position=$position, length=$length")
                        
                        audioProcessor.loadAudioRange(
                            fileUri = fileUri,
                            startTimeMs = effectiveStartTimeMs,
                            endTimeMs = effectiveEndTimeMs,
                            config = config
                        )
                    }
                    hasTimeRange -> {
                        Log.d(Constants.TAG, "Loading audio with time range: startTimeMs=$startTimeMs, endTimeMs=$endTimeMs")
                        
                        audioProcessor.loadAudioRange(
                            fileUri = fileUri,
                            startTimeMs = startTimeMs!!.toLong(),
                            endTimeMs = endTimeMs!!.toLong(),
                            config = config
                        )
                    }
                    else -> {
                        Log.d(Constants.TAG, "Loading entire audio file")
                        audioProcessor.loadAudioFromAnyFormat(fileUri, config)
                    }
                } ?: throw IllegalStateException("Failed to load audio data")

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
                    segmentDurationMs = segmentDurationMs,
                    features = features
                )

                Log.d(Constants.TAG, "extractAudioAnalysis: $recordingConfig")
                audioProcessor.resetCumulativeAmplitudeRange()

                val analysisData = audioProcessor.processAudioData(audioData.data, recordingConfig)
                promise.resolve(analysisData.toDictionary())
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Failed to extract audio analysis: ${e.message}", e)
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

        AsyncFunction("extractAudioData") { options: Map<String, Any>, promise: Promise ->
            try {
                val fileUri = requireNotNull(options["fileUri"] as? String) { "fileUri is required" }
                val startTimeMs = options["startTimeMs"] as? Number
                val endTimeMs = options["endTimeMs"] as? Number
                val position = options["position"] as? Number
                val length = options["length"] as? Number
                
                // Validate that we have either time range or byte range, but not both and not neither
                val hasTimeRange = startTimeMs != null && endTimeMs != null
                val hasByteRange = position != null && length != null
                
                if (!hasTimeRange && !hasByteRange) {
                    throw IllegalArgumentException("Must specify either time range (startTimeMs, endTimeMs) or byte range (position, length)")
                }
                if (hasTimeRange && hasByteRange) {
                    throw IllegalArgumentException("Cannot specify both time range and byte range")
                }
                
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

                val audioData = if (hasByteRange) {
                    val format = audioProcessor.getAudioFormat(fileUri) 
                        ?: throw IllegalArgumentException("Could not determine audio format")
                    
                    // Calculate time range from byte position
                    val bytesPerSecond = format.sampleRate * format.channels * (format.bitDepth / 8)
                    val effectiveStartTimeMs = (position!!.toLong() * 1000) / bytesPerSecond
                    val effectiveEndTimeMs = effectiveStartTimeMs + (length!!.toLong() * 1000) / bytesPerSecond
                    
                    Log.d(Constants.TAG, """
                        Converting byte range to time range:
                        - position: $position bytes
                        - length: $length bytes
                        - bytesPerSecond: $bytesPerSecond
                        - effectiveStartTimeMs: $effectiveStartTimeMs
                        - effectiveEndTimeMs: $effectiveEndTimeMs
                    """.trimIndent())
                    
                    audioProcessor.loadAudioRange(
                        fileUri = fileUri,
                        startTimeMs = effectiveStartTimeMs,
                        endTimeMs = effectiveEndTimeMs,
                        config = decodingConfig
                    )
                } else {
                    // Must be time range due to earlier validation
                    Log.d(Constants.TAG, """
                        Using time range:
                        - startTimeMs: $startTimeMs
                        - endTimeMs: $endTimeMs
                    """.trimIndent())
                    
                    audioProcessor.loadAudioRange(
                        fileUri = fileUri,
                        startTimeMs = startTimeMs!!.toLong(),
                        endTimeMs = endTimeMs!!.toLong(),
                        config = decodingConfig
                    )
                } ?: throw IllegalStateException("Failed to load audio data")

                Log.d(Constants.TAG, """
                    Audio data loaded successfully:
                    - data size: ${audioData.data.size} bytes
                    - sampleRate: ${audioData.sampleRate}
                    - channels: ${audioData.channels}
                    - bitDepth: ${audioData.bitDepth}
                    - durationMs: ${audioData.durationMs}
                """.trimIndent())

                val includeNormalizedData = options["includeNormalizedData"] as? Boolean ?: false
                val bytesPerSample = audioData.bitDepth / 8
                val samples = audioData.data.size / (bytesPerSample * audioData.channels)
                
                val resultMap = mutableMapOf(
                    "pcmData" to audioData.data,
                    "sampleRate" to audioData.sampleRate,
                    "channels" to audioData.channels,
                    "bitDepth" to audioData.bitDepth,
                    "durationMs" to audioData.durationMs,
                    "format" to "pcm_${audioData.bitDepth}bit",
                    "samples" to samples
                )
                
                // Add checksum if requested
                if (options["computeChecksum"] == true) {
                    val crc32 = CRC32()
                    crc32.update(audioData.data)
                    resultMap["checksum"] = crc32.value.toInt()
                    
                    Log.d(Constants.TAG, "Computed CRC32 checksum: ${crc32.value}")
                }
                
                if (includeNormalizedData) {
                    val float32Data = AudioFormatUtils.convertByteArrayToFloatArray(
                        audioData.data,
                        "pcm_${audioData.bitDepth}bit"
                    )
                    resultMap["normalizedData"] = float32Data
                }
                
                promise.resolve(resultMap)
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Failed to extract audio data: ${e.message}")
                Log.e(Constants.TAG, "Stack trace: ${e.stackTraceToString()}")
                promise.reject("PROCESSING_ERROR", e.message ?: "Unknown error", e)
            }
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
