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
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build.VERSION_CODES
import android.app.Notification
import androidx.core.app.NotificationCompat

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
            isRunning = true
            
            // Start as foreground service if keepAwake is true, regardless of notification settings
            val keepAwake = AudioRecorderManager.getInstance()?.getKeepAwakeStatus() ?: false
            if (keepAwake) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Create a minimal notification channel if needed
                    val channel = NotificationChannel(
                        "recording_service",
                        "Recording Service",
                        NotificationManager.IMPORTANCE_LOW
                    ).apply {
                        setSound(null, null)
                        enableLights(false)
                        enableVibration(false)
                    }
                    val notificationManager = getSystemService(NotificationManager::class.java)
                    notificationManager.createNotificationChannel(channel)
                    
                    // Create minimal silent notification
                    val notification = NotificationCompat.Builder(this, "recording_service")
                        .setContentTitle("")
                        .setContentText("")
                        .setSmallIcon(R.drawable.ic_microphone)
                        .setOngoing(true)
                        .setSound(null)
                        .setVibrate(null)
                        .setDefaults(0)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .build()
                    
                    startForeground(1, notification)
                }
            }
        }
        
        return START_STICKY
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