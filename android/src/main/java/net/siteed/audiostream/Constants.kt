package net.siteed.audiostream

object Constants {
    const val AUDIO_EVENT_NAME = "AudioData"
    const val DEFAULT_SAMPLE_RATE = 16000 // Default sample rate for audio recording
    const val DEFAULT_CHANNEL_CONFIG = 1 // Mono
    const val DEFAULT_AUDIO_FORMAT = 16 // 16-bit PCM
    const val DEFAULT_INTERVAL = 1000L
    const val MIN_INTERVAL = 100L // Minimum interval in ms for emitting audio data
    const val WAV_HEADER_SIZE = 44
    const val TAG = "AudioRecorderModule"
}