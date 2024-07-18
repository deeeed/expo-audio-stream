package net.siteed.audiostream

import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

class PermissionUtils(private val context: Context) {

    /**
     * Checks if the recording permission has been granted.
     * @return Boolean indicating whether the RECORD_AUDIO permission is granted.
     */
    fun checkRecordingPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    }
}