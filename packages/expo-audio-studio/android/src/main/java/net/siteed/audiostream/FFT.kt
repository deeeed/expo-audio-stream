// packages/expo-audio-stream/android/src/main/java/net/siteed/audiostream/FFT.kt
package net.siteed.audiostream

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class FFT(private val n: Int) {
    private val cosTable = FloatArray(n / 2)
    private val sinTable = FloatArray(n / 2)
    private val hannWindow = FloatArray(n)

    init {
        // Precompute trig tables
        for (i in 0 until n / 2) {
            cosTable[i] = cos(2.0 * PI * i / n).toFloat()
            sinTable[i] = sin(2.0 * PI * i / n).toFloat()
        }
        
        // Precompute normalized Hann window to match vDSP
        val normalizationFactor = sqrt(2.0f / n)  // Match vDSP normalization
        for (i in hannWindow.indices) {
            hannWindow[i] = normalizationFactor * 0.5f * (1 - cos(2.0 * PI * i / (n - 1))).toFloat()
        }
    }

    fun processSegment(segment: FloatArray): FloatArray {
        // Pad or truncate input to match FFT length
        val paddedSegment = if (segment.size < n) {
            segment + FloatArray(n - segment.size)
        } else {
            segment.copyOf(n)
        }

        // Apply normalized Hann window
        for (i in paddedSegment.indices) {
            paddedSegment[i] *= hannWindow[i]
        }

        // Perform FFT
        realForward(paddedSegment)

        return paddedSegment
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

    fun realInverse(powerSpectrum: FloatArray, output: FloatArray) {
        // Copy power spectrum to complex format for inverse FFT
        val complexData = FloatArray(n * 2)
        for (i in 0 until n/2 + 1) {
            complexData[2 * i] = powerSpectrum[i]
            if (2 * i + 1 < complexData.size) {
                complexData[2 * i + 1] = 0f
            }
        }

        // Conjugate for inverse FFT
        for (i in 0 until n) {
            if (2 * i + 1 < complexData.size) {
                complexData[2 * i + 1] = -complexData[2 * i + 1]
            }
        }

        // Perform forward FFT (which is inverse when input is conjugated)
        realForward(complexData)

        // Copy real part to output and conjugate again
        for (i in 0 until n) {
            output[i] = complexData[2 * i] / n
        }
    }
}
