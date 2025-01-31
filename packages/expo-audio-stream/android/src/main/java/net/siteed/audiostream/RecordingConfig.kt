package net.siteed.audiostream

import android.media.AudioFormat
import android.os.Build
import java.io.File

data class RecordingConfig(
    val sampleRate: Int = Constants.DEFAULT_SAMPLE_RATE,
    val channels: Int = 1,
    val encoding: String = "pcm_16bit",
    val keepAwake: Boolean = false,
    val interval: Long = Constants.DEFAULT_INTERVAL,
    val enableProcessing: Boolean = false,
    val pointsPerSecond: Double = 20.0,
    val algorithm: String = "rms",
    val showNotification: Boolean = false,
    val showWaveformInNotification: Boolean = false,
    val notification: NotificationConfig = NotificationConfig(),
    val features: Map<String, Boolean> = emptyMap(),
    val enableCompressedOutput: Boolean = false,
    val compressedFormat: String = "opus",
    val compressedBitRate: Int = 24000,
    val autoResumeAfterInterruption: Boolean = false,
    val outputDirectory: String? = null,
    val filename: String? = null,
) {
    companion object {
        fun fromMap(options: Map<String, Any?>?): Result<Pair<RecordingConfig, AudioFormatInfo>> {
            if (options == null) {
                val defaultConfig = RecordingConfig()
                val defaultFormat = AudioFormatInfo(
                    format = AudioFormat.ENCODING_PCM_16BIT,
                    mimeType = "audio/wav",
                    fileExtension = "wav"
                )
                return Result.success(Pair(defaultConfig, defaultFormat))
            }

            // Extract features using type-safe helper
            val features = options.getTypedMap<Boolean>("features") { it is Boolean }

            // Parse notification config using type-safe helper
            val notificationMap = options.getTypedMap<Any?>("notification") { true }
            val notificationConfig = NotificationConfig.fromMap(notificationMap)

            // Parse compression config
            val compressionMap = options.getTypedMap<Any?>("compression") { true }
            val enableCompressedOutput = compressionMap["enabled"] as? Boolean ?: false
            val compressedFormat = (compressionMap["format"] as? String)?.lowercase() ?: "aac"
            val compressedBitRate = (compressionMap["bitrate"] as? Number)?.toInt() ?: 128000

            // Validate bitrate if compression is enabled
            if (enableCompressedOutput) {
                when {
                    compressedBitRate < 8000 -> return Result.failure(
                        IllegalArgumentException("Bitrate must be at least 8000 bps")
                    )
                    compressedBitRate > 960000 -> return Result.failure(
                        IllegalArgumentException("Bitrate cannot exceed 960000 bps")
                    )
                }
            }

            // Only validate directory if it's provided
            val outputDirectory = options["outputDirectory"] as? String
            if (outputDirectory != null) {
                // Clean up the directory path by removing file:// protocol and normalizing
                val cleanDirectory = outputDirectory
                    .replace(Regex("^file://"), "")
                    .trim('/')
                    .replace("//", "/")

                val directory = File(cleanDirectory)
                if (!directory.exists()) {
                    return Result.failure(IllegalArgumentException("Directory does not exist: $cleanDirectory"))
                }
                if (!directory.isDirectory) {
                    return Result.failure(IllegalArgumentException("Path is not a directory: $cleanDirectory"))
                }
                if (!directory.canWrite()) {
                    return Result.failure(IllegalArgumentException("Directory is not writable: $cleanDirectory"))
                }
            }

            // Initialize the recording configuration with cleaned directory path
            val tempRecordingConfig = RecordingConfig(
                sampleRate = options.getNumberOrDefault("sampleRate", Constants.DEFAULT_SAMPLE_RATE),
                channels = options.getNumberOrDefault("channels", 1),
                encoding = options.getStringOrDefault("encoding", "pcm_16bit"),
                keepAwake = options.getBooleanOrDefault("keepAwake", false),
                interval = options.getNumberOrDefault("interval", Constants.DEFAULT_INTERVAL),
                enableProcessing = options.getBooleanOrDefault("enableProcessing", false),
                pointsPerSecond = options.getNumberOrDefault("pointsPerSecond", 20.0),
                algorithm = options.getStringOrDefault("algorithm", "rms"),
                showNotification = options.getBooleanOrDefault("showNotification", false),
                showWaveformInNotification = options.getBooleanOrDefault("showWaveformInNotification", false),
                notification = notificationConfig,
                features = features,
                enableCompressedOutput = enableCompressedOutput,
                compressedFormat = compressedFormat,
                compressedBitRate = compressedBitRate,
                autoResumeAfterInterruption = options.getBooleanOrDefault("autoResumeAfterInterruption", false),
                outputDirectory = outputDirectory?.let {
                    it.replace(Regex("^file://"), "")
                        .trim('/')
                        .replace("//", "/")
                },
                filename = options["filename"] as? String
            )

            // Validate sample rate and channels
            if (tempRecordingConfig.sampleRate !in listOf(16000, 44100, 48000)) {
                return Result.failure(
                    IllegalArgumentException("Sample rate must be one of 16000, 44100, or 48000 Hz")
                )
            }
            if (tempRecordingConfig.channels !in 1..2) {
                return Result.failure(
                    IllegalArgumentException("Channels must be either 1 (Mono) or 2 (Stereo)")
                )
            }

            // Set encoding and file extension
            val audioFormatInfo = when (tempRecordingConfig.encoding) {
                "pcm_8bit" -> AudioFormatInfo(
                    format = AudioFormat.ENCODING_PCM_8BIT,
                    mimeType = "audio/wav",
                    fileExtension = "wav"
                )
                "pcm_16bit" -> AudioFormatInfo(
                    format = AudioFormat.ENCODING_PCM_16BIT,
                    mimeType = "audio/wav",
                    fileExtension = "wav"
                )
                "pcm_32bit" -> AudioFormatInfo(
                    format = AudioFormat.ENCODING_PCM_FLOAT,
                    mimeType = "audio/wav",
                    fileExtension = "wav"
                )
                "opus" -> {
                    if (Build.VERSION.SDK_INT < 29) {
                        return Result.failure(
                            IllegalArgumentException("Opus encoding not supported on this Android version.")
                        )
                    }
                    AudioFormatInfo(
                        format = if (Build.VERSION.SDK_INT >= 29) 20 else AudioFormat.ENCODING_DEFAULT, // 20 is ENCODING_OPUS
                        mimeType = "audio/opus",
                        fileExtension = "opus"
                    )
                }
                "aac_lc" -> AudioFormatInfo(
                    format = AudioFormat.ENCODING_AAC_LC,
                    mimeType = "audio/aac",
                    fileExtension = "aac"
                )
                else -> AudioFormatInfo(
                    format = AudioFormat.ENCODING_DEFAULT,
                    mimeType = "audio/wav",
                    fileExtension = "wav"
                )
            }

            return Result.success(Pair(tempRecordingConfig, audioFormatInfo))
        }
    }
}

// Extension functions for type-safe map access
private inline fun <reified T> Map<String, Any?>.getTypedMap(
    key: String,
    predicate: (Any?) -> Boolean
): Map<String, T> {
    return (this[key] as? Map<*, *>)?.mapNotNull { (k, v) ->
        if (k is String && predicate(v)) {
            k to (v as T)
        } else null
    }?.toMap() ?: emptyMap()
}

private fun Map<String, Any?>.getStringOrDefault(key: String, default: String): String {
    return this[key] as? String ?: default
}

private fun Map<String, Any?>.getBooleanOrDefault(key: String, default: Boolean): Boolean {
    return this[key] as? Boolean ?: default
}

private fun Map<String, Any?>.getNumberOrDefault(key: String, default: Int): Int {
    return (this[key] as? Number)?.toInt() ?: default
}

private fun Map<String, Any?>.getNumberOrDefault(key: String, default: Long): Long {
    return (this[key] as? Number)?.toLong() ?: default
}

private fun Map<String, Any?>.getNumberOrDefault(key: String, default: Double): Double {
    return (this[key] as? Number)?.toDouble() ?: default
}

data class AudioFormatInfo(
    val format: Int,
    val mimeType: String,
    val fileExtension: String
)