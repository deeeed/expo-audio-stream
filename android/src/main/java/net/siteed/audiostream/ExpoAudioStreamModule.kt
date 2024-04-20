package net.siteed.audiostream


import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class AudioRecorderModule(val appContext: AppContext) : Module() {
  private var audioRecord: AudioRecord? = null
  private var sampleRateInHz = 44100  // Default sample rate
  private var channelConfig = AudioFormat.CHANNEL_IN_MONO
  private var audioFormat = AudioFormat.ENCODING_PCM_16BIT
  private var bufferSizeInBytes: Int
  private var isRecording = false
  private var recordingStartTime: Long = 0
  private var totalRecordedTime: Long = 0

  init {
    bufferSizeInBytes = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
  }

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ExpoAudioStream')` in JavaScript.
    Name("ExpoAudioStream")

    Function("configureRecordingSettings") { params: Map<String, Any?> ->
      sampleRateInHz = (params["sampleRate"] as? Int) ?: 44100
      channelConfig = (params["channelConfig"] as? Int) ?: AudioFormat.CHANNEL_IN_MONO
      audioFormat = (params["audioFormat"] as? Int) ?: AudioFormat.ENCODING_PCM_16BIT
      bufferSizeInBytes = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat)
    }

    AsyncFunction("startRecording") { _, promise: Promise ->
      if (!checkPermission()) {
        promise.reject("PERMISSION_DENIED", "Recording permission has not been granted")
        return@AsyncFunction
      }

      if (isRecording) {
        promise.reject("ALREADY_RECORDING", "Recording is already in progress")
        return@AsyncFunction
      }

      audioRecord = AudioRecord(MediaRecorder.AudioSource.MIC, sampleRateInHz, channelConfig, audioFormat, bufferSizeInBytes)
      if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
        promise.reject("INITIALIZATION_FAILED", "AudioRecord initialization failed")
        return@AsyncFunction
      }

      audioRecord?.startRecording()
      isRecording = true
      recordingStartTime = System.currentTimeMillis()
      Thread(this::recordingProcess).start()
      promise.resolve(null)
    }

    AsyncFunction("stopRecording") { promise: Promise ->
      if (!isRecording) {
        promise.reject("NOT_RECORDING", "Recording is not active")
        return@AsyncFunction
      }
      audioRecord?.stop()
      audioRecord?.release()
      audioRecord = null
      isRecording = false
      updateRecordingTime()
      promise.resolve(totalRecordedTime)
    }

    Function("getRecordingDuration") { ->
      if (isRecording) {
        totalRecordedTime + (System.currentTimeMillis() - recordingStartTime)
      } else {
        totalRecordedTime
      }
    }
  }

  private fun recordingProcess() {
    val audioData = ByteArray(bufferSizeInBytes)
    while (isRecording) {
      val bytesRead = audioRecord?.read(audioData, 0, bufferSizeInBytes) ?: -1
      if (bytesRead < 0) {
        handleError("Read error: $bytesRead")
        break
      }
      // Optionally handle the audio data, such as sending it to JavaScript
    }
  }

  private fun updateRecordingTime() {
    if (isRecording) {
      totalRecordedTime += System.currentTimeMillis() - recordingStartTime
      recordingStartTime = System.currentTimeMillis()
    }
  }

  private fun handleError(errorMessage: String) {
    Log.e("AudioRecorderModule", errorMessage)
  }


  private fun checkPermission(): Boolean {
    return ContextCompat.checkSelfPermission(appContext.reactContext, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
  }
}
