// net/siteed/audiostream/AudioProcessor.kt
package net.siteed.audiostream

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*
import android.util.Log
import java.io.File
import java.io.IOException
import kotlin.system.measureTimeMillis

class AudioProcessor(private val filesDir: File) {
    companion object {
        const val NUM_MFCC_COEFFICIENTS = 13
        const val NUM_MEL_FILTERS = 26
        const val MEL_MIN_FREQ = 0.0
        const val MEL_MAX_FREQ_DIVISOR = 2595.0
        const val MEL_MAX_FREQ_CONSTANT = 700.0
        const val DCT_SQRT_DIVISOR = 2.0
        const val LOG_BASE = 10.0
    }

    data class AudioData(val data: ByteArray, val sampleRate: Int, val bitDepth: Int, val channels: Int)

    // Add a counter for unique IDs
    private var uniqueIdCounter = 0L

    fun loadAudioFile(originalFileUri: String, skipWavHeader: Boolean = false): AudioData? {
        // Remove the file:// prefix if present
        val fileUri = originalFileUri.removePrefix("file://")
        var file = File(fileUri)

        // Check if the file exists at the provided fileUri
        if (!file.exists()) {
            // Fallback to filesDir if the file does not exist at fileUri
            file = File(filesDir, file.name)
            if (!file.exists()) {
                Log.e("AudioProcessor", "File does not exist at provided path or in filesDir: $fileUri")
                return null
            }
        }

        // Check if the file has a valid extension
        val validExtensions = listOf("wav", "pcm")
        val fileExtension = file.extension.lowercase()
        if (fileExtension !in validExtensions) {
            Log.e("AudioProcessor", "Invalid file extension: $fileExtension. Supported extensions are: $validExtensions")
            return null
        }

        try {
            val fileData = file.readBytes()

            if (fileData.size < Constants.WAV_HEADER_SIZE) {
                Log.e("AudioProcessor", "File is too small to be a valid WAV file")
                return null
            }

            // Read the WAV header
            val riffHeader = String(fileData.sliceArray(0..3))
            if (riffHeader != "RIFF") {
                Log.e("AudioProcessor", "Invalid RIFF header")
                return null
            }

            val format = String(fileData.sliceArray(8..11))
            if (format != "WAVE") {
                Log.e("AudioProcessor", "Invalid WAVE format")
                return null
            }

            var offset = 12
            var dataSize = 0
            var sampleRate = 0
            var channels = 0
            var bitDepth = 0

            // Parse chunks until we find the 'data' chunk
            while (offset < fileData.size - 8) {
                val chunkId = String(fileData.sliceArray(offset until offset + 4))
                val chunkSize = ByteBuffer.wrap(fileData.sliceArray(offset + 4 until offset + 8)).order(ByteOrder.LITTLE_ENDIAN).int

                when (chunkId) {
                    "fmt " -> {
                        channels = ByteBuffer.wrap(fileData.sliceArray(offset + 10 until offset + 12)).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                        sampleRate = ByteBuffer.wrap(fileData.sliceArray(offset + 12 until offset + 16)).order(ByteOrder.LITTLE_ENDIAN).int
                        bitDepth = ByteBuffer.wrap(fileData.sliceArray(offset + 22 until offset + 24)).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
                    }
                    "data" -> {
                        dataSize = chunkSize
                        offset += 8 // Skip chunk ID and size
                        break
                    }
                }

                offset += chunkSize + 8 // Move to the next chunk
            }

            if (dataSize == 0) {
                Log.e("AudioProcessor", "No data chunk found in WAV file")
                return null
            }

            val audioData = if (skipWavHeader) {
                fileData.sliceArray(offset until offset + dataSize)
            } else {
                fileData
            }

            return AudioData(audioData, sampleRate, bitDepth.toInt(), channels.toInt())
        } catch (e: IOException) {
            Log.e("AudioProcessor", "Failed to load audio file: ${e.message}", e)
            return null
        } catch (e: IllegalArgumentException) {
            Log.e("AudioProcessor", "Invalid audio file format: ${e.message}", e)
            return null
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Unexpected error: ${e.message}", e)
            return null
        }
    }

