package net.siteed.audiostream

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise

class AudioRecordingService : Service() {
    private val notificationManager by lazy {
        AudioNotificationManager.getInstance(applicationContext)
    }
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isRunning = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(Constants.TAG, "AudioRecordingService onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(Constants.TAG, "AudioRecordingService onStartCommand")

        if (!isRunning) {
            try {
                val notification = notificationManager.getNotification()
                startForeground(1, notification)
                isRunning = true
            } catch (e: Exception) {
                Log.e(Constants.TAG, "Error starting foreground service", e)
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        Log.d(Constants.TAG, "AudioRecordingService onDestroy")

        stopForeground(STOP_FOREGROUND_REMOVE)

        isRunning = false
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(Constants.TAG, "AudioRecordingService onTaskRemoved")
        
        // Stop recording when app is killed
        AudioRecorderManager.getInstance()?.let { manager ->
            mainHandler.post {
                // Create a simple promise object for internal use
                val promise = object : Promise {
                    override fun resolve(value: Any?) {
                        Log.d(Constants.TAG, "Successfully stopped recording on task removed")
                        cleanup()
                    }
                    override fun reject(code: String, message: String?, cause: Throwable?) {
                        Log.e(Constants.TAG, "Failed to stop recording on task removed: $message")
                        cleanup()
                    }
                }

                try {
                    manager.stopRecording(promise)
                } catch (e: Exception) {
                    promise.reject("ERROR", e.message, e)
                }
            }
        }
    }

    
    private fun cleanup() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    companion object {
        fun startService(context: Context) {
            val serviceIntent = Intent(context, AudioRecordingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }

        fun stopService(context: Context) {
            context.stopService(Intent(context, AudioRecordingService::class.java))
        }
    }
}