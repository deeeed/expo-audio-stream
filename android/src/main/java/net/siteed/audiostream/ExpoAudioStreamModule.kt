package net.siteed.audiostream

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.util.Base64
import android.os.Handler
import android.os.SystemClock
import java.io.ByteArrayOutputStream
import android.os.Looper
import expo.modules.core.interfaces.Function
import java.util.concurrent.atomic.AtomicBoolean
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.RandomAccessFile

const val AUDIO_EVENT_NAME = "AudioData"
const val DEFAULT_SAMPLE_RATE = 16000 // Default sample rate for audio recording
const val DEFAULT_CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
const val DEFAULT_AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

class ExpoAudioStreamModule() : Module() {
  private var audioRecord: AudioRecord? = null
  private var sampleRateInHz = DEFAULT_SAMPLE_RATE
  private var channelConfig = DEFAULT_CHANNEL_CONFIG
  private var audioFormat = DEFAULT_AUDIO_FORMAT
  private var bufferSizeInBytes: Int = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
  private var isRecording = AtomicBoolean(false)
  private val isPaused = AtomicBoolean(false)
  private var streamUuid: String? = null
  private var audioFile: File? = null
  private var recordingThread: Thread? = null
  private var recordingStartTime: Long = 0
  private var totalRecordedTime: Long = 0
  private var totalDataSize = 0
  private val audioDataBuffer = ByteArrayOutputStream()
  private var interval = 1000L // Emit data every 1000 milliseconds (1 second)
  private var lastEmitTime = SystemClock.elapsedRealtime()
  private var lastPauseTime = 0L
  private var pausedDuration = 0L
  private var lastEmittedSize = 0L
  private var mimeType = "audio/wav"
  private val mainHandler = Handler(Looper.getMainLooper())
  private var bitDepth = 16
  private var channels = 1

  @SuppressLint("MissingPermission")
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ExpoAudioStream')` in JavaScript.
    Name("ExpoAudioStream")

    Events(AUDIO_EVENT_NAME)

    AsyncFunction("startRecording") { options: Map<String, Any?>,  promise: Promise ->
      configureRecording(options)
      startRecording(options, promise)
    }

    Function("clearAudioFiles") {
      clearAudioStorage()
    }

    Function("status") {
      // Ensure you update this to check if audioFile is null or not
      val fileSize = audioFile?.length() ?: 0
      val dataFileSize = fileSize - 44 // Assuming header is always 44 bytes

      val byteRate = sampleRateInHz * channels * (bitDepth / 8)
      val duration = if (byteRate > 0) (dataFileSize * 1000 / byteRate) else 0 // Duration in milliseconds

      bundleOf(
        "duration" to duration,
        "isRecording" to isRecording.get(),
        "isPaused" to isPaused.get(),
        "mime" to mimeType,
        "size" to totalDataSize,
        "interval" to interval,
      )
    }

    AsyncFunction("listAudioFiles") { promise: Promise ->
      try {
        val fileList = listAudioFiles()
        promise.resolve(fileList)
      } catch (e: Exception) {
        promise.reject("ERROR_LIST_FILES", "Failed to list audio files", e)
      }
    }

    AsyncFunction("pauseRecording") { promise: Promise ->
      Log.d("AudioRecorderModule", "Pausing recording")
      pauseRecording(promise)
    }