    private fun byteArrayToInt(bytes: ByteArray): Int {
        return (bytes[0].toInt() and 0xFF) or
                ((bytes[1].toInt() and 0xFF) shl 8) or
                ((bytes[2].toInt() and 0xFF) shl 16) or
                ((bytes[3].toInt() and 0xFF) shl 24)
    }

    private fun byteArrayToShort(bytes: ByteArray): Short {
        return (bytes[0].toInt() and 0xFF or
                (bytes[1].toInt() and 0xFF shl 8)).toShort()
    }

    /**
     * Processes the audio data and extracts features.
     * @param data The audio data in bytes.
     * @param config The recording configuration.
     * @return AudioAnalysisData containing the extracted features.
     */
    fun processAudioData(data: ByteArray, config: RecordingConfig): AudioAnalysisData {
        val sampleRate = config.sampleRate.toFloat()
        val bitDepth = when (config.encoding) {
            "pcm_8bit" -> 8
            "pcm_16bit" -> 16
            "pcm_32bit" -> 32
            else -> throw IllegalArgumentException("Unsupported encoding: ${config.encoding}")
        }
        val channelData = convertToFloatArray(data, bitDepth)
        val pointsPerSecond = config.pointsPerSecond
        val algorithm = config.algorithm
        val featureOptions = config.features

        val totalSamples = channelData.size
        val segmentDurationSeconds = totalSamples.toDouble() / sampleRate
        val totalPoints = max((segmentDurationSeconds * pointsPerSecond).toInt(), 1)
        val pointInterval = ceil(totalSamples / totalPoints.toDouble()).toInt()

        Log.d("AudioProcessor", "Extracting waveform totalSize=${data.size} with $totalSamples samples and $pointsPerSecond points per second --> $pointInterval samples per point")
        Log.d("AudioProcessor", "segmentDuration: $segmentDurationSeconds seconds")

        val expectedPoints = segmentDurationSeconds * pointsPerSecond
        val samplesPerPoint = ceil(channelData.size / expectedPoints).toInt()
        Log.d("AudioProcessor", "Extracting waveform with expectedPoints=$expectedPoints , samplesPerPoints=$samplesPerPoint")

        val dataPoints = mutableListOf<DataPoint>()
        var minAmplitude = Float.MAX_VALUE
        var maxAmplitude = Float.MIN_VALUE
        val durationMs = (segmentDurationSeconds * 1000).toInt()

        // Measure the time taken for audio processing
        // Measure the time taken for audio processing
        val extractionTimeMs = measureTimeMillis {
            var currentPosition = 0 // Track the current byte position

            for (i in 0 until totalPoints) {
                val start = i * samplesPerPoint
                val end = min(start + samplesPerPoint, totalSamples)
                val segmentData = channelData.sliceArray(start until end)

                var sumSquares = 0f
                var zeroCrossings = 0
                var prevValue = 0f
                var localMinAmplitude = Float.MAX_VALUE
                var localMaxAmplitude = Float.MIN_VALUE

                for (value in segmentData) {
                    sumSquares += value * value
                    if (prevValue != 0f && value * prevValue < 0) zeroCrossings += 1
                    prevValue = value

                    val absValue = abs(value)
                    localMinAmplitude = min(localMinAmplitude, absValue)
                    localMaxAmplitude = max(localMaxAmplitude, absValue)
                }

                val features = computeFeatures(segmentData, sampleRate, minAmplitude, maxAmplitude, sumSquares, zeroCrossings, segmentData.size, featureOptions)
                val rms = features.rms
                val silent = rms < 0.01
                val dB = if (featureOptions["dB"] == true) 20 * log10(rms.toDouble()).toFloat() else 0f
                minAmplitude = min(minAmplitude, localMinAmplitude)
                maxAmplitude = max(maxAmplitude, localMaxAmplitude)

                val bytesPerSample = bitDepth / 8
                val startPosition = start * bytesPerSample * config.channels
                val endPosition = end * bytesPerSample * config.channels

                val dataPoint = DataPoint(
                    id = uniqueIdCounter++, // Assign unique ID and increment the counter
                    amplitude = if (algorithm == "peak") localMaxAmplitude else rms,
                    activeSpeech = null,
                    dB = dB,
                    silent = silent,
                    features = features,
                    samples = segmentData.size,
                    startTime = startPosition / (sampleRate * bytesPerSample * config.channels),
                    endTime = endPosition / (sampleRate * bytesPerSample * config.channels),
                    startPosition = startPosition,
                    endPosition = endPosition,
                    speaker = 0
                )

                dataPoints.add(dataPoint)
            }
        }

        return AudioAnalysisData(
            pointsPerSecond = pointsPerSecond,
            durationMs = durationMs,
            bitDepth = bitDepth,
            numberOfChannels = config.channels,
            sampleRate = config.sampleRate,
            samples = totalSamples,
            dataPoints = dataPoints,
            amplitudeRange = AudioAnalysisData.AmplitudeRange(minAmplitude, maxAmplitude),
            speakerChanges = emptyList(),
            extractionTimeMs = extractionTimeMs.toFloat() // Return the measured extraction time
        )
    }



