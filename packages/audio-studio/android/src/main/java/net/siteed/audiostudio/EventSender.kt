package net.siteed.audiostudio

import android.os.Bundle

interface EventSender {
    fun sendExpoEvent(eventName: String, params: Bundle)
}
