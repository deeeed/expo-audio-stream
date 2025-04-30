// net/siteed/audiostream/AudioAnalysisData.kt
package net.siteed.audiostream

import android.os.Bundle
import androidx.core.os.bundleOf
import net.siteed.audiostream.LogUtils

/**
 * Represents speech-related features of an audio segment
 */
data class SpeechFeatures(
    val isActive: Boolean,
    val speakerId: Int? = null
) {
    companion object {
        private const val CLASS_NAME = "SpeechFeatures"
    }
    
    fun toDictionary(): Map<String, Any?> {
        return mapOf(
            "isActive" to isActive,
            "speakerId" to speakerId
        )
    }

    fun toBundle(): Bundle {
        return bundleOf(
            "isActive" to isActive,
            "speakerId" to speakerId
        )
    }
}

/**
 * A single data point in the audio analysis result
 */
data class DataPoint(
    val id: Long,
    val amplitude: Float,
    val rms: Float,
    val dB: Float,
    val silent: Boolean,
    val features: Features? = null,
    val speech: SpeechFeatures? = null,
    val startTime: Float? = null,
    val endTime: Float? = null,
    val startPosition: Int? = null,
    val endPosition: Int? = null,
    val samples: Int = 0
) {
    companion object {
        private const val CLASS_NAME = "DataPoint"
    }
    
    fun toDictionary(): Map<String, Any?> {
        return mapOf(
            "id" to id,
            "amplitude" to amplitude,
            "rms" to rms,
            "dB" to dB,
            "silent" to silent,
            "features" to features?.toDictionary(),
            "speech" to speech?.toDictionary(),
            "startTime" to startTime,
            "endTime" to endTime,
            "startPosition" to startPosition,
            "endPosition" to endPosition,
            "samples" to samples
        )
    }

    fun toBundle(): Bundle {
        return bundleOf(
            "id" to id,
            "amplitude" to amplitude,
            "rms" to rms,
            "dB" to dB,
            "silent" to silent,
            "features" to features?.toBundle(),
            "speech" to speech?.toBundle(),
            "startTime" to startTime,
            "endTime" to endTime,
            "startPosition" to startPosition,
            "endPosition" to endPosition,
            "samples" to samples
        )
    }
}

/**
 * Primary class to hold audio analysis results
 */
data class AudioAnalysisData(
    val segmentDurationMs: Int,
    val durationMs: Int,
    val bitDepth: Int,
    val numberOfChannels: Int,
    val sampleRate: Int,
    val samples: Int,
    val dataPoints: List<DataPoint>,
    val amplitudeRange: AmplitudeRange,
    val rmsRange: AmplitudeRange,
    val speechAnalysis: SpeechAnalysis? = null,
    val extractionTimeMs: Float
) {
    companion object {
        private const val CLASS_NAME = "AudioAnalysisData"
    }

    data class AmplitudeRange(val min: Float, val max: Float) {
        fun toDictionary(): Map<String, Float> {
            return mapOf("min" to min, "max" to max)
        }

        fun toBundle(): Bundle {
            return bundleOf("min" to min, "max" to max)
        }
    }

    data class SpeechAnalysis(
        val speakerChanges: List<SpeakerChange>
    ) {
        fun toDictionary(): Map<String, Any> {
            return mapOf(
                "speakerChanges" to speakerChanges.map { it.toDictionary() }
            )
        }

        fun toBundle(): Bundle {
            return bundleOf(
                "speakerChanges" to speakerChanges.map { it.toBundle() }.toTypedArray()
            )
        }
    }

    data class SpeakerChange(
        val timestamp: Long,
        val speakerId: Int
    ) {
        fun toDictionary(): Map<String, Any> {
            return mapOf(
                "timestamp" to timestamp,
                "speakerId" to speakerId
            )
        }

        fun toBundle(): Bundle {
            return bundleOf(
                "timestamp" to timestamp,
                "speakerId" to speakerId
            )
        }
    }

    fun toDictionary(): Map<String, Any?> {
        return mapOf(
            "segmentDurationMs" to segmentDurationMs,
            "durationMs" to durationMs,
            "bitDepth" to bitDepth,
            "numberOfChannels" to numberOfChannels,
            "sampleRate" to sampleRate,
            "samples" to samples,
            "dataPoints" to dataPoints.map { it.toDictionary() },
            "amplitudeRange" to amplitudeRange.toDictionary(),
            "rmsRange" to rmsRange.toDictionary(),
            "speechAnalysis" to speechAnalysis?.toDictionary(),
            "extractionTimeMs" to extractionTimeMs
        )
    }

    fun toBundle(): Bundle {
        val dataPointsBundleArray = dataPoints.map { it.toBundle() }.toTypedArray()

        return bundleOf(
            "segmentDurationMs" to segmentDurationMs,
            "durationMs" to durationMs,
            "bitDepth" to bitDepth,
            "numberOfChannels" to numberOfChannels,
            "sampleRate" to sampleRate,
            "samples" to samples,
            "dataPoints" to dataPointsBundleArray,
            "amplitudeRange" to amplitudeRange.toBundle(),
            "rmsRange" to rmsRange.toBundle(),
            "speechAnalysis" to speechAnalysis?.toBundle(),
            "extractionTimeMs" to extractionTimeMs
        )
    }
}