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
const val AUDIO_EVENT_NAME = "AudioData"

class ExpoAudioStreamModule() : Module() {
  private var audioRecord: AudioRecord? = null
  private var sampleRateInHz = 44100  // Default sample rate
  private var channelConfig = AudioFormat.CHANNEL_IN_MONO
  private var audioFormat = AudioFormat.ENCODING_PCM_16BIT
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
  private val mainHandler = Handler(Looper.getMainLooper())

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
      val currentTime = System.currentTimeMillis()
      totalRecordedTime = (currentTime - recordingStartTime - pausedDuration)  // Adjust the total recording time

      bundleOf(
        "duration" to totalRecordedTime,
        "isRecording" to isRecording.get(),
        "isPaused" to isPaused.get(),
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
      pauseRecording(promise)
    }

    AsyncFunction("stopRecording") { promise: Promise ->
      stopRecording(promise)
    }
  }

  private fun configureRecording(params: Map<String, Any?>) {
    sampleRateInHz = (params["sampleRate"] as? Int) ?: 44100
    channelConfig = (params["channelConfig"] as? Int) ?: AudioFormat.CHANNEL_IN_MONO
    audioFormat = (params["audioFormat"] as? Int) ?: AudioFormat.ENCODING_PCM_16BIT
    bufferSizeInBytes = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
  }

  private fun listAudioFiles(): List<String> {
    val filesDir = appContext.reactContext?.filesDir
    // Filter to include only .pcm files
    val files = filesDir?.listFiles { file ->
      file.isFile && file.name.endsWith(".pcm")
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
      audioFile = File(appContext.reactContext?.filesDir, "audio_${streamUuid}.pcm")
      Log.i("AudioRecorderModule", "Starting new recording $streamUuid with sample rate: $sampleRateInHz, channel config: $channelConfig, audio format: $audioFormat, buffer size: $bufferSizeInBytes, interval: $interval")

    } else {
      Log.i("AudioRecorderModule", "Resuming recording")
    }

    // Initialize the recorder if it's a new recording
    if (!isPaused.get() && !initializeRecorder()) {
      promise.reject("INITIALIZATION_FAILED", "AudioRecord initialization failed", null)
      return
    }

    audioRecord?.startRecording()
    isPaused.set(false)
    isRecording.set(true)


    if (!isPaused.get()) {
      recordingStartTime = System.currentTimeMillis() // Only reset start time if it's not a resume
    }

    recordingThread = Thread { recordingProcess() }.apply { start() }
    promise.resolve(null)
  }

  private fun stopRecording(promise: Promise) {
    if (!isRecording.get()) {
      promise.reject("NOT_RECORDING", "Recording is not active", null)
      return
    }

    try {
      audioRecord?.stop()
      audioRecord?.release()
      val endTime = System.currentTimeMillis()
      totalRecordedTime += (endTime - recordingStartTime - pausedDuration)  // Adjust the total recording time
      isRecording.set(false)
      isPaused.set(false)
      promise.resolve(totalRecordedTime)
      // Reset the timing variables
      totalRecordedTime = 0
      pausedDuration = 0
    } catch (e: Exception) {
      promise.reject("STOP_FAILED", "Failed to stop recording", e)
    } finally {
      audioRecord = null
    }
  }

  private fun recordingProcess() {

    val audioData = ByteArray(bufferSizeInBytes)
    while (isRecording.get()) {
      if (!isPaused.get()) {
        val bytesRead = audioRecord?.read(audioData, 0, bufferSizeInBytes) ?: -1
        if (bytesRead < 0) {
          Log.e("AudioRecorderModule", "Read error: $bytesRead")
          break
        }
        if (bytesRead > 0) {
          audioDataBuffer.write(audioData, 0, bytesRead)
          totalDataSize += bytesRead
          if (SystemClock.elapsedRealtime() - lastEmitTime >= interval) {
            emitAudioData()
            lastEmitTime = SystemClock.elapsedRealtime() // Reset the timer
          }
        }
      }
    }
    if (audioDataBuffer.size() > 0) {
      emitAudioData() // Emit any remaining data
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

  private fun emitAudioData() {
    val rawData = audioDataBuffer.toByteArray()
    if (!saveAudioToFile(rawData)) {
      Log.e("AudioRecorderModule", "Failed to save audio data")
      return
    }
    val encodedBuffer = encodeAudioData(rawData)
    val fileSize = audioFile?.length() ?: 0
    val from = lastEmittedSize
    val deltaSize = fileSize - lastEmittedSize
    lastEmittedSize = fileSize
    mainHandler.post {
      try {
        this@ExpoAudioStreamModule.sendEvent(AUDIO_EVENT_NAME,
          bundleOf(
            "fileUri" to audioFile?.toURI().toString(),
            "from" to from,
            "encoded" to encodedBuffer,
            "deltaSize" to deltaSize,
            "totalSize" to fileSize,
            "streamUuid" to streamUuid
          )
        )
      } catch (e: Exception) {
        Log.e("AudioRecorderModule", "Failed to send event", e)
      }
    }
    audioDataBuffer.reset() // Clear the buffer after emitting
  }

  private fun encodeAudioData(rawData: ByteArray): String {
    return Base64.encodeToString(rawData, Base64.DEFAULT)
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
