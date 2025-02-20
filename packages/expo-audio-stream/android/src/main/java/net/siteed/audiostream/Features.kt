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
    val tonnetz: List<Float> = emptyList()
) {
    fun toDictionary(): Map<String, Any> {
        return mapOf(
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
            "tonnetz" to tonnetz
        )
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
            "tonnetz" to tonnetz
        )
    }
}
