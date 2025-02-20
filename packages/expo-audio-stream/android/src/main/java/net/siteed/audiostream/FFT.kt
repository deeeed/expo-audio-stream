package net.siteed.audiostream

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

class FFT(private val n: Int) {
    private val cosTable = FloatArray(n / 2)
    private val sinTable = FloatArray(n / 2)

    init {
        for (i in 0 until n / 2) {
            cosTable[i] = cos(2.0 * PI * i / n).toFloat()
            sinTable[i] = sin(2.0 * PI * i / n).toFloat()
        }
    }

    fun processSegment(segment: FloatArray): FloatArray {
        // Pad or truncate input to match FFT length
        val paddedSegment = if (segment.size < n) {
            segment + FloatArray(n - segment.size)
        } else {
            segment.copyOf(n)
        }

        // Apply Hann window
        applyHannWindow(paddedSegment)

        // Perform FFT
        realForward(paddedSegment)

        return paddedSegment
    }

    private fun applyHannWindow(data: FloatArray) {
        for (i in data.indices) {
            data[i] *= 0.5f * (1 - cos(2.0 * PI * i / (data.size - 1)))
        }
    }

    fun realForward(data: FloatArray) {
        realForwardRecursive(data)
    }

    private fun realForwardRecursive(data: FloatArray) {
        val n = data.size
        if (n <= 1) return

        val even = FloatArray(n / 2)
        val odd = FloatArray(n / 2)

        for (i in 0 until n / 2) {
            even[i] = data[2 * i]
            odd[i] = data[2 * i + 1]
        }

        realForwardRecursive(even)
        realForwardRecursive(odd)

        for (i in 0 until n / 2) {
            val t = cosTable[i] * odd[i] - sinTable[i] * even[i]
            val u = sinTable[i] * odd[i] + cosTable[i] * even[i]
            data[i] = even[i] + t
            data[i + n / 2] = even[i] - t
        }
    }
}
