package net.siteed.audiostream

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import android.os.Handler
import android.os.Looper

class AudioRecordingService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    private var audioRecorderManager: AudioRecorderManager? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        Log.d(Constants.TAG, "AudioRecordingService onCreate")
        initializeManager()
    }

    private fun initializeManager() {
        try {
            audioRecorderManager = AudioRecorderManager.getExistingInstance()

            if (audioRecorderManager == null) {
                // Try one more time after a short delay
                mainHandler.postDelayed({
                    audioRecorderManager = AudioRecorderManager.getExistingInstance()
                    if (audioRecorderManager == null) {
                        Log.e(Constants.TAG, "Failed to get AudioRecorderManager instance")
                        stopSelf()
                    }
                }, 100)
            }
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Error initializing AudioRecorderManager", e)
            stopSelf()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(Constants.TAG, "AudioRecordingService onStartCommand")

        try {
            val manager = audioRecorderManager ?: AudioRecorderManager.getExistingInstance()
            if (manager != null) {
                val notification = manager.getNotification()
                startForeground(1, notification)
            } else {
                Log.e(Constants.TAG, "AudioRecorderManager not available")
                stopSelf()
            }
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Error starting foreground service", e)
            stopSelf()
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

        audioRecorderManager = null
        super.onDestroy()
    }
}