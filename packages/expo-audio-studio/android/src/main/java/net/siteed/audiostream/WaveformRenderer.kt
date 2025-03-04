// WaveformRenderer.kt
package net.siteed.audiostream

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import kotlin.math.abs

class WaveformRenderer {
    private enum class Style {
        STROKE,
        FILL
    }

    private data class RenderConfig(
        val color: Int = Color.WHITE,
        val opacity: Float = 1.0f,
        val strokeWidth: Float = 1.5f,
        val style: Style = Style.STROKE,
        val mirror: Boolean = true,
        val height: Int = 64
    ) {
        companion object {
            fun fromConfig(config: WaveformConfig?): RenderConfig {
                if (config == null) return RenderConfig()

                return RenderConfig(
                    color = try {
                        Color.parseColor(config.color)
                    } catch (e: Exception) {
                        Color.WHITE
                    },
                    opacity = config.opacity.coerceIn(0f, 1f),
                    strokeWidth = config.strokeWidth.coerceAtLeast(0.5f),
                    style = when (config.style.lowercase()) {
                        "fill" -> Style.FILL
                        else -> Style.STROKE
                    },
                    mirror = config.mirror,
                    height = config.height.coerceIn(32, 128)
                )
            }
        }
    }

    fun generateWaveform(audioData: FloatArray, config: WaveformConfig?): Bitmap {
        return generateWaveform(audioData, RenderConfig.fromConfig(config))
    }

    fun e(audioData: FloatArray): Bitmap {
        return generateWaveform(audioData, RenderConfig())
    }

    private fun generateWaveform(audioData: FloatArray, config: RenderConfig): Bitmap {
        val width = 400 // Fixed width for notification
        val height = config.height
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val paint = Paint().apply {
            color = config.color
            alpha = (config.opacity * 255).toInt()
            strokeWidth = config.strokeWidth
            isAntiAlias = true
            style = when (config.style) {
                Style.FILL -> Paint.Style.FILL
                Style.STROKE -> Paint.Style.STROKE
            }
            strokeCap = Paint.Cap.ROUND
        }

        canvas.drawColor(Color.TRANSPARENT)

        val centerY = height / 2f
        val pointsPerSegment = (audioData.size / width.toFloat()).coerceAtLeast(1f)
        val path = Path()

        // Calculate max amplitude for scaling
        val maxAmplitude = audioData.maxOf { abs(it) }.coerceAtLeast(0.01f)
        val scaleFactor = (height * 0.4f) / maxAmplitude

        drawWaveform(path, audioData, width, centerY, pointsPerSegment, scaleFactor)

        if (config.mirror) {
            drawMirroredWaveform(path, audioData, width, centerY, pointsPerSegment, scaleFactor)
        }

        // Add shadow for filled style
        if (config.style == Style.FILL) {
            paint.setShadowLayer(4f, 0f, 2f, Color.argb(50, 0, 0, 0))
        }

        canvas.drawPath(path, paint)
        return bitmap
    }

    private fun drawWaveform(
        path: Path,
        audioData: FloatArray,
        width: Int,
        centerY: Float,
        pointsPerSegment: Float,
        scaleFactor: Float
    ) {
        var firstPoint = true
        for (i in 0 until width) {
            val startIdx = (i * pointsPerSegment).toInt()
            val endIdx = ((i + 1) * pointsPerSegment).toInt().coerceAtMost(audioData.size)

            val avgAmplitude = calculateAverageAmplitude(audioData, startIdx, endIdx, scaleFactor)

            val x = i.toFloat()
            val y = centerY - avgAmplitude

            if (firstPoint) {
                path.moveTo(x, y)
                firstPoint = false
            } else {
                path.lineTo(x, y)
            }
        }
    }

    private fun drawMirroredWaveform(
        path: Path,
        audioData: FloatArray,
        width: Int,
        centerY: Float,
        pointsPerSegment: Float,
        scaleFactor: Float
    ) {
        for (i in width - 1 downTo 0) {
            val startIdx = (i * pointsPerSegment).toInt()
            val endIdx = ((i + 1) * pointsPerSegment).toInt().coerceAtMost(audioData.size)

            val avgAmplitude = calculateAverageAmplitude(audioData, startIdx, endIdx, scaleFactor)
            path.lineTo(i.toFloat(), centerY + avgAmplitude)
        }
        path.close()
    }

    private fun calculateAverageAmplitude(
        audioData: FloatArray,
        startIdx: Int,
        endIdx: Int,
        scaleFactor: Float
    ): Float {
        return if (endIdx > startIdx) {
            audioData.slice(startIdx until endIdx)
                .map { abs(it) }
                .average()
                .toFloat() * scaleFactor
        } else {
            0f
        }
    }
}