    AsyncFunction("stopRecording") { promise: Promise ->
      Log.d("AudioRecorderModule", "Stopping recording")
      stopRecording(promise)
    }
  }

  // Method to write WAV file header
  private fun writeWavHeader(out: FileOutputStream) {
    val header = ByteArray(44)
    val byteRate = sampleRateInHz * channels * bitDepth / 8
    val blockAlign = channels * bitDepth / 8

    // RIFF/WAVE header
    "RIFF".toByteArray().copyInto(header, 0)
    header[4] = 0 // Size will be updated later
    "WAVE".toByteArray().copyInto(header, 8)
    "fmt ".toByteArray().copyInto(header, 12)

    // 16 for PCM
    header[16] = 16
    header[20] = 1 // Audio format 1 for PCM (not compressed)
    header[22] = channels.toByte()
    header[24] = (sampleRateInHz and 0xff).toByte()
    header[25] = (sampleRateInHz shr 8 and 0xff).toByte()
    header[26] = (sampleRateInHz shr 16 and 0xff).toByte()
    header[27] = (sampleRateInHz shr 24 and 0xff).toByte()
    header[28] = (byteRate and 0xff).toByte()
    header[29] = (byteRate shr 8 and 0xff).toByte()
    header[30] = (byteRate shr 16 and 0xff).toByte()
    header[31] = (byteRate shr 24 and 0xff).toByte()
    header[32] = blockAlign.toByte()
    header[34] = bitDepth.toByte()
    "data".toByteArray().copyInto(header, 36)

    out.write(header, 0, 44)
  }

  private fun configureRecording(params: Map<String, Any?>) {
    sampleRateInHz = (params["sampleRate"] as? Int) ?: DEFAULT_SAMPLE_RATE
    channelConfig = (params["channelConfig"] as? Int) ?: DEFAULT_CHANNEL_CONFIG
    audioFormat = (params["audioFormat"] as? Int) ?: DEFAULT_AUDIO_FORMAT
    bufferSizeInBytes = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
    channels = if (channelConfig == AudioFormat.CHANNEL_IN_MONO) 1 else 2
    bitDepth = if (audioFormat == AudioFormat.ENCODING_PCM_16BIT) 16 else 8
  }

  private fun listAudioFiles(): List<String> {
    val filesDir = appContext.reactContext?.filesDir
    // Filter to include only .wav files
    val files = filesDir?.listFiles { file ->
      file.isFile && file.name.endsWith(".wav")
    }?.map { it.absolutePath } ?: listOf()  // Use `listOf()` to return an empty list if null
    return files
  }


  private fun startRecording(options: Map<String, Any?>, promise: Promise) {
    if (!checkPermission()) {
      promise.reject("PERMISSION_DENIED", "Recording permission has not been granted", null)
      return
    }

    if (isRecording.get() && !isPaused.get()) {
      promise.reject("ALREADY_RECORDING", "Recording is already in progress", null)
      return
    }

    val intervalOption = options["interval"]
    if (intervalOption != null) {
      Log.d("AudioRecorderModule", "Setting interval to $intervalOption")
      if (intervalOption is Number) {
        val intervalValue = intervalOption.toLong()
        if (intervalValue < 100) {
          promise.reject("INVALID_INTERVAL", "Interval must be at least 100 ms", null)
          return
        } else {
          this.interval = intervalValue
        }
      } else {
        promise.reject("INVALID_INTERVAL", "Interval must be a number", null)
        return
      }
    }

    // Log for new recording or resuming
    if (!isPaused.get()) {
      streamUuid = java.util.UUID.randomUUID().toString()
      audioFile = File(appContext.reactContext?.filesDir, "audio_${streamUuid}.wav")
      Log.i("AudioRecorderModule", "Starting new recording $streamUuid with sample rate: $sampleRateInHz, channel config: $channelConfig, audio format: $audioFormat, buffer size: $bufferSizeInBytes, interval: $interval")

    } else {
      Log.i("AudioRecorderModule", "Resuming recording")
    }

    // Initialize the recorder if it's a new recording
    if (!isPaused.get() && !initializeRecorder()) {
      promise.reject("INITIALIZATION_FAILED", "AudioRecord initialization failed", null)
      return
    }

    try {
      FileOutputStream(audioFile, true).use { fos ->
        writeWavHeader(fos)
      }
    } catch (e: IOException) {
      promise.reject("FILE_CREATION_FAILED", "Failed to create audio file with WAV header", null)
      return
    }

    audioRecord?.startRecording()
    isPaused.set(false)
    isRecording.set(true)


    if (!isPaused.get()) {
      recordingStartTime = System.currentTimeMillis() // Only reset start time if it's not a resume
    }

    recordingThread = Thread { recordingProcess() }.apply { start() }
    promise.resolve(audioFile?.toURI().toString())
  }

  private fun stopRecording(promise: Promise) {
    if (!isRecording.get()) {
      promise.reject("NOT_RECORDING", "Recording is not active", null)
      return
    }

    try {
      audioRecord?.stop()
      audioRecord?.release()

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
      promise.reject("STOP_FAILED", "Failed to stop recording", e)
    } finally {
      audioRecord = null
    }
  }

  private fun recordingProcess() {
    FileOutputStream(audioFile, true).use { fos ->
      // Buffer to accumulate data
      val accumulatedAudioData = ByteArrayOutputStream()

      // Write audio data directly to the file
      val audioData = ByteArray(bufferSizeInBytes)
      while (isRecording.get()) {
        if (!isPaused.get()) {
          val bytesRead = audioRecord?.read(audioData, 0, bufferSizeInBytes) ?: -1
          if (bytesRead < 0) {
            Log.e("AudioRecorderModule", "Read error: $bytesRead")
            break
          }
          if (bytesRead > 0) {
            fos.write(audioData, 0, bytesRead)
            totalDataSize += bytesRead
            accumulatedAudioData.write(audioData, 0, bytesRead)

            // Emit audio data at defined intervals
            if (SystemClock.elapsedRealtime() - lastEmitTime >= interval) {
              emitAudioData(accumulatedAudioData.toByteArray(), accumulatedAudioData.size())
              lastEmitTime = SystemClock.elapsedRealtime() // Reset the timer
              accumulatedAudioData.reset() // Clear the accumulator
            }
          }
        }
      }
    }
    updateWavHeader() // Update the header with the correct file size after recording stops
  }

  private fun updateWavHeader() {
    try {
      RandomAccessFile(audioFile, "rw").use { raf ->
        val fileSize = raf.length()
        val dataSize = fileSize - 44 // Subtract the header size
        raf.seek(4) // Skip 'RIFF' label

        // Write correct file size, excluding the first 8 bytes of the RIFF header
        raf.writeInt(Integer.reverseBytes((dataSize + 36).toInt()))

        raf.seek(40) // Go to the data size position
        raf.writeInt(Integer.reverseBytes(dataSize.toInt())) // Write the size of the data segment
      }
    } catch (e: IOException) {
      Log.e("AudioRecorderModule", "Could not update WAV header", e)
    }
  }

  private fun clearAudioStorage() {
    // Clear all files in the app's internal storage
    val filesDir = appContext.reactContext?.filesDir
    filesDir?.listFiles()?.forEach {
      Log.d("AudioRecorderModule", "Deleting file: ${it.absolutePath}")
      it.delete()
    }
  }

  private fun emitAudioData(audioData: ByteArray, length: Int) {
    // Since audioData now contains the actual bytes read, you do not need to read from audioDataBuffer.
    // Encode the part of the buffer that contains new audio data.
    val encodedBuffer = encodeAudioData(audioData)
    val fileSize = audioFile?.length() ?: 0 // Update file size information
    val from = lastEmittedSize
    val deltaSize = fileSize - lastEmittedSize
    lastEmittedSize = fileSize // Update last emitted size

    // Calculate position in milliseconds
    val positionInMs = (from * 1000) / (sampleRateInHz * channels * (bitDepth / 8))

    mainHandler.post {
      try {
        this@ExpoAudioStreamModule.sendEvent(AUDIO_EVENT_NAME, bundleOf(
          "fileUri" to audioFile?.toURI().toString(),
          "lastEmittedSize" to from,
          "encoded" to encodedBuffer,
          "deltaSize" to length,
          "position" to positionInMs,
          "mimeType" to mimeType,
          "totalSize" to fileSize,
          "streamUuid" to streamUuid
        ))
      } catch (e: Exception) {
        Log.e("AudioRecorderModule", "Failed to send event", e)
      }
    }
    // audioDataBuffer.reset() is no longer needed here as we do not use the buffer to store ongoing data
  }

  private fun encodeAudioData(rawData: ByteArray): String {
    return Base64.encodeToString(rawData, Base64.NO_WRAP)
  }

  private fun saveAudioToFile(rawData: ByteArray): Boolean {
    return try {
      // Open a FileOutputStream in append mode.
      FileOutputStream(audioFile, true).use { output ->
        // Write rawData to the file.
        output.write(rawData)
      }
      true
    } catch (e: IOException) {
      // Handle exceptions here
      Log.e("AudioRecorderModule", "Could not write to file: ${audioFile?.absolutePath}", e)
      false
    }
  }

  private fun checkPermission(): Boolean {
    val reactContext = appContext.reactContext ?: return false // If reactContext is null, permissions cannot be checked
    return ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
  }

  private fun pauseRecording(promise: Promise) {
    if (isRecording.get() && !isPaused.get()) {
      audioRecord?.stop()
      lastPauseTime = System.currentTimeMillis()  // Record the time when the recording was paused
      isPaused.set(true)
      promise.resolve("Recording paused")
    } else {
      promise.reject("NOT_RECORDING_OR_ALREADY_PAUSED", "Recording is either not active or already paused", null)
    }
  }

  @SuppressLint("MissingPermission")
  private fun initializeRecorder(): Boolean {
    Log.d("AudioRecorderModule", "Initializing recorder")
    bufferSizeInBytes = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
    Log.d("AudioRecorderModule", "Buffer size: $bufferSizeInBytes")

    if (bufferSizeInBytes == AudioRecord.ERROR_BAD_VALUE) {
      Log.e("AudioRecorderModule", "Invalid buffer size")
      return false
    }

    val recorder = AudioRecord(MediaRecorder.AudioSource.MIC, sampleRateInHz, channelConfig, audioFormat, bufferSizeInBytes)
    if (recorder.state != AudioRecord.STATE_INITIALIZED) {
      Log.e("AudioRecorderModule", "AudioRecord initialization failed")
      recorder.release() // Clean up resources if initialization fails
      return false
    }

    this.audioRecord = recorder // Properly assign the recorder to the class member
    return true
  }

}
