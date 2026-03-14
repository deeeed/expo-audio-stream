package net.siteed.audiostream

import android.os.Bundle

interface EventSender {
    fun sendExpoEvent(eventName: String, params: Bundle)
}
