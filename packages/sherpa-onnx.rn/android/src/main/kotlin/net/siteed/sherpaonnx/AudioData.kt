/**
 * Data class to hold audio sample data
 */
package net.siteed.sherpaonnx

/**
 * Data class to hold audio sample data
 * 
 * @param samples Float array of audio samples (typically in range -1.0 to 1.0)
 * @param sampleRate Sample rate in Hz
 */
data class AudioData(
    val samples: FloatArray, 
    val sampleRate: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as AudioData

        if (!samples.contentEquals(other.samples)) return false
        if (sampleRate != other.sampleRate) return false

        return true
    }

    override fun hashCode(): Int {
        var result = samples.contentHashCode()
        result = 31 * result + sampleRate
        return result
    }
} 