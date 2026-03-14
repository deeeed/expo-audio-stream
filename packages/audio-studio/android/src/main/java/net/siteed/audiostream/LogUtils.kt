package net.siteed.audiostream

import android.util.Log

/**
 * Utility class for standardized logging across the ExpoAudioStudio library.
 * Provides consistent logging format and tags for easier filtering in logcat.
 */
object LogUtils {
    // Format: [ExpoAudioStudio:ClassName]
    private const val TAG_PREFIX = "ExpoAudioStudio"
    
    // Check if we're running in a test environment
    private val isInTest: Boolean by lazy {
        try {
            Class.forName("org.junit.Test")
            true
        } catch (e: ClassNotFoundException) {
            false
        }
    }
    
    /**
     * Logs a debug message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     */
    fun d(className: String, message: String) {
        if (isInTest) {
            println("D/$TAG_PREFIX:$className: $message")
        } else {
            Log.d("$TAG_PREFIX:$className", message)
        }
    }
    
    /**
     * Logs an error message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     * @param throwable Optional throwable to include in the log
     */
    fun e(className: String, message: String, throwable: Throwable? = null) {
        if (isInTest) {
            println("E/$TAG_PREFIX:$className: $message")
            throwable?.printStackTrace()
        } else {
            Log.e("$TAG_PREFIX:$className", message, throwable)
        }
    }
    
    /**
     * Logs a warning message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     * @param throwable Optional throwable to include in the log
     */
    fun w(className: String, message: String, throwable: Throwable? = null) {
        if (isInTest) {
            println("W/$TAG_PREFIX:$className: $message")
            throwable?.printStackTrace()
        } else {
            Log.w("$TAG_PREFIX:$className", message, throwable)
        }
    }
    
    /**
     * Logs an info message with a consistent format.
     * 
     * @param className The name of the class generating the log
     * @param message The message to log
     */
    fun i(className: String, message: String) {
        if (isInTest) {
            println("I/$TAG_PREFIX:$className: $message")
        } else {
            Log.i("$TAG_PREFIX:$className", message)
        }
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