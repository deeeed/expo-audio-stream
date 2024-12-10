package net.siteed.audiostream

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import android.Manifest
import android.util.Log

class PermissionUtils(private val context: Context) {
    fun checkRecordingPermission(): Boolean {
        val hasRecordPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        Log.d(Constants.TAG, "RECORD_AUDIO permission: $hasRecordPermission")

        // Check for foreground service permission on Android 14+
        val hasForegroundService = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val result = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.FOREGROUND_SERVICE_MICROPHONE
            ) == PackageManager.PERMISSION_GRANTED
            Log.d(Constants.TAG, "FOREGROUND_SERVICE_MICROPHONE permission: $result (Android 14+)")
            result
        } else {
            Log.d(Constants.TAG, "FOREGROUND_SERVICE_MICROPHONE not required (Android < 14)")
            true
        }

        val result = hasRecordPermission && hasForegroundService
        Log.d(Constants.TAG, "Final recording permission result: $result")
        return result
    }

    fun checkNotificationPermission(): Boolean {
        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            Log.d(Constants.TAG, "POST_NOTIFICATIONS permission: $hasPermission (Android 13+)")
            hasPermission
        } else {
            Log.d(Constants.TAG, "POST_NOTIFICATIONS not required (Android < 13)")
            true
        }
        return result
    }
}