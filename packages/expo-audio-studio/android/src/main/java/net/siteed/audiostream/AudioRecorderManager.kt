// net/siteed/audiostream/AudioRecorderManager.kt
package net.siteed.audiostream

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.os.bundleOf
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean
import android.os.PowerManager
import android.content.Context
import java.nio.ByteBuffer
import java.nio.ByteOrder
import android.media.AudioManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.telephony.PhoneStateListener
import android.telephony.TelephonyManager
import android.app.ActivityManager
import java.util.UUID
import android.media.AudioDeviceInfo
import net.siteed.audiostream.LogUtils

class AudioRecorderManager(
    private val context: Context,
    private val filesDir: File,
    private val permissionUtils: PermissionUtils,
    private val audioDataEncoder: AudioDataEncoder,
    private val eventSender: EventSender,
    private val enablePhoneStateHandling: Boolean = true,
    private val enableBackgroundAudio: Boolean = true
) {
    companion object {
        private const val CLASS_NAME = "AudioRecorderManager"
        
        @SuppressLint("StaticFieldLeak")
        @Volatile
        private var instance: AudioRecorderManager? = null

        fun getInstance(): AudioRecorderManager? = instance

        fun initialize(
            context: Context,
            filesDir: File,
            permissionUtils: PermissionUtils,
            audioDataEncoder: AudioDataEncoder,
            eventSender: EventSender,
            enablePhoneStateHandling: Boolean = true,
            enableBackgroundAudio: Boolean = true
        ): AudioRecorderManager {
            return instance ?: synchronized(this) {
                instance ?: AudioRecorderManager(
                    context, filesDir, permissionUtils, audioDataEncoder, eventSender,
                    enablePhoneStateHandling, enableBackgroundAudio
                ).also { instance = it }
            }
        }

        fun destroy() {
            instance?.cleanup()
            instance = null
        }
    }
    
    private var audioRecord: AudioRecord? = null
    private var bufferSizeInBytes = 0
    private var _isRecording = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)
    private var streamUuid: String? = null
    private var audioFile: File? = null
    private var recordingThread: Thread? = null
    private var recordingStartTime: Long = 0
    private var totalRecordedTime: Long = 0
    private var totalDataSize = 0
    private var lastEmitTime = SystemClock.elapsedRealtime()
    private var lastPauseTime = 0L
    private var pausedDuration = 0L
    private var lastEmittedSize = 0L
    private var lastEmittedCompressedSize = 0L
    private val mainHandler = Handler(Looper.getMainLooper())
    private val audioRecordLock = Any()
    private var audioFileHandler: AudioFileHandler = AudioFileHandler(filesDir)

    private lateinit var recordingConfig: RecordingConfig
    private var mimeType = "audio/wav"
    private var audioFormat: Int = AudioFormat.ENCODING_PCM_16BIT
    private var audioProcessor: AudioProcessor = AudioProcessor(filesDir)
    private var isFirstChunk = true

    private var wakeLock: PowerManager.WakeLock? = null
    private var wasWakeLockEnabled = false
    private val notificationManager = AudioNotificationManager.getInstance(context)

    private var compressedRecorder: MediaRecorder? = null
    private var compressedFile: File? = null

    private var audioManager: AudioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusChangeListener: AudioManager.OnAudioFocusChangeListener? = null
    private var audioFocusRequest: Any? = null  // Type Any to handle both old and new APIs
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyManager: TelephonyManager? = null
        get() {
            if (field == null) {
                field = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                LogUtils.d(CLASS_NAME, "TelephonyManager initialization: ${if (field != null) "successful" else "failed"}")
            }
            return field
        }

    private var lastEmissionTimeAnalysis = 0L
    private val analysisBuffer = ByteArrayOutputStream()
    private var isFirstAnalysis = true

    // Properties for device disconnection handling
    var isPrepared = false
    private var selectedDeviceId: String? = null
    private var deviceDisconnectionBehavior: String? = null

    // Add a method to handle device changes
    fun handleDeviceChange() {
        if (!_isRecording.get()) {
            LogUtils.d(CLASS_NAME, "handleDeviceChange: Not recording, no action needed")
            return
        }

        if (isPaused.get()) {
            LogUtils.d(CLASS_NAME, "handleDeviceChange: Recording is paused, marking for restart with new device")
            // No immediate action needed when paused, but we'll use the new device on resume
            return
        }

        LogUtils.d(CLASS_NAME, "handleDeviceChange: Restarting recording with new device")
        try {
            // Make a copy of current recording settings
            val currentSettings = recordingConfig
            
            // Pause the current recording
            synchronized(audioRecordLock) {
                if (audioRecord != null && audioRecord!!.state == AudioRecord.STATE_INITIALIZED) {
                    audioRecord!!.stop()
                }
                
                if (compressedRecorder != null) {
                    compressedRecorder!!.pause()
                }
            }
            
            // Release the current audio record resources
            synchronized(audioRecordLock) {
                audioRecord?.release()
                audioRecord = null
            }
            
            // Initialize a new audio record with the same settings
            if (!initializeAudioRecord(object : Promise {
                override fun resolve(value: Any?) {}
                override fun reject(code: String, message: String?, cause: Throwable?) {
                    LogUtils.e(CLASS_NAME, "Failed to reinitialize audio record: $message")
                }
            })) {
                LogUtils.e(CLASS_NAME, "Failed to reinitialize audio record, stopping recording")
                stopRecording(object : Promise {
                    override fun resolve(value: Any?) {
                        eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                            "reason" to "deviceSwitchFailed",
                            "isPaused" to true
                        ))
                    }
                    override fun reject(code: String, message: String?, cause: Throwable?) {}
                })
                return
            }
            
            // Restart the audio record
            synchronized(audioRecordLock) {
                audioRecord?.startRecording()
                
                // Resume compressed recorder if it was active
                if (compressedRecorder != null) {
                    compressedRecorder!!.resume()
                }
            }
            
            // Notify JavaScript
            eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                "reason" to "deviceConnected",
                "isPaused" to false
            ))
            
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error handling device change: ${e.message}", e)
            // If something went wrong, try to pause recording
            pauseRecording(object : Promise {
                override fun resolve(value: Any?) {
                    eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                        "reason" to "deviceSwitchFailed", 
                        "isPaused" to true
                    ))
                }
                override fun reject(code: String, message: String?, cause: Throwable?) {}
            })
        }
    }
    
    // Get the device disconnection behavior
    fun getDeviceDisconnectionBehavior(): String {
        return deviceDisconnectionBehavior ?: "pause" // Default to pause if not specified
    }

    // Add isRecording property accessor
    val isRecording: Boolean
        get() = _isRecording.get()

    private fun initializePhoneStateListener() {
        try {
            LogUtils.d(CLASS_NAME, "Initializing phone state listener...")
            
            if (permissionUtils.checkPhoneStatePermission()) {
                LogUtils.d(CLASS_NAME, "Phone state permission granted")
                
                phoneStateListener = object : PhoneStateListener() {
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        val stateStr = when (state) {
                            TelephonyManager.CALL_STATE_RINGING -> "RINGING"
                            TelephonyManager.CALL_STATE_OFFHOOK -> "OFFHOOK"
                            TelephonyManager.CALL_STATE_IDLE -> "IDLE"
                            else -> "UNKNOWN"
                        }
                        LogUtils.d(CLASS_NAME, "Phone state changed to: $stateStr")

                        when (state) {
                            TelephonyManager.CALL_STATE_RINGING,
                            TelephonyManager.CALL_STATE_OFFHOOK -> {
                                if (_isRecording.get() && !isPaused.get()) {
                                    LogUtils.d(CLASS_NAME, "Pausing recording due to incoming/ongoing call")
                                    mainHandler.post {
                                        pauseRecording(object : Promise {
                                            override fun resolve(value: Any?) {
                                                LogUtils.d(CLASS_NAME, "Successfully paused recording due to call")
                                                eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                                    "reason" to "phoneCall",
                                                    "isPaused" to true
                                                ))
                                            }
                                            override fun reject(code: String, message: String?, cause: Throwable?) {
                                                LogUtils.e(CLASS_NAME, "Failed to pause recording on phone call", cause)
                                            }
                                        })
                                    }
                                }
                            }
                            TelephonyManager.CALL_STATE_IDLE -> {
                                if (_isRecording.get() && isPaused.get()) {
                                    LogUtils.d(CLASS_NAME, "Call ended, handling auto-resume (enabled: ${recordingConfig.autoResumeAfterInterruption})")
                                    if (recordingConfig.autoResumeAfterInterruption) {
                                        mainHandler.post {
                                            resumeRecording(object : Promise {
                                                override fun resolve(value: Any?) {
                                                    LogUtils.d(CLASS_NAME, "Successfully resumed recording after call")
                                                    eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                                        "reason" to "phoneCallEnded",
                                                        "isPaused" to false
                                                    ))
                                                }
                                                override fun reject(code: String, message: String?, cause: Throwable?) {
                                                    LogUtils.e(CLASS_NAME, "Failed to resume recording after phone call", cause)
                                                }
                                            })
                                        }
                                    } else {
                                        LogUtils.d(CLASS_NAME, "Auto-resume disabled, staying paused")
                                        eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                            "reason" to "phoneCallEnded",
                                            "isPaused" to true
                                        ))
                                    }
                                }
                            }
                        }
                    }
                }

                if (telephonyManager != null) {
                    try {
                        telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
                        LogUtils.d(CLASS_NAME, "Successfully registered phone state listener")
                    } catch (e: Exception) {
                        LogUtils.e(CLASS_NAME, "Failed to register phone state listener", e)
                    }
                } else {
                    LogUtils.e(CLASS_NAME, "TelephonyManager is null, cannot register phone state listener")
                }
            } else {
                LogUtils.w(CLASS_NAME, "READ_PHONE_STATE permission not granted, phone call interruption handling disabled")
            }
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to initialize phone state listener", e)
        }
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private val audioFocusCallback = object : AudioManager.OnAudioFocusChangeListener {
        override fun onAudioFocusChange(focusChange: Int) {
            when (focusChange) {
                AudioManager.AUDIOFOCUS_LOSS,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                    if (_isRecording.get() && !isPaused.get()) {
                        mainHandler.post {
                            pauseRecording(object : Promise {
                                override fun resolve(value: Any?) {
                                    eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                        "reason" to "audioFocusLoss",
                                        "isPaused" to true
                                    ))
                                }
                                override fun reject(code: String, message: String?, cause: Throwable?) {
                                    LogUtils.e(CLASS_NAME, "Failed to pause recording on audio focus loss")
                                }
                            })
                        }
                    }
                }
                AudioManager.AUDIOFOCUS_GAIN -> {
                    if (_isRecording.get() && isPaused.get() && recordingConfig.autoResumeAfterInterruption) {
                        mainHandler.post {
                            resumeRecording(object : Promise {
                                override fun resolve(value: Any?) {
                                    eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                        "reason" to "audioFocusGain",
                                        "isPaused" to false
                                    ))
                                }
                                override fun reject(code: String, message: String?, cause: Throwable?) {
                                    LogUtils.e(CLASS_NAME, "Failed to resume recording on audio focus gain")
                                }
                            })
                        }
                    }
                }
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.R)
    fun startRecording(options: Map<String, Any?>, promise: Promise) {
        try {
            // Check if already recording
            if (_isRecording.get() && !isPaused.get()) {
                promise.reject("ALREADY_RECORDING", "Recording is already in progress", null)
                return
            }
            
            // Request audio focus - always do this right before starting
            if (!requestAudioFocus()) {
                promise.reject("AUDIO_FOCUS_ERROR", "Failed to obtain audio focus", null)
                return
            }

            // If already prepared, we can skip initialization
            if (!isPrepared) {
                LogUtils.d(CLASS_NAME, "Not prepared, preparing recording first")
                
                // Initialize phone state listener only if enabled
                if (enablePhoneStateHandling) {
                    initializePhoneStateListener()
                }

                LogUtils.d(CLASS_NAME, "Starting recording with options: $options")

                // Check permissions
                if (!checkPermissions(options, promise)) return

                // Parse recording configuration
                val configResult = RecordingConfig.fromMap(options)
                if (configResult.isFailure) {
                    promise.reject(
                        "INVALID_CONFIG",
                        configResult.exceptionOrNull()?.message ?: "Invalid configuration",
                        configResult.exceptionOrNull()
                    )
                    return
                }

                val (tempRecordingConfig, audioFormatInfo) = configResult.getOrNull()!!
                
                recordingConfig = tempRecordingConfig
                
                // Store device-related settings
                selectedDeviceId = recordingConfig.deviceId
                deviceDisconnectionBehavior = recordingConfig.deviceDisconnectionBehavior ?: "pause"
                
                audioFormat = audioFormatInfo.format
                mimeType = audioFormatInfo.mimeType

                if (!initializeAudioFormat(promise)) return

                if (!initializeBufferSize(promise)) return

                if (!initializeAudioRecord(promise)) return

                if (recordingConfig.enableCompressedOutput && !initializeCompressedRecorder(
                    if (recordingConfig.compressedFormat == "aac") "aac" else "opus",
                    promise
                )) return

                if (!initializeRecordingResources(audioFormatInfo.fileExtension, promise)) return
            } else {
                LogUtils.d(CLASS_NAME, "Using prepared recording state")
                
                // Even when prepared, update device settings from the new options
                val configResult = RecordingConfig.fromMap(options)
                if (configResult.isSuccess) {
                    val (tempRecordingConfig, _) = configResult.getOrNull()!!
                    // Update device-related settings
                    selectedDeviceId = tempRecordingConfig.deviceId ?: selectedDeviceId
                    deviceDisconnectionBehavior = tempRecordingConfig.deviceDisconnectionBehavior 
                        ?: deviceDisconnectionBehavior
                        ?: "pause"
                }
            }

            if (!startRecordingProcess(promise)) return

            // Start compressed recording if enabled
            try {
                compressedRecorder?.start()
            } catch (e: Exception) {
                LogUtils.e(CLASS_NAME, "Failed to start compressed recording", e)
                cleanup()
                promise.reject("COMPRESSED_START_FAILED", "Failed to start compressed recording", e)
                return
            }

            // Return success result with both file URIs
            val result = bundleOf(
                "fileUri" to audioFile?.toURI().toString(),
                "channels" to recordingConfig.channels,
                "bitDepth" to AudioFormatUtils.getBitDepth(recordingConfig.encoding),
                "sampleRate" to recordingConfig.sampleRate,
                "mimeType" to mimeType,
                "compression" to if (compressedFile != null) bundleOf(
                    "mimeType" to if (recordingConfig.compressedFormat == "aac") "audio/aac" else "audio/opus",
                    "bitrate" to recordingConfig.compressedBitRate,
                    "format" to recordingConfig.compressedFormat,
                    "size" to 0,
                    "compressedFileUri" to compressedFile?.toURI().toString()
                ) else null
            )
            promise.resolve(result)

        } catch (e: Exception) {
            releaseAudioFocus()
            telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
            promise.reject("UNEXPECTED_ERROR", "Unexpected error: ${e.message}", e)
        }
    }

    private fun isAudioFormatSupported(sampleRate: Int, channels: Int, format: Int): Boolean {
        if (!permissionUtils.checkRecordingPermission(enableBackgroundAudio)) {
            throw SecurityException("Recording permission has not been granted")
        }

        val channelConfig =
            if (channels == 1) AudioFormat.CHANNEL_IN_MONO else AudioFormat.CHANNEL_IN_STEREO
        val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, format)

        if (bufferSize <= 0) {
            return false
        }

        val audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            format,
            bufferSize
        )

        val isSupported = audioRecord.state == AudioRecord.STATE_INITIALIZED
        if (isSupported) {
            val testBuffer = ByteArray(bufferSize)
            audioRecord.startRecording()
            val testRead = audioRecord.read(testBuffer, 0, bufferSize)
            audioRecord.stop()
            if (testRead < 0) {
                return false
            }
        }

        audioRecord.release()
        return isSupported
    }

    private fun checkPermissions(options: Map<String, Any?>, promise: Promise): Boolean {
        if (!permissionUtils.checkRecordingPermission(enableBackgroundAudio)) {
            promise.reject(
                "PERMISSION_DENIED",
                "Recording permission has not been granted",
                null
            )
            return false
        }

        // Only check phone state permission if enabled
        if (enablePhoneStateHandling && !permissionUtils.checkPhoneStatePermission()) {
            LogUtils.w(CLASS_NAME, "READ_PHONE_STATE permission not granted, phone call interruption handling will be disabled")
            // Don't reject here, just log warning as this is optional
        }

        // Only check notification permission if enabled
        if (options["showNotification"] as? Boolean == true && 
            !permissionUtils.checkNotificationPermission()) {
            promise.reject(
                "NOTIFICATION_PERMISSION_DENIED",
                "Notification permission has not been granted",
                null
            )
            return false
        }
        return true
    }


    private fun initializeAudioFormat(promise: Promise): Boolean {
        if (!isAudioFormatSupported(
                recordingConfig.sampleRate,
                recordingConfig.channels,
                audioFormat
            )
        ) {
            LogUtils.e(CLASS_NAME, "Selected audio format not supported, falling back to 16-bit PCM")
            audioFormat = AudioFormat.ENCODING_PCM_16BIT

            if (!isAudioFormatSupported(
                    recordingConfig.sampleRate,
                    recordingConfig.channels,
                    audioFormat
                )
            ) {
                promise.reject(
                    "INITIALIZATION_FAILED",
                    "Failed to initialize audio recorder with any supported format",
                    null
                )
                return false
            }
            recordingConfig = recordingConfig.copy(encoding = "pcm_16bit")
            mimeType = "audio/wav"
        }
        return true
    }

    private fun initializeBufferSize(promise: Promise): Boolean {
        try {
            val channelConfig = if (recordingConfig.channels == 1) {
                AudioFormat.CHANNEL_IN_MONO
            } else {
                AudioFormat.CHANNEL_IN_STEREO
            }

            bufferSizeInBytes = AudioRecord.getMinBufferSize(
                recordingConfig.sampleRate,
                channelConfig,
                audioFormat
            )

            when {
                bufferSizeInBytes == AudioRecord.ERROR -> {
                    LogUtils.e(CLASS_NAME, "Error getting minimum buffer size: ERROR")
                    promise.reject(
                        "BUFFER_SIZE_ERROR",
                        "Failed to get minimum buffer size: generic error",
                        null
                    )
                    return false
                }
                bufferSizeInBytes == AudioRecord.ERROR_BAD_VALUE -> {
                    LogUtils.e(CLASS_NAME, "Error getting minimum buffer size: BAD_VALUE")
                    promise.reject(
                        "BUFFER_SIZE_ERROR",
                        "Failed to get minimum buffer size: invalid parameters",
                        null
                    )
                    return false
                }
                bufferSizeInBytes <= 0 -> {
                    LogUtils.e(CLASS_NAME, "Invalid buffer size: $bufferSizeInBytes")
                    promise.reject(
                        "BUFFER_SIZE_ERROR",
                        "Failed to get valid buffer size",
                        null
                    )
                    return false
                }
                else -> {
                    LogUtils.d(CLASS_NAME, "AudioFormat: $audioFormat, BufferSize: $bufferSizeInBytes")
                    return true
                }
            }
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to initialize buffer size", e)
            promise.reject(
                "BUFFER_SIZE_ERROR",
                "Failed to initialize buffer size: ${e.message}",
                e
            )
            return false
        }
    }


    private fun initializeAudioRecord(promise: Promise): Boolean {
        if (!permissionUtils.checkRecordingPermission(enableBackgroundAudio)) {
            promise.reject(
                "PERMISSION_DENIED",
                "Recording permission has not been granted",
                null
            )
            return false
        }

        try {
            if (audioRecord == null || !isPaused.get()) {
                LogUtils.d(CLASS_NAME, "Initializing AudioRecord with format: $audioFormat, BufferSize: $bufferSizeInBytes")

                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    recordingConfig.sampleRate,
                    if (recordingConfig.channels == 1) AudioFormat.CHANNEL_IN_MONO else AudioFormat.CHANNEL_IN_STEREO,
                    audioFormat,
                    bufferSizeInBytes
                )

                if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                    promise.reject(
                        "INITIALIZATION_FAILED",
                        "Failed to initialize the audio recorder",
                        null
                    )
                    return false
                }
            }
            return true

        } catch (e: SecurityException) {
            LogUtils.e(CLASS_NAME, "Security exception while initializing AudioRecord", e)
            promise.reject(
                "PERMISSION_DENIED",
                "Recording permission denied: ${e.message}",
                e
            )
            return false
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to initialize AudioRecord", e)
            promise.reject(
                "INITIALIZATION_FAILED",
                "Failed to initialize the audio recorder: ${e.message}",
                e
            )
            return false
        }
    }

    private fun initializeRecordingResources(fileExtension: String, promise: Promise): Boolean {
        try {
            streamUuid = java.util.UUID.randomUUID().toString()
            audioFile = createRecordingFile(recordingConfig)
            totalDataSize = 0

            FileOutputStream(audioFile, true).use { fos ->
                audioFileHandler.writeWavHeader(
                    fos,
                    recordingConfig.sampleRate,
                    recordingConfig.channels,
                    AudioFormatUtils.getBitDepth(recordingConfig.encoding)
                )
            }

            if (recordingConfig.showNotification) {
                notificationManager.initialize(recordingConfig)
                notificationManager.startUpdates(System.currentTimeMillis())
                AudioRecordingService.startService(context)
            }

            acquireWakeLock()
            audioProcessor.resetCumulativeAmplitudeRange()
            return true

        } catch (e: IOException) {
            releaseWakeLock()
            promise.reject("FILE_CREATION_FAILED", "Failed to create the audio file", e)
            return false
        } catch (e: Exception) {
            releaseWakeLock()
            LogUtils.e(CLASS_NAME, "Unexpected error in startRecording", e)
            promise.reject("UNEXPECTED_ERROR", "Unexpected error: ${e.message}", e)
            return false
        }
    }

    private fun startRecordingProcess(promise: Promise): Boolean {
        try {
            // Add detailed logging of recording configuration
            LogUtils.d(CLASS_NAME, """
                Starting audio recording with configuration:
                - Sample Rate: ${recordingConfig.sampleRate} Hz
                - Channels: ${recordingConfig.channels}
                - Encoding: ${recordingConfig.encoding}
                - Data Emission Interval: ${recordingConfig.interval}ms
                - Analysis Interval: ${recordingConfig.intervalAnalysis}ms
                - Processing Enabled: ${recordingConfig.enableProcessing}
                - Keep Awake: ${recordingConfig.keepAwake}
                - Show Notification: ${recordingConfig.showNotification}
                - Show Waveform: ${recordingConfig.showWaveformInNotification}
                - Compressed Output: ${recordingConfig.enableCompressedOutput}
                ${if (recordingConfig.enableCompressedOutput) """
                    - Compressed Format: ${recordingConfig.compressedFormat}
                    - Compressed Bitrate: ${recordingConfig.compressedBitRate}
                """.trimIndent() else ""}
                - Auto Resume: ${recordingConfig.autoResumeAfterInterruption}
                - Output Directory: ${recordingConfig.outputDirectory ?: "default"}
                - Filename: ${recordingConfig.filename ?: "auto-generated"}
                - Features: ${recordingConfig.features.entries.joinToString { "${it.key}=${it.value}" }}
            """.trimIndent())

            audioRecord?.startRecording()
            isPaused.set(false)
            _isRecording.set(true)
            isFirstChunk = true

            if (!isPaused.get()) {
                recordingStartTime = System.currentTimeMillis()
            }

            recordingThread = Thread { recordingProcess() }.apply { start() }
            
            // Start service if keepAwake is true, regardless of notification settings
            if (recordingConfig.keepAwake) {
                AudioRecordingService.startService(context)
            }
            
            return true

        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to start recording", e)
            cleanup()
            promise.reject("START_FAILED", "Failed to start recording: ${e.message}", e)
            return false
        }
    }

    fun stopRecording(promise: Promise) {
        synchronized(audioRecordLock) {
            if (!_isRecording.get()) {
                LogUtils.e(CLASS_NAME, "Recording is not active")
                promise.reject("NOT_RECORDING", "Recording is not active", null)
                return
            }

            try {
                if (isPaused.get()) {
                    val remainingData = ByteArray(bufferSizeInBytes)
                    val bytesRead = audioRecord?.read(remainingData, 0, bufferSizeInBytes) ?: -1
                    if (bytesRead > 0) {
                        emitAudioData(remainingData.copyOfRange(0, bytesRead), bytesRead)
                    }
                }

                if (recordingConfig.showNotification) {
                    notificationManager.stopUpdates()
                    AudioRecordingService.stopService(context)
                }

                _isRecording.set(false)
                isPrepared = false  // Reset preparation state
                recordingThread?.join(1000)

                val audioData = ByteArray(bufferSizeInBytes)
                val bytesRead = audioRecord?.read(audioData, 0, bufferSizeInBytes) ?: -1
                LogUtils.d(CLASS_NAME, "Last Read $bytesRead bytes")
                if (bytesRead > 0) {
                    emitAudioData(audioData.copyOfRange(0, bytesRead), bytesRead)
                }

                LogUtils.d(CLASS_NAME, "Stopping recording state = ${audioRecord?.state}")
                if (audioRecord != null && audioRecord!!.state == AudioRecord.STATE_INITIALIZED) {
                    LogUtils.d(CLASS_NAME, "Stopping AudioRecord")
                    audioRecord!!.stop()
                }

                cleanup()
            } catch (e: IllegalStateException) {
                LogUtils.e(CLASS_NAME, "Error reading from AudioRecord", e)
            } finally {
                releaseWakeLock()
                audioRecord?.release()
            }

            try {
                AudioProcessor.resetUniqueIdCounter()
                audioProcessor.resetCumulativeAmplitudeRange()

                val fileSize = audioFile?.length() ?: 0
                LogUtils.d(CLASS_NAME, "WAV File validation - Size: $fileSize bytes, Path: ${audioFile?.absolutePath}")
                
                val dataFileSize = fileSize - 44  // Subtract header size
                val byteRate =
                    recordingConfig.sampleRate * recordingConfig.channels * when (recordingConfig.encoding) {
                        "pcm_8bit" -> 1
                        "pcm_16bit" -> 2
                        "pcm_32bit" -> 4
                        else -> 2 // Default to 2 bytes per sample if the encoding is not recognized
                    }
                val duration = if (byteRate > 0) (dataFileSize * 1000 / byteRate) else 0

                compressedRecorder?.apply {
                    stop()
                    release()
                }
                compressedRecorder = null

                // Log compressed file status if enabled
                if (recordingConfig.enableCompressedOutput) {
                    val compressedSize = compressedFile?.length() ?: 0
                    LogUtils.d(CLASS_NAME, "Compressed File validation - Size: $compressedSize bytes, Path: ${compressedFile?.absolutePath}")
                }

                val result = bundleOf(
                    "fileUri" to audioFile?.toURI().toString(),
                    "filename" to audioFile?.name,
                    "durationMs" to duration,
                    "channels" to recordingConfig.channels,
                    "bitDepth" to AudioFormatUtils.getBitDepth(recordingConfig.encoding),
                    "sampleRate" to recordingConfig.sampleRate,
                    "size" to fileSize,
                    "mimeType" to mimeType,
                    "createdAt" to System.currentTimeMillis(),
                    "compression" to if (compressedFile != null) bundleOf(
                        "size" to compressedFile?.length(),
                        "mimeType" to if (recordingConfig.compressedFormat == "aac") "audio/aac" else "audio/opus",
                        "bitrate" to recordingConfig.compressedBitRate,
                        "format" to recordingConfig.compressedFormat,
                        "compressedFileUri" to compressedFile?.toURI().toString()
                    ) else null
                )
                promise.resolve(result)

                // Reset the timing variables
                _isRecording.set(false)
                isPaused.set(false)
                totalRecordedTime = 0
                pausedDuration = 0
            } catch (e: Exception) {
                LogUtils.e(CLASS_NAME, "Failed to stop recording: ${e.message}")
                promise.reject("STOP_FAILED", "Failed to stop recording", e)
            } finally {
                audioRecord = null
            }
        }
    }

    fun resumeRecording(promise: Promise) {
        if (!isPaused.get()) {
            promise.reject("NOT_PAUSED", "Recording is not paused", null)
            return
        }

        if (isOngoingCall()) {
            promise.reject("ONGOING_CALL", "Cannot resume recording during an ongoing call", null)
            return
        }

        try {
            if (recordingConfig.showNotification) {
                notificationManager.resumeUpdates()
            }

            acquireWakeLock()
            pausedDuration += System.currentTimeMillis() - lastPauseTime
            isPaused.set(false)
            
            audioRecord?.startRecording()
            compressedRecorder?.resume()
            
            promise.resolve("Recording resumed")
        } catch (e: Exception) {
            releaseWakeLock()
            promise.reject("RESUME_FAILED", "Failed to resume recording", e)
        }
    }

    fun pauseRecording(promise: Promise) {
        if (_isRecording.get() && !isPaused.get()) {
            audioRecord?.stop()
            compressedRecorder?.pause()
            
            lastPauseTime = System.currentTimeMillis()
            isPaused.set(true)

            if (recordingConfig.showNotification) {
                notificationManager.pauseUpdates()
            }

            releaseWakeLock()
            promise.resolve("Recording paused")
        } else {
            promise.reject(
                "NOT_RECORDING_OR_ALREADY_PAUSED",
                "Recording is either not active or already paused",
                null
            )
        }
    }

    fun getStatus(): Bundle {
        synchronized(audioRecordLock) {
            // Check if service is actually running
            val isServiceRunning = context.let { ctx ->
                val manager = ctx.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                manager?.getRunningServices(Integer.MAX_VALUE)
                    ?.any { it.service.className == AudioRecordingService::class.java.name }
            } ?: false

            // If service is running but we think we're not recording, clean up
            if (isServiceRunning && !_isRecording.get()) {
                LogUtils.d(CLASS_NAME, "Detected orphaned recording service, cleaning up...")
                cleanup()
                AudioRecordingService.stopService(context)
            }

            if (!_isRecording.get()) {
                LogUtils.d(CLASS_NAME, "Not recording --- skip status with default values")
                return bundleOf(
                    "isRecording" to false,
                    "isPaused" to false,
                    "mime" to mimeType,
                    "size" to 0,
                    "interval" to (recordingConfig?.interval ?: 0)
                )
            }

            val fileSize = audioFile?.length() ?: 0
            val duration = when (mimeType) {
                "audio/wav" -> {
                    val dataFileSize = fileSize - Constants.WAV_HEADER_SIZE
                    val byteRate = recordingConfig.sampleRate * recordingConfig.channels * 
                        (if (recordingConfig.encoding == "pcm_8bit") 8 else 16) / 8
                    if (byteRate > 0) dataFileSize * 1000 / byteRate else 0
                }
                else -> totalRecordedTime
            }

            val compressionBundle = if (recordingConfig.enableCompressedOutput) {
                bundleOf(
                    "size" to (compressedFile?.length() ?: 0),
                    "mimeType" to if (recordingConfig.compressedFormat == "aac") "audio/aac" else "audio/opus",
                    "bitrate" to recordingConfig.compressedBitRate,
                    "format" to recordingConfig.compressedFormat
                )
            } else null

            return bundleOf(
                "durationMs" to duration,
                "isRecording" to _isRecording.get(),
                "isPaused" to isPaused.get(),
                "mimeType" to mimeType,
                "size" to totalDataSize,
                "interval" to recordingConfig.interval,
                "compression" to compressionBundle
            )
        }
    }

    private fun acquireWakeLock() {
        if (recordingConfig.keepAwake && wakeLock == null) {
            try {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "AudioRecorderManager::RecordingWakeLock"
                ).apply {
                    setReferenceCounted(false)
                    acquire()
                }
                wasWakeLockEnabled = true
                LogUtils.d(CLASS_NAME, "Wake lock acquired")
            } catch (e: Exception) {
                LogUtils.e(CLASS_NAME, "Failed to acquire wake lock", e)
            }
        }
    }


    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    LogUtils.d(CLASS_NAME, "Wake lock released")
                }
                wakeLock = null
                wasWakeLockEnabled = false
            }
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to release wake lock", e)
        }
    }

    /**
     * Checks if there is an ongoing call that would interfere with recording
     */
    private fun isOngoingCall(): Boolean {
        try {
            if (telephonyManager == null) return false
            
            // Check audio manager state instead of telephony directly
            // If audio mode is in call or SCO is on, there's likely a call
            return audioManager.mode == AudioManager.MODE_IN_CALL ||
                   audioManager.mode == AudioManager.MODE_IN_COMMUNICATION ||
                   audioManager.isBluetoothScoOn
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error checking call state: ${e.message}")
            return false
        }
    }

    fun listAudioFiles(promise: Promise) {
        val fileList =
            filesDir.list()?.filter { it.endsWith(".wav") }?.map { File(filesDir, it).absolutePath }
                ?: listOf()
        promise.resolve(fileList)
    }

    fun clearAudioStorage() {
        audioFileHandler.clearAudioStorage()
    }

    private fun recordingProcess() {
        try {
            LogUtils.i(CLASS_NAME, "Starting recording process...")
            FileOutputStream(audioFile, true).use { fos ->
                // Write audio data directly to the file
                val audioData = ByteArray(bufferSizeInBytes)
                LogUtils.d(CLASS_NAME, "Entering recording loop")
                
                // Buffer to accumulate data
                val accumulatedAudioData = ByteArrayOutputStream()
                val accumulatedAnalysisData = ByteArrayOutputStream()  // Separate buffer for analysis
                audioFileHandler.writeWavHeader(
                    accumulatedAudioData,
                    recordingConfig.sampleRate,
                    recordingConfig.channels,
                    when (recordingConfig.encoding) {
                        "pcm_8bit" -> 8
                        "pcm_16bit" -> 16
                        "pcm_32bit" -> 32
                        else -> 16 // Default to 16 if the encoding is not recognized
                    }
                )
                
                // Initialize timing variables
                var lastEmitTime = System.currentTimeMillis()
                var lastEmissionTimeAnalysis = System.currentTimeMillis()
                var isFirstAnalysis = true
                var shouldProcessAnalysis = false
                
                // Debug log for intervals
                LogUtils.d(CLASS_NAME, """
                    Recording process started with intervals:
                    - Data emission interval: ${recordingConfig.interval}ms
                    - Analysis interval: ${recordingConfig.intervalAnalysis}ms
                    - Buffer size: $bufferSizeInBytes bytes
                """.trimIndent())

                // Recording loop
                while (_isRecording.get() && !Thread.currentThread().isInterrupted) {
                    if (isPaused.get()) {
                        Thread.sleep(100) // Add small delay when paused
                        continue
                    }

                    val currentTime = System.currentTimeMillis()
                    val timeSinceLastAnalysis = currentTime - lastEmissionTimeAnalysis
                    shouldProcessAnalysis = recordingConfig.enableProcessing && 
                        (isFirstAnalysis || timeSinceLastAnalysis >= recordingConfig.intervalAnalysis)

                    val bytesRead = synchronized(audioRecordLock) {
                        audioRecord?.let {
                            if (it.state != AudioRecord.STATE_INITIALIZED) {
                                LogUtils.e(CLASS_NAME, "AudioRecord not initialized")
                                return@let -1
                            }
                            it.read(audioData, 0, bufferSizeInBytes).also { bytes ->
                                if (bytes < 0) {
                                    LogUtils.e(CLASS_NAME, "AudioRecord read error: $bytes")
                                }
                            }
                        } ?: -1 // Handle null case
                    }

                    if (bytesRead > 0) {
                        fos.write(audioData, 0, bytesRead)
                        totalDataSize += bytesRead
                        
                        accumulatedAudioData.write(audioData, 0, bytesRead)

                        // Handle regular audio data emission
                        if (currentTime - lastEmitTime >= recordingConfig.interval) {
                            emitAudioData(
                                accumulatedAudioData.toByteArray(),
                                accumulatedAudioData.size()
                            )
                            lastEmitTime = currentTime
                            accumulatedAudioData.reset() // Clear the accumulator
                        }
                        
                        // Handle analysis emission separately
                        if (shouldProcessAnalysis) {
                            val analysisDataSize = accumulatedAnalysisData.size()
                            LogUtils.d(CLASS_NAME, """
                                Processing analysis data:
                                - Time since last: ${currentTime - lastEmissionTimeAnalysis}ms
                                - Configured interval: ${recordingConfig.intervalAnalysis}ms
                                - Accumulated size: $analysisDataSize bytes
                                - Is first analysis: $isFirstAnalysis
                            """.trimIndent())
                            
                            if (analysisDataSize > 0) {
                                // Add this check to enforce minimum interval
                                if (isFirstAnalysis || (currentTime - lastEmissionTimeAnalysis) >= recordingConfig.intervalAnalysis) {
                                    // Process and emit analysis data
                                    val analysisData = audioProcessor.processAudioData(
                                        accumulatedAnalysisData.toByteArray(),
                                        recordingConfig
                                    )
                                    
                                    LogUtils.d(CLASS_NAME, """
                                        Analysis data details:
                                        - Raw data size: ${accumulatedAnalysisData.size()} bytes
                                    """.trimIndent())
                                    
                                    mainHandler.post {
                                        try {
                                            eventSender.sendExpoEvent(
                                                Constants.AUDIO_ANALYSIS_EVENT_NAME,
                                                analysisData.toBundle()
                                            )
                                        } catch (e: Exception) {
                                            LogUtils.e(CLASS_NAME, "Failed to send audio analysis event", e)
                                        }
                                    }
                                    
                                    lastEmissionTimeAnalysis = currentTime
                                    accumulatedAnalysisData.reset()  // Clear the analysis accumulator
                                    isFirstAnalysis = false
                                }
                            }
                        }
                    }
                }
            }
            // Update the WAV header to reflect the actual data size
            audioFile?.let { file ->
                audioFileHandler.updateWavHeader(file)
            }

        } catch (e: Exception) {
            // Ensure wake lock is released if the thread is interrupted
            if (!isPaused.get()) {
                releaseWakeLock()
            }
            LogUtils.e(CLASS_NAME, "Error in recording process", e)
        }
    }

    private fun emitAudioData(audioData: ByteArray, length: Int) {
        val encodedBuffer = audioDataEncoder.encodeToBase64(audioData)

        val fileSize = audioFile?.length() ?: 0
        val from = lastEmittedSize
        lastEmittedSize = fileSize

        // Calculate position in milliseconds
        val positionInMs =
            (from * 1000) / (recordingConfig.sampleRate * recordingConfig.channels * (if (recordingConfig.encoding == "pcm_8bit") 8 else 16) / 8)

        val compressionBundle = if (recordingConfig.enableCompressedOutput) {
            val compressedSize = compressedFile?.length() ?: 0
            val eventDataSize = compressedSize - lastEmittedCompressedSize
            
            // Read the new compressed data
            val compressedData = if (eventDataSize > 0) {
                try {
                    compressedFile?.inputStream()?.use { input ->
                        input.skip(lastEmittedCompressedSize)
                        val buffer = ByteArray(eventDataSize.toInt())
                        input.read(buffer)
                        audioDataEncoder.encodeToBase64(buffer)
                    }
                } catch (e: Exception) {
                    LogUtils.e(CLASS_NAME, "Failed to read compressed data", e)
                    null
                }
            } else null

            lastEmittedCompressedSize = compressedSize
            
            bundleOf(
                "position" to positionInMs,
                "fileUri" to compressedFile?.toURI().toString(),
                "eventDataSize" to eventDataSize,
                "totalSize" to compressedSize,
                "data" to compressedData
            )
        } else null
        
        mainHandler.post {
            try {
                eventSender.sendExpoEvent(
                    Constants.AUDIO_EVENT_NAME, bundleOf(
                        "fileUri" to audioFile?.toURI().toString(),
                        "lastEmittedSize" to from,
                        "encoded" to encodedBuffer,
                        "deltaSize" to length,
                        "position" to positionInMs,
                        "mimeType" to mimeType,
                        "totalSize" to fileSize,
                        "streamUuid" to streamUuid,
                        "compression" to compressionBundle
                    )
                )
            } catch (e: Exception) {
                LogUtils.e(CLASS_NAME, "Failed to send event", e)
            }
        }

        if (recordingConfig.enableProcessing) {
            processAudioData(audioData)
        }
    }

    private fun convertByteArrayToFloatArray(audioData: ByteArray): FloatArray {
        val floatArray = FloatArray(audioData.size / 2) // Assuming 16-bit PCM
        val buffer = ByteBuffer.wrap(audioData).order(ByteOrder.LITTLE_ENDIAN)
        for (i in floatArray.indices) {
            floatArray[i] = buffer.short.toFloat()
        }
        return floatArray
    }

    private fun processAudioData(audioData: ByteArray) {
        // Skip the WAV header only for the first chunk
        val dataToProcess = if (isFirstChunk && audioData.size > Constants.WAV_HEADER_SIZE) {
            audioData.copyOfRange(Constants.WAV_HEADER_SIZE, audioData.size)
        } else {
            audioData
        }

        // Accumulate data for analysis
        if (recordingConfig.enableProcessing) {
            synchronized(analysisBuffer) {
                analysisBuffer.write(dataToProcess)
            }
            
            val currentTime = SystemClock.elapsedRealtime()
            if (isFirstAnalysis || (currentTime - lastEmissionTimeAnalysis) >= recordingConfig.intervalAnalysis) {
                synchronized(analysisBuffer) {
                    if (analysisBuffer.size() > 0) {
                        val analysisData = audioProcessor.processAudioData(
                            analysisBuffer.toByteArray(),
                            recordingConfig
                        )
                        
                        mainHandler.post {
                            eventSender.sendExpoEvent(
                                Constants.AUDIO_ANALYSIS_EVENT_NAME,
                                analysisData.toBundle()
                            )
                        }
                        
                        // Reset buffer after processing
                        analysisBuffer.reset()
                        lastEmissionTimeAnalysis = currentTime
                        isFirstAnalysis = false
                    }
                }
            }
        }

        // Only update notification if needed
        if (recordingConfig.showNotification && recordingConfig.showWaveformInNotification) {
            val floatArray = convertByteArrayToFloatArray(audioData)
            notificationManager.updateNotification(floatArray)
        }

        // Reset isFirstChunk after processing
        isFirstChunk = false
    }

    fun cleanup() {
        synchronized(audioRecordLock) {
            try {
                if (_isRecording.get()) {
                    audioRecord?.stop()
                    compressedRecorder?.stop()
                    compressedRecorder?.release()
                }
                
                _isRecording.set(false)
                isPaused.set(false)
                isPrepared = false  // Reset prepared state
                
                if (recordingConfig.showNotification) {
                    notificationManager.stopUpdates()
                    AudioRecordingService.stopService(context)
                }

                releaseWakeLock()
                releaseAudioFocus()
                audioRecord?.release()
                audioRecord = null
                
                // Reset all state
                totalRecordedTime = 0
                pausedDuration = 0
                lastEmittedSize = 0
                recordingStartTime = 0
                
                // Update the WAV header if needed
                audioFile?.let { file ->
                    audioFileHandler.updateWavHeader(file)
                }

                // Send event to notify that recording was stopped
                eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                    "reason" to "recordingStopped",
                    "isPaused" to false
                ))
            } catch (e: Exception) {
                LogUtils.e(CLASS_NAME, "Error during cleanup", e)
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun initializeCompressedRecorder(fileExtension: String, promise: Promise): Boolean {
        try {
            // Pass true to indicate this is a compressed file
            compressedFile = createRecordingFile(recordingConfig, isCompressed = true)
            
            compressedRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            compressedRecorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(if (recordingConfig.compressedFormat == "aac") 
                    MediaRecorder.OutputFormat.AAC_ADTS 
                    else MediaRecorder.OutputFormat.OGG)
                setAudioEncoder(if (recordingConfig.compressedFormat == "aac") 
                    MediaRecorder.AudioEncoder.AAC 
                    else MediaRecorder.AudioEncoder.OPUS)
                setAudioChannels(recordingConfig.channels)
                setAudioSamplingRate(recordingConfig.sampleRate)
                setAudioEncodingBitRate(recordingConfig.compressedBitRate)
                setOutputFile(compressedFile?.absolutePath)
                prepare()
            }
            return true
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to initialize compressed recorder", e)
            promise.reject("COMPRESSED_INIT_FAILED", "Failed to initialize compressed recorder", e)
            return false
        }
    }

    @SuppressLint("NewApi")
    private fun requestAudioFocus(): Boolean {
        audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
            when (focusChange) {
                AudioManager.AUDIOFOCUS_LOSS,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                    if (_isRecording.get() && !isPaused.get()) {
                        mainHandler.post {
                            pauseRecording(object : Promise {
                                override fun resolve(value: Any?) {
                                    isPaused.set(true)
                                    eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                        "reason" to "audioFocusLoss",
                                        "isPaused" to true
                                    ))
                                }
                                override fun reject(code: String, message: String?, cause: Throwable?) {
                                    LogUtils.e(CLASS_NAME, "Failed to pause recording on audio focus loss")
                                }
                            })
                        }
                    }
                }
                AudioManager.AUDIOFOCUS_GAIN -> {
                    if (_isRecording.get() && isPaused.get() && recordingConfig.autoResumeAfterInterruption) {
                        mainHandler.post {
                            resumeRecording(object : Promise {
                                override fun resolve(value: Any?) {
                                    eventSender.sendExpoEvent(Constants.RECORDING_INTERRUPTED_EVENT_NAME, bundleOf(
                                        "reason" to "audioFocusGain",
                                        "isPaused" to false
                                    ))
                                }
                                override fun reject(code: String, message: String?, cause: Throwable?) {
                                    LogUtils.e(CLASS_NAME, "Failed to resume recording on audio focus gain")
                                }
                            })
                        }
                    }
                }
            }
        }

        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build())
                .setOnAudioFocusChangeListener(audioFocusChangeListener!!)
                .build()
            audioFocusRequest = focusRequest
            audioManager.requestAudioFocus(focusRequest)
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            )
        }
        
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    private fun releaseAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            (audioFocusRequest as? AudioFocusRequest)?.let { request ->
                audioManager.abandonAudioFocusRequest(request)
            }
        } else {
            @Suppress("DEPRECATION")
            audioFocusChangeListener?.let { listener ->
                audioManager.abandonAudioFocus(listener)
            }
        }
        audioFocusRequest = null
        audioFocusChangeListener = null
    }

    private fun createRecordingFile(config: RecordingConfig, isCompressed: Boolean = false): File {
        // Use custom directory or default to existing behavior
        val baseDir = config.outputDirectory?.let { File(it) } ?: filesDir
        
        // Get base filename and remove any existing extension
        val baseFilename = config.filename?.let {
            it.substringBeforeLast('.', it)  // Remove extension if present
        } ?: UUID.randomUUID().toString()
        
        // Choose extension based on whether this is a compressed file
        val extension = if (isCompressed) {
            config.compressedFormat.lowercase()
        } else {
            "wav"
        }
        
        return File(baseDir, "$baseFilename.$extension")
    }

    fun getKeepAwakeStatus(): Boolean {
        return recordingConfig?.keepAwake ?: true
    }

    /**
     * Prepares audio recording with all initial setup but without starting.
     * This reuses the existing validation and setup functions for compatibility.
     */
    fun prepareRecording(options: Map<String, Any?>): Boolean {
        if (_isRecording.get()) {
            LogUtils.d(CLASS_NAME, "Cannot prepare recording - already recording")
            return false
        }
        
        if (isPrepared) {
            LogUtils.d(CLASS_NAME, "Already prepared")
            return true
        }
        
        try {
            // Initialize phone state listener only if enabled
            if (enablePhoneStateHandling) {
                initializePhoneStateListener()
            }

            // Check permissions - create a dummy promise to avoid rejections
            val dummyPromise = object : Promise {
                override fun resolve(value: Any?) {}
                override fun reject(code: String, message: String?, cause: Throwable?) { 
                    LogUtils.e(CLASS_NAME, "Preparation error: $code - $message", cause)
                }
            }
            
            if (!checkPermissions(options, dummyPromise)) return false

            // Parse recording configuration - reuse existing code
            val configResult = RecordingConfig.fromMap(options)
            if (configResult.isFailure) {
                LogUtils.e(CLASS_NAME, "Invalid configuration: ${configResult.exceptionOrNull()?.message}")
                return false
            }

            val (tempRecordingConfig, audioFormatInfo) = configResult.getOrNull()!!
            recordingConfig = tempRecordingConfig
            
            // Store device-related settings
            selectedDeviceId = recordingConfig.deviceId
            deviceDisconnectionBehavior = recordingConfig.deviceDisconnectionBehavior ?: "pause"
            
            audioFormat = audioFormatInfo.format
            mimeType = audioFormatInfo.mimeType

            // Use all the existing validation functions with our dummy promise
            if (!initializeAudioFormat(dummyPromise)) return false
            if (!initializeBufferSize(dummyPromise)) return false
            if (!initializeAudioRecord(dummyPromise)) return false
            
            if (recordingConfig.enableCompressedOutput && !initializeCompressedRecorder(
                if (recordingConfig.compressedFormat == "aac") "aac" else "opus",
                dummyPromise
            )) return false

            if (!initializeRecordingResources(audioFormatInfo.fileExtension, dummyPromise)) return false
            
            // Everything is ready, mark as prepared
            isPrepared = true
            LogUtils.d(CLASS_NAME, "Recording prepared successfully")
            return true
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error during preparation: ${e.message}", e)
            cleanup()
            isPrepared = false
            return false
        }
    }
}