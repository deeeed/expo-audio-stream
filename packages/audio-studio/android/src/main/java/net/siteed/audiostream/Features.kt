package net.siteed.audiostream

import android.os.Bundle
import androidx.core.os.bundleOf

data class Features(
    val energy: Float = 0f,
    val mfcc: List<Float> = emptyList(),
    val rms: Float = 0f,
    val minAmplitude: Float = 0f,
    val maxAmplitude: Float = 0f,
    val zcr: Float = 0f,
    val spectralCentroid: Float = 0f,
    val spectralFlatness: Float = 0f,
    val spectralRollOff: Float = 0f,
    val spectralBandwidth: Float = 0f,
    val tempo: Float = 0f,
    val hnr: Float = 0f,
    val melSpectrogram: List<Float> = emptyList(),
    val chromagram: List<Float> = emptyList(),
    val spectralContrast: List<Float> = emptyList(),
    val tonnetz: List<Float> = emptyList(),
    val pitch: Float = 0f,
    val crc32: Long? = null
) {
    fun toDictionary(): Map<String, Any> {
        val baseMap = mapOf(
            "energy" to energy,
            "mfcc" to mfcc,
            "rms" to rms,
            "minAmplitude" to minAmplitude,
            "maxAmplitude" to maxAmplitude,
            "zcr" to zcr,
            "spectralCentroid" to spectralCentroid,
            "spectralFlatness" to spectralFlatness,
            "spectralRollOff" to spectralRollOff,
            "spectralBandwidth" to spectralBandwidth,
            "tempo" to tempo,
            "hnr" to hnr,
            "melSpectrogram" to melSpectrogram,
            "chromagram" to chromagram,
            "spectralContrast" to spectralContrast,
            "tonnetz" to tonnetz,
            "pitch" to pitch,
            "crc32" to (crc32 ?: 0)
        )
        return baseMap.filterValues { it != null }
    }

    fun toBundle(): Bundle {
        return bundleOf(
            "energy" to energy,
            "mfcc" to mfcc,
            "rms" to rms,
            "minAmplitude" to minAmplitude,
            "maxAmplitude" to maxAmplitude,
            "zcr" to zcr,
            "spectralCentroid" to spectralCentroid,
            "spectralFlatness" to spectralFlatness,
            "spectralRollOff" to spectralRollOff,
            "spectralBandwidth" to spectralBandwidth,
            "tempo" to tempo,
            "hnr" to hnr,
            "melSpectrogram" to melSpectrogram,
            "chromagram" to chromagram,
            "spectralContrast" to spectralContrast,
            "tonnetz" to tonnetz,
            "pitch" to pitch,
            "crc32" to (crc32 ?: 0)
        )
    }

    companion object {
        fun parseFeatureOptions(options: Map<*, *>?): Map<String, Boolean> {
            return options?.let { map ->
                mapOf(
                    "energy" to (map["energy"] as? Boolean ?: false),
                    "mfcc" to (map["mfcc"] as? Boolean ?: false),
                    "rms" to (map["rms"] as? Boolean ?: false),
                    "zcr" to (map["zcr"] as? Boolean ?: false),
                    "dB" to (map["dB"] as? Boolean ?: false),
                    "spectralCentroid" to (map["spectralCentroid"] as? Boolean ?: false),
                    "spectralFlatness" to (map["spectralFlatness"] as? Boolean ?: false),
                    "spectralRollOff" to (map["spectralRollOff"] as? Boolean ?: false),
                    "spectralBandwidth" to (map["spectralBandwidth"] as? Boolean ?: false),
                    "chromagram" to (map["chromagram"] as? Boolean ?: false),
                    "tempo" to (map["tempo"] as? Boolean ?: false),
                    "hnr" to (map["hnr"] as? Boolean ?: false),
                    "melSpectrogram" to (map["melSpectrogram"] as? Boolean ?: false),
                    "spectralContrast" to (map["spectralContrast"] as? Boolean ?: false),
                    "tonnetz" to (map["tonnetz"] as? Boolean ?: false),
                    "pitch" to (map["pitch"] as? Boolean ?: false),
                    "crc32" to (map["crc32"] as? Boolean ?: false)
                )
            } ?: emptyMap()
        }
    }
}
