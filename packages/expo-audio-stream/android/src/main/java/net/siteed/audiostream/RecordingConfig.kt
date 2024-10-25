package net.siteed.audiostream

data class RecordingConfig(
    val sampleRate: Int = Constants.DEFAULT_SAMPLE_RATE,
    val channels: Int = 1,
    val encoding: String = "pcm_16bit",
    val keepAwake: Boolean = false,
    val interval: Long = Constants.DEFAULT_INTERVAL,
    val enableProcessing: Boolean = false,
    val pointsPerSecond: Double = 20.0,
    val algorithm: String = "rms",
    val features: Map<String, Boolean> = emptyMap(),
    val showNotification: Boolean = false,
    val showWaveformInNotification: Boolean = false,
    val notification: NotificationConfig = NotificationConfig()
)
