// packages/expo-audio-stream/android/src/main/java/net/siteed/audiostream/ExpoAudioStreamModule.kt
package net.siteed.audiostream

import android.Manifest
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.content.pm.PackageManager
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
    private var enablePhoneStateHandling: Boolean = false // Default to false until we check manifest
    private var enableNotificationHandling: Boolean = false // Default to false until we check manifest
    private var enableBackgroundAudio: Boolean = false // Default to false until we check manifest

    private val audioFileHandler by lazy { 
        AudioFileHandler(appContext.reactContext?.filesDir ?: throw IllegalStateException("React context not available")) 
    }
    
    private val audioTrimmer by lazy { 
        AudioTrimmer(
            appContext.reactContext ?: throw IllegalStateException("React context not available"), 
            audioFileHandler
        ) 
    }

    @RequiresApi(Build.VERSION_CODES.R)
    override fun definition() = ModuleDefinition {
        // The module will be accessible from `requireNativeModule('ExpoAudioStream')` in JavaScript.
        Name("ExpoAudioStream")

        // Check permissions declared in the manifest
        try {
            val context = appContext.reactContext ?: throw IllegalStateException("React context not available")
            val packageInfo = context.packageManager.getPackageInfo(
                context.packageName,
                PackageManager.GET_PERMISSIONS
            )
            
            // Check if READ_PHONE_STATE is in the requested permissions
            enablePhoneStateHandling = packageInfo.requestedPermissions?.contains(Manifest.permission.READ_PHONE_STATE) ?: false
            
            // Check if POST_NOTIFICATIONS is in the requested permissions
            enableNotificationHandling = packageInfo.requestedPermissions?.contains(Manifest.permission.POST_NOTIFICATIONS) ?: false
            
            // Check if background audio is enabled by looking for FOREGROUND_SERVICE permission
            enableBackgroundAudio = packageInfo.requestedPermissions?.contains(Manifest.permission.FOREGROUND_SERVICE) ?: false
            
            Log.d(Constants.TAG, "Phone state handling ${if (enablePhoneStateHandling) "enabled" else "disabled"} based on manifest permissions")
            Log.d(Constants.TAG, "Notification handling ${if (enableNotificationHandling) "enabled" else "disabled"} based on manifest permissions")
            Log.d(Constants.TAG, "Background audio handling ${if (enableBackgroundAudio) "enabled" else "disabled"} based on manifest permissions")
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to check manifest permissions: ${e.message}", e)
            enablePhoneStateHandling = false
            enableNotificationHandling = false
            enableBackgroundAudio = false
        }

        Events(
            Constants.AUDIO_EVENT_NAME,
            Constants.AUDIO_ANALYSIS_EVENT_NAME,
            Constants.RECORDING_INTERRUPTED_EVENT_NAME,
            Constants.TRIM_PROGRESS_EVENT
        )

        // Initialize AudioRecorderManager
        initializeManager()

        // Add a convenience function to check for foreground service permission separately
        fun isForegroundServiceMicRequired(): Boolean {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && enableBackgroundAudio
        }

        AsyncFunction("prepareRecording") { options: Map<String, Any?>, promise: Promise ->
            try {
                // If notifications are requested but permission not in manifest, modify options
                if (options["showNotification"] as? Boolean == true && !enableNotificationHandling) {
                    val modifiedOptions = options.toMutableMap()
                    modifiedOptions["showNotification"] = false
                    Log.d(Constants.TAG, "Notification permission not in manifest, disabling showNotification")
                    
                    if (audioRecorderManager.prepareRecording(modifiedOptions)) {
                        promise.resolve(true)
                    } else {
                        promise.reject("PREPARE_ERROR", "Failed to prepare recording", null)
                    }
                } else {
                    if (audioRecorderManager.prepareRecording(options)) {
                        promise.resolve(true)
                    } else {
                        promise.reject("PREPARE_ERROR", "Failed to prepare recording", null)
                    }
                }
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Error preparing recording", e)
                promise.reject("PREPARE_ERROR", "Failed to prepare recording: ${e.message}", e)
            }
        }

        AsyncFunction("startRecording") { options: Map<String, Any?>, promise: Promise ->
            // If notifications are requested but permission not in manifest, modify options
            if (options["showNotification"] as? Boolean == true && !enableNotificationHandling) {
                val modifiedOptions = options.toMutableMap()
                modifiedOptions["showNotification"] = false
                Log.d(Constants.TAG, "Notification permission not in manifest, disabling showNotification")
                audioRecorderManager.startRecording(modifiedOptions, promise)
            } else {
                audioRecorderManager.startRecording(options, promise)
            }
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
                    Manifest.permission.RECORD_AUDIO
                )

                // Only add phone state permission if enabled
                if (enablePhoneStateHandling) {
                    permissions.add(Manifest.permission.READ_PHONE_STATE)
                }

                // Add foreground service permission for Android 14+ only if background audio is enabled
                if (isForegroundServiceMicRequired()) {
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
                Manifest.permission.RECORD_AUDIO
            )

            // Only add phone state permission if enabled
            if (enablePhoneStateHandling) {
                permissions.add(Manifest.permission.READ_PHONE_STATE)
            }

            // Only check foreground service permission when background audio is enabled
            if (isForegroundServiceMicRequired()) {
                permissions.add(Manifest.permission.FOREGROUND_SERVICE_MICROPHONE)
            }

            Permissions.getPermissionsWithPermissionsManager(
                appContext.permissions,
                promise,
                *permissions.toTypedArray()
            )
        }

        AsyncFunction("requestNotificationPermissionsAsync") { promise: Promise ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && enableNotificationHandling) {
                // Only request notification permissions if enabled in manifest
                Permissions.askForPermissionsWithPermissionsManager(
                    appContext.permissions,
                    promise,
                    Manifest.permission.POST_NOTIFICATIONS
                )
            } else {
                // Either notifications not required or running on Android < 13
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && enableNotificationHandling) {
                // Only check notification permissions if enabled in manifest
                Permissions.getPermissionsWithPermissionsManager(
                    appContext.permissions,
                    promise,
                    Manifest.permission.POST_NOTIFICATIONS
                )
            } else {
                // Either notifications not required or running on Android < 13
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
                val fileUri = options["fileUri"] as? String ?: run {
                    promise.reject("INVALID_URI", "fileUri is required", null)
                    return@AsyncFunction
                }

                Log.d(Constants.TAG, "trimAudio called with fileUri: $fileUri")
                Log.d(Constants.TAG, "Full options: $options")

                val mode = options["mode"] as? String ?: "single"
                val startTimeMs = (options["startTimeMs"] as? Number)?.toLong()
                val endTimeMs = (options["endTimeMs"] as? Number)?.toLong()
                
                @Suppress("UNCHECKED_CAST")
                val ranges = options["ranges"] as? List<Map<String, Long>>
                
                val outputFileName = options["outputFileName"] as? String
                
                @Suppress("UNCHECKED_CAST")
                var outputFormatMap = options["outputFormat"] as? Map<String, Any>
                
                // Validate output format if provided
                if (outputFormatMap != null) {
                    val format = outputFormatMap["format"] as? String
                    if (format != null && format != "wav" && format != "aac" && format != "opus") {
                        Log.w(Constants.TAG, "Requested format '$format' is not fully supported. Using 'aac' instead.")
                        // Create a new map with the corrected format
                        val newOutputFormat = HashMap<String, Any>(outputFormatMap)
                        newOutputFormat["format"] = "aac"
                        outputFormatMap = newOutputFormat
                    }
                }
                
                Log.d(Constants.TAG, "Output format options: $outputFormatMap")
                
                // Create progress listener
                val progressListener = object : AudioTrimmer.ProgressListener {
                    override fun onProgress(progress: Float, bytesProcessed: Long, totalBytes: Long) {
                        sendEvent(Constants.TRIM_PROGRESS_EVENT, mapOf(
                            "progress" to progress,
                            "bytesProcessed" to bytesProcessed,
                            "totalBytes" to totalBytes
                        ))
                    }
                }

                // Record start time
                val startTime = System.currentTimeMillis()

                // Perform the trim operation
                val result = audioTrimmer.trimAudio(
                    fileUri = fileUri,
                    mode = mode,
                    startTimeMs = startTimeMs,
                    endTimeMs = endTimeMs,
                    ranges = ranges,
                    outputFileName = outputFileName,
                    outputFormat = outputFormatMap,
                    progressListener = progressListener
                )

                // Calculate processing time
                val processingTimeMs = System.currentTimeMillis() - startTime
                
                // Add processing time to result
                val resultWithProcessingTime = result.toMutableMap()
                resultWithProcessingTime["processingInfo"] = mapOf(
                    "durationMs" to processingTimeMs
                )

                Log.d(Constants.TAG, "Trim operation completed successfully in ${processingTimeMs}ms: $result")
                promise.resolve(resultWithProcessingTime)
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Error trimming audio: ${e.message}", e)
                promise.reject("TRIM_ERROR", "Error trimming audio: ${e.message}", e)
            }
        }

        AsyncFunction("extractMelSpectrogram") { options: Map<String, Any>, promise: Promise ->
            try {
                // Log all incoming options for debugging
                Log.d(Constants.TAG, "extractMelSpectrogram called with options: $options")
                
                // Extract required parameters with detailed logging
                val fileUri = options["fileUri"] as? String
                Log.d(Constants.TAG, "fileUri: $fileUri")
                if (fileUri == null) {
                    Log.e(Constants.TAG, "Missing required parameter: fileUri")
                    throw IllegalArgumentException("fileUri is required")
                }
                
                val windowSizeMs = options["windowSizeMs"] as? Double
                Log.d(Constants.TAG, "windowSizeMs: $windowSizeMs")
                if (windowSizeMs == null) {
                    Log.e(Constants.TAG, "Missing required parameter: windowSizeMs")
                    throw IllegalArgumentException("windowSizeMs is required")
                }
                
                val hopLengthMs = options["hopLengthMs"] as? Double
                Log.d(Constants.TAG, "hopLengthMs: $hopLengthMs")
                if (hopLengthMs == null) {
                    Log.e(Constants.TAG, "Missing required parameter: hopLengthMs")
                    throw IllegalArgumentException("hopLengthMs is required")
                }
                
                // Handle nMels which might come as Double from JavaScript
                val nMelsValue = options["nMels"]
                Log.d(Constants.TAG, "Raw nMels value: $nMelsValue (type: ${nMelsValue?.javaClass?.name})")
                
                val nMels = when (nMelsValue) {
                    is Int -> nMelsValue
                    is Double -> nMelsValue.toInt()
                    is Number -> nMelsValue.toInt()
                    else -> {
                        Log.e(Constants.TAG, "Missing or invalid required parameter: nMels")
                        throw IllegalArgumentException("nMels is required and must be a number")
                    }
                }
                
                Log.d(Constants.TAG, "Converted nMels: $nMels (from ${nMelsValue?.javaClass?.name})")

                // Extract optional parameters with defaults
                val fMin = options["fMin"] as? Double ?: 0.0
                val fMax = options["fMax"] as? Double
                val windowType = options["windowType"] as? String ?: "hann"
                val normalize = options["normalize"] as? Boolean ?: false
                val logScale = options["logScale"] as? Boolean ?: true
                
                // Fix the conversion from Number to Long to preserve decimal values
                val startTimeMsNumber = options["startTimeMs"] as? Number
                val endTimeMsNumber = options["endTimeMs"] as? Number
                val startTimeMs = startTimeMsNumber?.toLong() ?: startTimeMsNumber?.toDouble()?.toLong()
                val endTimeMs = endTimeMsNumber?.toLong() ?: endTimeMsNumber?.toDouble()?.toLong()

                Log.d(Constants.TAG, """
                    Optional parameters:
                    - fMin: $fMin
                    - fMax: $fMax
                    - windowType: $windowType
                    - normalize: $normalize
                    - logScale: $logScale
                    - startTimeMs: $startTimeMs (original: $startTimeMsNumber)
                    - endTimeMs: $endTimeMs (original: $endTimeMsNumber)
                """.trimIndent())

                // Handle decoding options
                val decodingOptions = options["decodingOptions"] as? Map<String, Any>
                Log.d(Constants.TAG, "Decoding options: $decodingOptions")
                
                val config = decodingOptions?.let {
                    val targetSampleRateValue = it["targetSampleRate"]
                    val targetSampleRate = when (targetSampleRateValue) {
                        is Int -> targetSampleRateValue
                        is Double -> targetSampleRateValue.toInt()
                        is Number -> targetSampleRateValue.toInt()
                        else -> null
                    }
                    
                    val targetChannelsValue = it["targetChannels"]
                    val targetChannels = when (targetChannelsValue) {
                        is Int -> targetChannelsValue
                        is Double -> targetChannelsValue.toInt()
                        is Number -> targetChannelsValue.toInt()
                        else -> 1
                    }
                    
                    val targetBitDepthValue = it["targetBitDepth"]
                    val targetBitDepth = when (targetBitDepthValue) {
                        is Int -> targetBitDepthValue
                        is Double -> targetBitDepthValue.toInt()
                        is Number -> targetBitDepthValue.toInt()
                        else -> 16
                    }
                    
                    val normalizeAudio = it["normalizeAudio"] as? Boolean ?: false
                    
                    DecodingConfig(
                        targetSampleRate = targetSampleRate,
                        targetChannels = targetChannels,
                        targetBitDepth = targetBitDepth,
                        normalizeAudio = normalizeAudio
                    ).also { config ->
                        Log.d(Constants.TAG, """
                            Using decoding config:
                            - targetSampleRate: ${config.targetSampleRate ?: "original"}
                            - targetChannels: ${config.targetChannels ?: "original"}
                            - targetBitDepth: ${config.targetBitDepth}
                            - normalizeAudio: ${config.normalizeAudio}
                        """.trimIndent())
                    }
                } ?: DecodingConfig(targetSampleRate = null, targetChannels = 1, targetBitDepth = 16).also {
                    Log.d(Constants.TAG, "Using default decoding config")
                }

                // Check if the audio data is too short
                if (startTimeMs != null && endTimeMs != null) {
                    val durationMs = endTimeMs - startTimeMs
                    Log.d(Constants.TAG, "Audio duration for spectrogram: $durationMs ms")
                    if (durationMs < 25) {  // 25ms is minimum for a single window
                        Log.w(Constants.TAG, "Audio duration is too short for spectrogram analysis: $durationMs ms")
                        throw IllegalArgumentException("Audio duration must be at least 25ms for spectrogram analysis")
                    }
                }

                // Load audio data with optional time range
                Log.d(Constants.TAG, "Loading audio data...")
                val audioData = when {
                    startTimeMs != null && endTimeMs != null -> {
                        Log.d(Constants.TAG, "Loading audio range: $startTimeMs to $endTimeMs ms")
                        audioProcessor.loadAudioRange(fileUri, startTimeMs, endTimeMs, config)
                    }
                    else -> {
                        Log.d(Constants.TAG, "Loading entire audio file")
                        audioProcessor.loadAudioFromAnyFormat(fileUri, config)
                    }
                }
                
                if (audioData == null) {
                    Log.e(Constants.TAG, "Failed to load audio data")
                    throw IllegalStateException("Failed to load audio data")
                }
                
                Log.d(Constants.TAG, """
                    Audio data loaded successfully:
                    - data size: ${audioData.data.size} bytes
                    - sampleRate: ${audioData.sampleRate}
                    - channels: ${audioData.channels}
                    - bitDepth: ${audioData.bitDepth}
                    - durationMs: ${audioData.durationMs}
                """.trimIndent())

                // Validate that we have enough audio data for processing
                if (audioData.data.size == 0 || audioData.durationMs < windowSizeMs) {
                    Log.e(Constants.TAG, "Audio data is too short for spectrogram analysis: ${audioData.durationMs}ms, data size: ${audioData.data.size} bytes")
                    throw IllegalArgumentException(
                        "Audio data is too short for spectrogram analysis. " +
                        "Duration: ${audioData.durationMs}ms, minimum required: ${windowSizeMs}ms"
                    )
                }

                // Compute mel-spectrogram
                Log.d(Constants.TAG, "Computing mel-spectrogram...")
                val spectrogramData = audioProcessor.extractMelSpectrogram(
                    audioData = audioData,
                    windowSizeMs = windowSizeMs.toFloat(),
                    hopLengthMs = hopLengthMs.toFloat(),
                    nMels = nMels,
                    fMin = fMin.toFloat(),
                    fMax = fMax?.toFloat() ?: (audioData.sampleRate.toFloat() / 2),
                    normalize = normalize,
                    logScaling = logScale,
                    windowType = windowType
                )
                
                Log.d(Constants.TAG, "Mel-spectrogram computed successfully with ${spectrogramData.spectrogram.size} time steps")

                // Convert to map for React Native
                val result = mapOf(
                    "spectrogram" to spectrogramData.spectrogram.map { it.toList() },
                    "sampleRate" to audioData.sampleRate,
                    "nMels" to nMels,
                    "timeSteps" to spectrogramData.spectrogram.size,
                    "durationMs" to audioData.durationMs
                )
                
                Log.d(Constants.TAG, "Returning result with ${result["timeSteps"]} time steps and $nMels mel bands")
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Failed to extract mel-spectrogram: ${e.message}")
                Log.e(Constants.TAG, "Stack trace: ${e.stackTraceToString()}")
                promise.reject("SPECTROGRAM_ERROR", e.message ?: "Unknown error", e)
            }
        }

        OnDestroy {
            AudioRecorderManager.destroy()
        }

        // Add a new function to check if recording is actually running
        AsyncFunction("checkRecordingStatus") { promise: Promise ->
            val isServiceRunning = AudioRecordingService.isServiceRunning()

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
                val includeBase64Data = options["includeBase64Data"] as? Boolean ?: false
                val includeWavHeader = options["includeWavHeader"] as? Boolean ?: false
                val bytesPerSample = audioData.bitDepth / 8
                val samples = audioData.data.size / (bytesPerSample * audioData.channels)
                
                // Create the result map
                val resultMap = mutableMapOf<String, Any>()
                
                // Add WAV header if requested
                if (includeWavHeader) {
                    // Use ByteArrayOutputStream to write the WAV header and data
                    val outputStream = java.io.ByteArrayOutputStream()
                    val audioFileHandler = AudioFileHandler(appContext.reactContext!!.filesDir)
                    
                    // Write the WAV header
                    audioFileHandler.writeWavHeader(
                        outputStream,
                        audioData.sampleRate,
                        audioData.channels,
                        audioData.bitDepth
                    )
                    
                    // Write the PCM data
                    outputStream.write(audioData.data)
                    
                    // Get the complete WAV data
                    val wavData = outputStream.toByteArray()
                    
                    resultMap["pcmData"] = wavData
                    resultMap["hasWavHeader"] = true
                    
                    Log.d(Constants.TAG, "Added WAV header to PCM data, total size: ${wavData.size} bytes")
                } else {
                    resultMap["pcmData"] = audioData.data
                    resultMap["hasWavHeader"] = false
                }
                
                // Add the rest of the data
                resultMap.putAll(mapOf(
                    "sampleRate" to audioData.sampleRate,
                    "channels" to audioData.channels,
                    "bitDepth" to audioData.bitDepth,
                    "durationMs" to audioData.durationMs,
                    "format" to "pcm_${audioData.bitDepth}bit",
                    "samples" to samples
                ))
                
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
                
                if (includeBase64Data) {
                    // Convert the PCM data to a base64 string
                    val base64Data = android.util.Base64.encodeToString(
                        audioData.data, 
                        android.util.Base64.NO_WRAP
                    )
                    resultMap["base64Data"] = base64Data
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
        val filesDir = appContext.reactContext?.filesDir ?: throw IllegalStateException("React context not available")
        val permissionUtils = PermissionUtils(appContext.reactContext!!)
        val audioDataEncoder = AudioDataEncoder()
        audioRecorderManager = AudioRecorderManager(
            appContext.reactContext!!,
            filesDir,
            permissionUtils,
            audioDataEncoder,
            this,
            enablePhoneStateHandling,
            enableBackgroundAudio
        )
        audioProcessor = AudioProcessor(filesDir)
    }


    override fun sendExpoEvent(eventName: String, params: Bundle) {
        Log.d(Constants.TAG, "Sending event: $eventName")
        this@ExpoAudioStreamModule.sendEvent(eventName, params)
    }

}
