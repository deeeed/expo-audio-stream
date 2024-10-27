package net.siteed.audiostream

/**
 * Configuration for the notification waveform visualization
 * @property color The color of the waveform (e.g., "#FFFFFF" for white)
 * @property opacity Opacity of the waveform (0.0-1.0)
 * @property strokeWidth Width of the waveform line (default: 1.5f)
 * @property style Drawing style: "stroke" for outline, "fill" for solid
 * @property mirror Whether to mirror the waveform (symmetrical display)
 * @property height Height of the waveform view in dp (default: 64)
 */
data class WaveformConfig(
    val color: String = "#FFFFFF",
    val opacity: Float = 1.0f,
    val strokeWidth: Float = 1.5f,
    val style: String = "stroke", // "stroke" or "fill"
    val mirror: Boolean = true,
    val height: Int = 64
)