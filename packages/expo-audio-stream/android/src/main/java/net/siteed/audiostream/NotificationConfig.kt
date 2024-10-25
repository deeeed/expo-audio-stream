package net.siteed.audiostream

data class NotificationConfig(
    val title: String = "Recording...",
    val text: String = "",
    val icon: String? = null,
    val channelId: String = "audio_recording_channel",
    val actions: List<NotificationAction> = emptyList()
)

data class NotificationAction(
    val title: String,
    val icon: String? = null,
    val intentAction: String
)