package net.siteed.audiostream

import android.util.Base64

class AudioDataEncoder {
    public fun encodeToBase64(rawData: ByteArray): String {
        return Base64.encodeToString(rawData, Base64.NO_WRAP)
    }
}