package net.siteed.audiostream

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
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.ReturnCode
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean


class AudioRecorderManager(
    private val filesDir: File,
    private val permissionUtils: PermissionUtils,
    private val audioDataEncoder: AudioDataEncoder,
    private val eventSender: EventSender
) {
    private var audioRecord: AudioRecord? = null
    private var sampleRateInHz = Constants.DEFAULT_SAMPLE_RATE
    private var channelConfig = Constants.DEFAULT_CHANNEL_CONFIG
    private var audioFormat = Constants.DEFAULT_AUDIO_FORMAT
    private var bufferSizeInBytes =
        AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
    private var isRecording = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)
    private var streamUuid: String? = null
    private var audioFile: File? = null
    private var recordingThread: Thread? = null
    private var recordingStartTime: Long = 0
    private var totalRecordedTime: Long = 0
    private var totalDataSize = 0
    private var interval = 1000L  // Emit data every 1000 milliseconds (1 second)
    private var lastEmitTime = SystemClock.elapsedRealtime()
    private var lastPauseTime = 0L
    private var pausedDuration = 0L
    private var lastEmittedSize = 0L
    private var mimeType = "audio/wav"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var bitDepth = 16
    private var channels = 1
    private val audioRecordLock = Any()
    private var audioFileHandler: AudioFileHandler = AudioFileHandler(filesDir)

    @RequiresApi(Build.VERSION_CODES.R)
    fun startRecording(options: Map<String, Any?>, promise: Promise) {
        if (!permissionUtils.checkRecordingPermission()) {
            promise.reject("PERMISSION_DENIED", "Recording permission has not been granted", null)
            return
        }

        if (isRecording.get() && !isPaused.get()) {
            promise.reject("ALREADY_RECORDING", "Recording is already in progress", null)
            return
        }

        // Extract and validate recording options
        sampleRateInHz = options["sampleRate"] as? Int ?: Constants.DEFAULT_SAMPLE_RATE
        if (sampleRateInHz !in listOf(16000, 44100, 48000)) {
            promise.reject(
                "INVALID_SAMPLE_RATE",
                "Sample rate must be one of 16000, 44100, or 48000 Hz",
                null
            )
            return
        }

        channels = options["channels"] as? Int ?: 1
        if (channels !in 1..2) {
            promise.reject(
                "INVALID_CHANNELS",
                "Channels must be either 1 (Mono) or 2 (Stereo)",
                null
            )
            return
        }

        val encodingType = options["encoding"] as? String ?: "pcm_16bit"
        if (encodingType !in listOf("pcm_16bit", "pcm_8bit", "aac", "opus")) {
            promise.reject(
                "INVALID_ENCODING",
                "Encoding must be one of the following: pcm_16bit, pcm_8bit, aac, opus",
                null
            )
            return
        }


        var fileExtension = ".wav" // Default

        audioFormat = when (encodingType) {
            "pcm_8bit", "pcm_16bit" -> {
                fileExtension = "wav"
                mimeType = "audio/wav" // WAV is typically used for PCM data.
                AudioFormat.ENCODING_PCM_16BIT
            }

            "opus" -> {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    // Handle the case where Opus is not supported by the device
                    promise.reject(
                        "UNSUPPORTED_FORMAT",
                        "Opus encoding not supported on this Android version.",
                        null
                    )
                    return
                }
                fileExtension = "opus"
                mimeType = "audio/opus"
                AudioFormat.ENCODING_OPUS
            }

            "aac_lc" -> {
                fileExtension = "aac"
                mimeType = "audio/aac"
                AudioFormat.ENCODING_AAC_LC
            }

            else -> {
                fileExtension = "wav"
                mimeType = "audio/wav" // Default case or throw an error if unsupported
                AudioFormat.ENCODING_DEFAULT
            }
        }

        interval = options["interval"] as? Long ?: Constants.DEFAULT_INTERVAL
        if (interval < Constants.MIN_INTERVAL) {
            promise.reject(
                "INVALID_INTERVAL",
                "Interval must be at least ${Constants.MIN_INTERVAL} ms",
                null
            )
            return
        }

        bufferSizeInBytes = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)

        Log.d(
            Constants.TAG,
            "Starting recording with the following parameters: Sample Rate: $sampleRateInHz Hz, Channels: $channels, Encoding: $encodingType, File Extension: $fileExtension, MIME Type: $mimeType, Interval: $interval ms"
        )

        // Initialize the AudioRecord if it's a new recording or if it's not currently paused
        if (audioRecord == null || !isPaused.get()) {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRateInHz,
                channelConfig,
                audioFormat,
                bufferSizeInBytes
            )
            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject(
                    "INITIALIZATION_FAILED",
                    "Failed to initialize the audio recorder",
                    null
                )
                return
            }
        }

        streamUuid = java.util.UUID.randomUUID().toString()
        audioFile = File(filesDir, "audio_${streamUuid}.${fileExtension}")

        try {
            FileOutputStream(audioFile, true).use { fos ->
                audioFileHandler.writeWavHeader(fos, sampleRateInHz, channels, bitDepth)
            }
        } catch (e: IOException) {
            promise.reject("FILE_CREATION_FAILED", "Failed to create the audio file", e)
            return
        }

        audioRecord?.startRecording()
        isPaused.set(false)
        isRecording.set(true)

        if (!isPaused.get()) {
            recordingStartTime =
                System.currentTimeMillis() // Only reset start time if it's not a resume
        }

        recordingThread = Thread { recordingProcess() }.apply { start() }

        val result = bundleOf(
            "fileUri" to audioFile?.toURI().toString(),
            "channels" to channels,
            "bitDepth" to bitDepth,
            "sampleRate" to sampleRateInHz,
            "mimeType" to mimeType
        )
        promise.resolve(result)
    }

    fun stopRecording(promise: Promise) {
        synchronized(audioRecordLock) {

            if (!isRecording.get()) {
                Log.e(Constants.TAG, "Recording is not active")
                promise.reject("NOT_RECORDING", "Recording is not active", null)
                return
            }

            try {
                val audioData = ByteArray(bufferSizeInBytes)
                val bytesRead = audioRecord?.read(audioData, 0, bufferSizeInBytes) ?: -1
                Log.d(Constants.TAG, "Last Read $bytesRead bytes")
                if (bytesRead > 0) {
                    emitAudioData(audioData, bytesRead)
                }

                Log.d(Constants.TAG, "Stopping recording state = ${audioRecord?.state}")
                if (audioRecord != null && audioRecord!!.state == AudioRecord.STATE_INITIALIZED) {
                    Log.d(Constants.TAG, "Stopping AudioRecord");
                    audioRecord!!.stop()
                }
            } catch (e: IllegalStateException) {
                Log.e(Constants.TAG, "Error reading from AudioRecord", e);
            } finally {
                audioRecord?.release()
            }

            try {
                val fileSize = audioFile?.length() ?: 0
                val dataFileSize = fileSize - 44  // Subtract header size
                val byteRate = sampleRateInHz * channels * (bitDepth / 8)

                // Calculate duration based on the data size and byte rate
                val duration = if (byteRate > 0) (dataFileSize * 1000 / byteRate) else 0

                // Create result bundle
                val result = bundleOf(
                    "fileUri" to audioFile?.toURI().toString(),
                    "duration" to duration,
                    "channels" to channels,
                    "bitDepth" to bitDepth,
                    "sampleRate" to sampleRateInHz,
                    "size" to fileSize,
                    "mimeType" to mimeType
                )
                promise.resolve(result)

                // Reset the timing variables
                isRecording.set(false)
                isPaused.set(false)
                totalRecordedTime = 0
                pausedDuration = 0
            } catch (e: Exception) {
                Log.d(Constants.TAG, "Failed to stop recording", e)
                promise.reject("STOP_FAILED", "Failed to stop recording", e)
            } finally {
                audioRecord = null
            }
        }
    }

    fun pauseRecording(promise: Promise) {
        if (isRecording.get() && !isPaused.get()) {
            audioRecord?.stop()
            lastPauseTime =
                System.currentTimeMillis()  // Record the time when the recording was paused
            isPaused.set(true)
            promise.resolve("Recording paused")
        } else {
            promise.reject(
                "NOT_RECORDING_OR_ALREADY_PAUSED",
                "Recording is either not active or already paused",
                null
            )
        }
    }

    fun resumeRecording(promise: Promise) {
        if (isRecording.get() && !isPaused.get()) {
            promise.reject("NOT_PAUSED", "Recording is not paused", null)
            return
        } else if (audioRecord == null) {
            promise.reject("NOT_RECORDING", "Recording is not active", null)
        }

        // Calculate the duration the recording was paused
        pausedDuration += System.currentTimeMillis() - lastPauseTime
        isPaused.set(false)
        audioRecord?.startRecording()
        promise.resolve("Recording resumed")
    }

    fun getStatus(): Bundle {
        synchronized(audioRecordLock) {
            if (!isRecording.get()) {
                Log.d(Constants.TAG, "Not recording --- skip status with default values")

                return bundleOf(
                    "isRecording" to false,
                    "isPaused" to false,
                    "mime" to mimeType,
                    "size" to 0,
                    "interval" to interval,
                )
            }

            // Ensure you update this to check if audioFile is null or not
            val fileSize = audioFile?.length() ?: 0

            val duration = when (mimeType) {
                "audio/wav" -> {
                    // WAV files store raw audio data, so we can calculate duration like this
                    val dataFileSize =
                        fileSize - Constants.WAV_HEADER_SIZE // Assuming header is always 44 bytes
                    val byteRate = sampleRateInHz * channels * (bitDepth / 8)
                    if (byteRate > 0) dataFileSize * 1000 / byteRate else 0
                }

                "audio/opus", "audio/aac" -> {
                    // For compressed formats, the duration might need to be retrieved differently,
                    // perhaps from metadata or requiring a library to parse the file if not stored elsewhere.
                    getCompressedAudioDuration(audioFile)
                }

                else -> 0
            }
            return bundleOf(
                "duration" to duration,
                "isRecording" to isRecording.get(),
                "isPaused" to isPaused.get(),
                "mime" to mimeType,
                "size" to totalDataSize,
                "interval" to interval,
            )
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
        Log.i(Constants.TAG, "Starting recording process...")
        FileOutputStream(audioFile, true).use { fos ->
            // Buffer to accumulate data
            val accumulatedAudioData = ByteArrayOutputStream()
            audioFileHandler.writeWavHeader(
                accumulatedAudioData,
                sampleRateInHz,
                channels,
                bitDepth
            )

            // Write audio data directly to the file
            val audioData = ByteArray(bufferSizeInBytes)
            Log.d(Constants.TAG, "Entering recording loop")
            while (isRecording.get() && !Thread.currentThread().isInterrupted) {
                if (isPaused.get()) {
                    // If recording is paused, skip reading from the microphone
                    continue
                }

                val bytesRead = synchronized(audioRecordLock) {
                    // Only synchronize the read operation and the check
                    audioRecord?.let {
                        if (it.state != AudioRecord.STATE_INITIALIZED) {
                            Log.e(Constants.TAG, "AudioRecord not initialized")
                            return@let -1
                        }
                        it.read(audioData, 0, bufferSizeInBytes)
                    } ?: -1 // Handle null case
                }
                if (bytesRead > 0) {
                    fos.write(audioData, 0, bytesRead)
                    totalDataSize += bytesRead
                    accumulatedAudioData.write(audioData, 0, bytesRead)

                    // Emit audio data at defined intervals
                    if (SystemClock.elapsedRealtime() - lastEmitTime >= interval) {
                        emitAudioData(
                            accumulatedAudioData.toByteArray(),
                            accumulatedAudioData.size()
                        )
                        lastEmitTime = SystemClock.elapsedRealtime() // Reset the timer
                        accumulatedAudioData.reset() // Clear the accumulator
                    }

                    Log.d(Constants.TAG, "Bytes written to file: $bytesRead")
                }
            }
        }
        // Update the WAV header to reflect the actual data size
        audioFile?.let { file ->
            audioFileHandler.updateWavHeader(file)
        }
    }

    private fun emitAudioData(audioData: ByteArray, length: Int) {
        val encodedBuffer = audioDataEncoder.encodeToBase64(audioData)

        val fileSize = audioFile?.length() ?: 0
        val from = lastEmittedSize
        val deltaSize = fileSize - lastEmittedSize
        lastEmittedSize = fileSize

        // Calculate position in milliseconds
        val positionInMs = (from * 1000) / (sampleRateInHz * channels * (bitDepth / 8))

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
                        "streamUuid" to streamUuid
                    )
                )
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Failed to send event", e)
            }
        }
    }

    fun test() {
        Log.d(Constants.TAG, "Testing FFmpegKit integration...")

        val session = FFmpegKit.execute("-version")
        if (ReturnCode.isSuccess(session.returnCode)) {
            Log.d(Constants.TAG, "FFmpegKit version: ${session.output}")
            // SUCCESS
        } else if (ReturnCode.isCancel(session.returnCode)) {
            Log.d(Constants.TAG, "FFmpegKit execution cancelled.")
            // CANCEL
        } else {
            Log.e(Constants.TAG, "FFmpegKit execution failed. Error: ${session.failStackTrace}")
            // FAILURE
        }
    }

    private fun getCompressedAudioDuration(file: File?): Long {
        // Placeholder function for fetching duration from a compressed audio file
        // This would depend on how you store or can retrieve duration info for compressed formats
        return 0L // Implement this based on your specific requirements
    }
}