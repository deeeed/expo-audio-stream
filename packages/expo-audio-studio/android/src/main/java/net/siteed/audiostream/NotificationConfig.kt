package net.siteed.audiostream

data class NotificationConfig(
    val title: String = "Recording...",
    val text: String = "",
    val icon: String? = null,
    val channelId: String = "audio_recording_channel",
    val notificationId: Int = 1,
    val actions: List<NotificationAction> = emptyList(),
    val channelName: String = "Audio Recording",
    val channelDescription: String = "Shows audio recording status",
    val waveform: WaveformConfig? = null,
    val lightColor: String = "#FF0000",
    val priority: String = "high",
    val accentColor: String? = null,
    val showPauseResumeActions: Boolean = true
) {
    companion object {
        fun fromMap(map: Map<String, Any?>?): NotificationConfig {
            if (map == null) return NotificationConfig()

            val androidMap = map["android"] as? Map<String, Any?> ?: emptyMap()

            return NotificationConfig(
                title = map["title"] as? String ?: "Recording...",
                text = map["text"] as? String ?: "",
                icon = map["icon"] as? String,
                channelId = androidMap["channelId"] as? String ?: "audio_recording_channel",
                notificationId = (androidMap["notificationId"] as? Number)?.toInt() ?: 1,
                actions = parseNotificationActions(androidMap["actions"] as? List<Map<String, Any?>>),
                channelName = androidMap["channelName"] as? String ?: "Audio Recording",
                channelDescription = androidMap["channelDescription"] as? String ?: "Shows audio recording status",
                waveform = parseWaveformConfig(androidMap["waveform"] as? Map<String, Any?>),
                lightColor = androidMap["lightColor"] as? String ?: "#FF0000",
                priority = androidMap["priority"] as? String ?: "high",
                accentColor = androidMap["accentColor"] as? String,
                showPauseResumeActions = androidMap["showPauseResumeActions"] as? Boolean ?: true
            )
        }

        private fun parseNotificationActions(actionsList: List<Map<String, Any?>>?): List<NotificationAction> {
            return actionsList?.mapNotNull { actionMap ->
                if (actionMap["title"] != null && actionMap["identifier"] != null) {
                    NotificationAction(
                        title = actionMap["title"] as String,
                        icon = actionMap["icon"] as? String,
                        intentAction = actionMap["identifier"] as String
                    )
                } else null
            } ?: emptyList()
        }

        private fun parseWaveformConfig(waveformMap: Map<String, Any?>?): WaveformConfig? {
            if (waveformMap == null) return null

            return WaveformConfig(
                color = waveformMap["color"] as? String ?: "#FFFFFF",
                opacity = (waveformMap["opacity"] as? Number)?.toFloat() ?: 1.0f,
                strokeWidth = (waveformMap["strokeWidth"] as? Number)?.toFloat() ?: 1.5f,
                style = waveformMap["style"] as? String ?: "stroke",
                mirror = waveformMap["mirror"] as? Boolean ?: true,
                height = (waveformMap["height"] as? Number)?.toInt() ?: 64
            )
        }
    }
}

data class NotificationAction(
    val title: String,
    val icon: String? = null,
    val intentAction: String
)