    /**
     * Converts the audio data to a float array.
     * @param data The audio data in bytes.
     * @param bitDepth The bit depth of the audio data.
     * @return The converted float array.
     */
    private fun convertToFloatArray(data: ByteArray, bitDepth: Int): FloatArray {
        return when (bitDepth) {
            16 -> {
                val buffer = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                val array = ShortArray(buffer.remaining())
                buffer.get(array)
                array.map { it / 32768.0f }.toFloatArray()
            }
            8 -> data.map { (it.toInt() - 128) / 128.0f }.toFloatArray()
            32 -> {
                val buffer = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN).asIntBuffer()
                val array = IntArray(buffer.remaining())
                buffer.get(array)
                array.map { it / Int.MAX_VALUE.toFloat() }.toFloatArray()
            }
            else -> throw IllegalArgumentException("Unsupported bit depth: $bitDepth")
        }
    }



    /**
     * Computes the features of the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @param minAmplitude The minimum amplitude.
     * @param maxAmplitude The maximum amplitude.
     * @param sumSquares The sum of squares.
     * @param zeroCrossings The zero crossings.
     * @param segmentLength The length of the segment.
     * @param featureOptions The feature options to compute.
     * @return The computed features.
     */
    private fun computeFeatures(
        segmentData: FloatArray,
        sampleRate: Float,
        minAmplitude: Float,
        maxAmplitude: Float,
        sumSquares: Float,
        zeroCrossings: Int,
        segmentLength: Int,
        featureOptions: Map<String, Boolean>
    ): Features {
        val rms = sqrt(sumSquares / segmentLength)
        val energy = if (featureOptions["energy"] == true) sumSquares else 0f
        val zcr = if (featureOptions["zcr"] == true) zeroCrossings / segmentLength.toFloat() else 0f

        val mfcc = try {
            if (featureOptions["mfcc"] == true) extractMFCC(segmentData, sampleRate) else emptyList()
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract MFCC: ${e.message}", e)
            emptyList()
        }

        val spectralCentroid = try {
            if (featureOptions["spectralCentroid"] == true) extractSpectralCentroid(segmentData, sampleRate) else 0f
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract spectral centroid: ${e.message}", e)
            0f
        }

        val spectralFlatness = try {
            if (featureOptions["spectralFlatness"] == true) extractSpectralFlatness(segmentData) else 0f
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract spectral flatness: ${e.message}", e)
            0f
        }

        val spectralRollOff = try {
            if (featureOptions["spectralRollOff"] == true) extractSpectralRollOff(segmentData, sampleRate) else 0f
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract spectral roll-off: ${e.message}", e)
            0f
        }

        val spectralBandwidth = try {
            if (featureOptions["spectralBandwidth"] == true) extractSpectralBandwidth(segmentData, sampleRate) else 0f
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract spectral bandwidth: ${e.message}", e)
            0f
        }

        val chromagram = try {
            if (featureOptions["chromagram"] == true) extractChromagram(segmentData, sampleRate) else emptyList()
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract chromagram: ${e.message}", e)
            emptyList()
        }

        val tempo = try {
            if (featureOptions["tempo"] == true) extractTempo(segmentData, sampleRate) else 0f
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract tempo: ${e.message}", e)
            0f
        }

        val hnr = try {
            if (featureOptions["hnr"] == true) extractHNR(segmentData) else 0f
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to extract HNR: ${e.message}", e)
            0f
        }

        return Features(
            energy = energy,
            mfcc = mfcc,
            rms = rms,
            zcr = zcr,
            minAmplitude = minAmplitude,
            maxAmplitude = maxAmplitude,
            spectralCentroid = spectralCentroid,
            spectralFlatness = spectralFlatness,
            spectralRollOff = spectralRollOff,
            spectralBandwidth = spectralBandwidth,
            chromagram = chromagram,
            tempo = tempo,
            hnr = hnr
        )
    }

    /**
     * Resets the segment data.
     * @param sumSquaresUpdater Function to reset sum of squares.
     * @param zeroCrossingsUpdater Function to reset zero crossings.
     * @param localMinAmplitudeUpdater Function to reset local min amplitude.
     * @param localMaxAmplitudeUpdater Function to reset local max amplitude.
     * @param segmentData The segment data list to reset.
     */
    private fun resetSegmentData(
        sumSquaresUpdater: (Float) -> Unit,
        zeroCrossingsUpdater: (Int) -> Unit,
        localMinAmplitudeUpdater: (Float) -> Unit,
        localMaxAmplitudeUpdater: (Float) -> Unit,
        segmentData: MutableList<Float>
    ) {
        sumSquaresUpdater(0f)
        zeroCrossingsUpdater(0)
        localMinAmplitudeUpdater(Float.MAX_VALUE)
        localMaxAmplitudeUpdater(Float.MIN_VALUE)
        segmentData.clear()
    }

    /**
     * Extracts the MFCC (Mel-Frequency Cepstral Coefficients) from the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The MFCC coefficients.
     */
    private fun extractMFCC(segmentData: FloatArray, sampleRate: Float): List<Float> {
        if (segmentData.size < 2) {
            Log.e("AudioProcessor", "Segment data is too small for MFCC extraction: size=${segmentData.size}")
            return emptyList()
        }

        val fftData = segmentData.copyOf()
        val fft = FFT(fftData.size)
        fft.realForward(fftData)

        // Compute the power spectrum
        val powerSpectrum = try {
            fftData.map { it * it }.chunked(2) { (re, im) -> sqrt(re + im) }
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Error computing power spectrum: ${e.message}", e)
            return emptyList()
        }

        // Compute Mel filter bank
        val melFilterBank = computeMelFilterBank(NUM_MEL_FILTERS, powerSpectrum.size, sampleRate)
        val filterEnergies = melFilterBank.map { filter ->
            filter.zip(powerSpectrum).sumOf { (f, p) -> (f * p).toDouble() }.toFloat()
        }

        // Apply log to filter energies
        val logEnergies = filterEnergies.map { ln(it + Float.MIN_VALUE) }

        // Compute Discrete Cosine Transform (DCT) of log energies to get MFCCs
        return try {
            computeDCT(logEnergies, NUM_MFCC_COEFFICIENTS)
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Error computing DCT: ${e.message}", e)
            emptyList()
        }
    }



    /**
     * Computes the Mel filter bank.
     * @param numFilters The number of Mel filters.
     * @param powerSpectrumSize The size of the power spectrum.
     * @param sampleRate The sample rate of the audio data.
     * @return A list of Mel filters.
     */
    private fun computeMelFilterBank(numFilters: Int, powerSpectrumSize: Int, sampleRate: Float): List<List<Float>> {
        val melFilters = mutableListOf<List<Float>>()
        val melMaxFreq = MEL_MAX_FREQ_DIVISOR * log10(1.0 + sampleRate / 2.0 / MEL_MAX_FREQ_CONSTANT)
        val melPoints = DoubleArray(numFilters + 2) { i ->
            MEL_MIN_FREQ + i * (melMaxFreq - MEL_MIN_FREQ) / (numFilters + 1)
        }

        val hzPoints = melPoints.map { MEL_MAX_FREQ_CONSTANT * (LOG_BASE.pow(it / MEL_MAX_FREQ_DIVISOR) - 1.0) }
        val bin = hzPoints.map { it * (powerSpectrumSize - 1) / sampleRate }

        for (i in 1..numFilters) {
            val filter = FloatArray(powerSpectrumSize)
            for (j in bin[i - 1].toInt() until bin[i].toInt()) {
                if (j >= 0 && j < filter.size) {
                    filter[j] = ((j - bin[i - 1]) / (bin[i] - bin[i - 1])).toFloat()
                }
            }
            for (j in bin[i].toInt() until bin[i + 1].toInt()) {
                if (j >= 0 && j < filter.size) {
                    filter[j] = ((bin[i + 1] - j) / (bin[i + 1] - bin[i])).toFloat()
                }
            }
            melFilters.add(filter.toList())
        }

        return melFilters
    }


    /**
     * Computes the Discrete Cosine Transform (DCT) of the log energies.
     * @param logEnergies The log energies.
     * @param numCoefficients The number of coefficients to compute.
     * @return A list of MFCC coefficients.
     */
    private fun computeDCT(logEnergies: List<Float>, numCoefficients: Int): List<Float> {
        val n = logEnergies.size
        val dct = FloatArray(numCoefficients)

        for (i in 0 until numCoefficients) {
            var sum = 0.0
            for (j in logEnergies.indices) {
                sum += logEnergies[j] * cos(PI * i * (j + 0.5) / n)
            }
            dct[i] = (sum / sqrt(DCT_SQRT_DIVISOR * n)).toFloat()
        }

        return dct.toList()
    }


    /**
     * Extracts the spectral centroid from the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The spectral centroid.
     */
    private fun extractSpectralCentroid(segmentData: FloatArray, sampleRate: Float): Float {
        val magnitudeSpectrum = segmentData.map { it * it }.toFloatArray()
        val sum = magnitudeSpectrum.sum()
        if (sum == 0f) return 0f

        val weightedSum = magnitudeSpectrum.mapIndexed { index, value -> index * value }.sum()
        return (weightedSum / sum) * (sampleRate / 2) / magnitudeSpectrum.size
    }


    /**
     * Extracts the spectral flatness from the audio data.
     * @param segmentData The segment data.
     * @return The spectral flatness.
     */
    private fun extractSpectralFlatness(segmentData: FloatArray): Float {
        val magnitudeSpectrum = segmentData.map { abs(it) }
        val geometricMean = exp(magnitudeSpectrum.map { ln(it + Float.MIN_VALUE) }.average()).toFloat()
        val arithmeticMean = magnitudeSpectrum.average().toFloat()
        return if (arithmeticMean != 0f) geometricMean / arithmeticMean else 0f
    }

    /**
     * Extracts the spectral roll-off from the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The spectral roll-off.
     */
    private fun extractSpectralRollOff(segmentData: FloatArray, sampleRate: Float): Float {
        val magnitudeSpectrum = segmentData.map { abs(it) }
        val totalEnergy = magnitudeSpectrum.sum()
        var cumulativeEnergy = 0f
        val rollOffThreshold = totalEnergy * 0.85f

        for ((index, value) in magnitudeSpectrum.withIndex()) {
            cumulativeEnergy += value
            if (cumulativeEnergy >= rollOffThreshold) {
                return index.toFloat() / magnitudeSpectrum.size * (sampleRate / 2)
            }
        }

        return 0f
    }

    /**
     * Extracts the spectral bandwidth from the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The spectral bandwidth.
     */
    private fun extractSpectralBandwidth(segmentData: FloatArray, sampleRate: Float): Float {
        val centroid = extractSpectralCentroid(segmentData, sampleRate)
        val magnitudeSpectrum = segmentData.map { abs(it) }
        val sum = magnitudeSpectrum.sum()
        if (sum == 0f) return 0f

        val weightedSum = magnitudeSpectrum.mapIndexed { index, value -> value * (index - centroid).pow(2) }.sum()
        return sqrt(weightedSum / sum)
    }

    /**
     * Extracts the chromagram from the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The chromagram.
     */
    private fun extractChromagram(segmentData: FloatArray, sampleRate: Float): List<Float> {
        val fftData = segmentData.copyOf()
        val fft = FFT(fftData.size)
        fft.realForward(fftData)

        // Compute the magnitude spectrum
        val magnitudeSpectrum = fftData.map { abs(it) }

        // Initialize the chromagram with 12 bins (one for each pitch class)
        val chromagram = FloatArray(12)

        // Map frequencies to pitch classes
        for (i in magnitudeSpectrum.indices) {
            val freq = i * sampleRate / magnitudeSpectrum.size
            val pitchClass = (12 * log2(freq / 440.0) % 12).toInt()
            if (pitchClass in 0..11) {
                chromagram[pitchClass] += magnitudeSpectrum[i]
            }
        }

        return chromagram.toList()
    }

    /**
     * Extracts the tempo from the audio data.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The tempo.
     */
    private fun extractTempo(segmentData: FloatArray, sampleRate: Float): Float {
        // Calculate the onset strength envelope
        val onsetEnv = calculateOnsetEnvelope(segmentData, sampleRate)

        // Find peaks in the onset envelope
        val peaks = findPeaks(onsetEnv)

        // Calculate the inter-onset intervals (IOIs)
        val iois = peaks.zipWithNext { a, b -> (b - a).toFloat() / sampleRate }

        // Calculate the tempo in beats per minute (BPM)
        val avgIoi = iois.average().toFloat()
        return if (avgIoi != 0f) 60f / avgIoi else 0f
    }

    /**
     * Calculates the onset envelope of the audio signal.
     * @param segmentData The segment data.
     * @param sampleRate The sample rate of the audio data.
     * @return The onset envelope.
     */
    private fun calculateOnsetEnvelope(segmentData: FloatArray, sampleRate: Float): FloatArray {
        val frameSize = sampleRate.toInt() / 100 // Assume 10ms frames
        val onsetEnv = FloatArray(segmentData.size / frameSize)
        var previousSpectrum = FloatArray(frameSize)

        for (i in onsetEnv.indices) {
            val frame = segmentData.sliceArray(i * frameSize until min((i + 1) * frameSize, segmentData.size))
            val magnitudeSpectrum = frame.map { abs(it) }.toFloatArray()
            val onset = magnitudeSpectrum.zip(previousSpectrum) { a, b -> max(0f, a - b) }.sum()
            onsetEnv[i] = onset
            previousSpectrum = magnitudeSpectrum
        }

        return onsetEnv
    }

    /**
     * Finds the peaks in the onset envelope.
     * @param onsetEnv The onset envelope.
     * @return A list of peak indices.
     */
    private fun findPeaks(onsetEnv: FloatArray): List<Int> {
        val peaks = mutableListOf<Int>()
        for (i in 1 until onsetEnv.size - 1) {
            if (onsetEnv[i] > onsetEnv[i - 1] && onsetEnv[i] > onsetEnv[i + 1]) {
                peaks.add(i)
            }
        }
        return peaks
    }

    /**
     * Extracts the HNR (Harmonics-to-Noise Ratio) from the audio data.
     * @param segmentData The segment data.
     * @return The HNR.
     */
    /**
     * Extracts the HNR (Harmonics-to-Noise Ratio) from the audio data.
     * @param segmentData The segment data as FloatArray.
     * @return The HNR.
     */
    private fun extractHNR(segmentData: FloatArray): Float {
        val frameSize = segmentData.size
        val autocorrelation = FloatArray(frameSize)

        // Compute the autocorrelation of the segment data
        for (i in segmentData.indices) {
            var sum = 0f
            for (j in 0 until frameSize - i) {
                sum += segmentData[j] * segmentData[j + i]
            }
            autocorrelation[i] = sum
        }

        // Find the maximum autocorrelation value (excluding the zero lag)
        val maxAutocorrelation = autocorrelation.drop(1).maxOrNull() ?: 0f

        // Compute the HNR
        return if (autocorrelation[0] != 0f) 10 * log10(maxAutocorrelation / (autocorrelation[0] - maxAutocorrelation)) else 0f
    }
}
