package net.siteed.audiostream

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.kotlin.Promise

class RecordingActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d("RecordingActionReceiver", "Received action: $action")

        val audioRecorderManager = AudioRecorderManager.getExistingInstance()

        if (audioRecorderManager == null) {
            Log.e("RecordingActionReceiver", "AudioRecorderManager instance is null")
            return
        }

        val notificationPromise = object : Promise {
            override fun resolve(value: Any?) {
                Log.d("RecordingActionReceiver", "Action completed successfully: $action")
            }

            override fun reject(code: String, message: String?, cause: Throwable?) {
                Log.e("RecordingActionReceiver", "Action failed: $action, Error: $message", cause)
            }
        }

        when (action) {
            "PAUSE_RECORDING" -> audioRecorderManager.pauseRecording(notificationPromise)
            "RESUME_RECORDING" -> audioRecorderManager.resumeRecording(notificationPromise)
            "STOP_RECORDING" -> audioRecorderManager.stopRecording(notificationPromise)
            else -> Log.w("RecordingActionReceiver", "Unknown action: $action")
        }
    }
}