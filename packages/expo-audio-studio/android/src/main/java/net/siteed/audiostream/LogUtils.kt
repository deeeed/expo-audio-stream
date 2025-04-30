package net.siteed.audiostream

import android.util.Log

/**
 * Utility class for standardized logging across the ExpoAudioStream library.
 * Provides consistent logging format and tags for easier filtering in logcat.
 */
object LogUtils {
    // Format: [ExpoAudioStream:ClassName]
    private const val TAG_PREFIX = "ExpoAudioStream"
    
    /**
     * Logs a debug message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     */
    fun d(className: String, message: String) {
        Log.d("$TAG_PREFIX:$className", message)
    }
    
    /**
     * Logs an error message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     * @param throwable Optional throwable to include in the log
     */
    fun e(className: String, message: String, throwable: Throwable? = null) {
        Log.e("$TAG_PREFIX:$className", message, throwable)
    }
    
    /**
     * Logs a warning message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     * @param throwable Optional throwable to include in the log
     */
    fun w(className: String, message: String, throwable: Throwable? = null) {
        Log.w("$TAG_PREFIX:$className", message, throwable)
    }
    
    /**
     * Logs an info message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     */
    fun i(className: String, message: String) {
        Log.i("$TAG_PREFIX:$className", message)
    }
    
    /**
     * Creates a formatted tag for direct use with Android Log methods.
     * Use this if you need to use the Android Log methods directly.
     * 
     * @param className The name of the class generating the log
     * @return A formatted tag string
     */
    fun tag(className: String): String {
        return "$TAG_PREFIX:$className"
    }
} 