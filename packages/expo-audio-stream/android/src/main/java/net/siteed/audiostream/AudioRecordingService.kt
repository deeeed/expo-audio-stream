package net.siteed.audiostream

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.os.Handler
import android.os.Looper

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

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }

        isRunning = false
        super.onDestroy()
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