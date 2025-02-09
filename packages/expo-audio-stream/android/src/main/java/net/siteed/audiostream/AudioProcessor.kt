// net/siteed/audiostream/AudioProcessor.kt
package net.siteed.audiostream

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*
import android.util.Log
import java.io.File
import java.io.IOException
import java.util.concurrent.atomic.AtomicLong
import kotlin.system.measureTimeMillis
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaCodec
import java.io.FileInputStream
import java.nio.channels.FileChannel
import java.io.RandomAccessFile

data class DecodingConfig(
    val targetSampleRate: Int? = null,     // Optional target sample rate
    val targetChannels: Int? = null,       // Optional target number of channels
    val targetBitDepth: Int = 16,          // Default to 16-bit PCM
    val normalizeAudio: Boolean = false    // Whether to normalize audio levels
)

class AudioProcessor(private val filesDir: File) {
    companion object {
        const val NUM_MFCC_COEFFICIENTS = 13
        const val NUM_MEL_FILTERS = 26
        const val MEL_MIN_FREQ = 0.0
        const val MEL_MAX_FREQ_DIVISOR = 2595.0
        const val MEL_MAX_FREQ_CONSTANT = 700.0
        const val DCT_SQRT_DIVISOR = 2.0
        const val LOG_BASE = 10.0

        private val uniqueIdCounter = AtomicLong(0L) // Keep as companion object property to maintain during pause/resume cycles

        fun resetUniqueIdCounter() {
            uniqueIdCounter.set(0L)
        }
    }

    data class AudioData(val data: ByteArray, val sampleRate: Int, val bitDepth: Int, val channels: Int, val durationMs: Long = 0)

    private var cumulativeMinAmplitude = Float.MAX_VALUE
    private var cumulativeMaxAmplitude = Float.NEGATIVE_INFINITY

    fun loadAudioFile(filePath: String, debug: Boolean = false): AudioData? {
        try {
            val fileUri = filePath.removePrefix("file://")
            Log.d("AudioProcessor", "Processing WAV file: $fileUri")

            val file = File(fileUri).takeIf { it.exists() } ?: File(filesDir, File(fileUri).name).takeIf { it.exists() }
                ?: run {
                    Log.e("AudioProcessor", "File not found: $fileUri")
                    return null
                }

            val raf = RandomAccessFile(file, "r")
            val fileSize = raf.length()
            
            // Read RIFF header
            val riffHeader = ByteArray(4).apply { raf.readFully(this) }
            if (String(riffHeader) != "RIFF") {
                Log.e("AudioProcessor", "Invalid RIFF header")
                return null
            }

            // Read file size (4 bytes little-endian)
            val fileSizeBytes = ByteArray(4).apply { raf.readFully(this) }
            val expectedFileSize = ByteBuffer.wrap(fileSizeBytes).order(ByteOrder.LITTLE_ENDIAN).int + 8L

            // Read WAVE header
            val waveHeader = ByteArray(4).apply { raf.readFully(this) }
            if (String(waveHeader) != "WAVE") {
                Log.e("AudioProcessor", "Invalid WAVE header")
                return null
            }

            var fmtChunkFound = false
            var dataChunkFound = false
            var sampleRate = 0
            var channels = 0
            var bitDepth = 0
            var dataOffset = 0L
            var dataSize = 0L

            // Parse chunks
            while (raf.filePointer < fileSize - 8) {
                val chunkId = ByteArray(4).apply { raf.readFully(this) }.toString(Charsets.UTF_8)
                val chunkSizeBytes = ByteArray(4).apply { raf.readFully(this) }
                val chunkSize = ByteBuffer.wrap(chunkSizeBytes).order(ByteOrder.LITTLE_ENDIAN).int.toLong() and 0xFFFFFFFFL

                Log.d("AudioProcessor", "Found chunk: $chunkId ($chunkSize bytes)")

                when (chunkId) {
                    "fmt " -> {
                        if (chunkSize < 16) {
                            Log.e("AudioProcessor", "Invalid fmt chunk size")
                            return null
                        }
                        
                        val formatData = ByteArray(16)
                        raf.readFully(formatData)
                        val formatBuffer = ByteBuffer.wrap(formatData).order(ByteOrder.LITTLE_ENDIAN)
                        
                        val audioFormat = formatBuffer.short // Skip audio format
                        channels = formatBuffer.short.toInt() and 0xFFFF
                        sampleRate = formatBuffer.int
                        val byteRate = formatBuffer.int
                        val blockAlign = formatBuffer.short
                        bitDepth = formatBuffer.short.toInt() and 0xFFFF
                        
                        Log.d("AudioProcessor", "Raw format data: ${formatData.joinToString(", ")}")
                        Log.d("AudioProcessor", "Format chunk: audioFormat=$audioFormat, channels=$channels, sampleRate=$sampleRate, bitDepth=$bitDepth, byteRate=$byteRate, blockAlign=$blockAlign")
                        
                        if (bitDepth !in listOf(8, 16, 32)) {
                            Log.e("AudioProcessor", "Invalid bit depth: $bitDepth")
                            return null
                        }
                        
                        val remainingFmtBytes = chunkSize - 16
                        if (remainingFmtBytes > 0) {
                            raf.skipBytes(remainingFmtBytes.toInt())
                        }
                        fmtChunkFound = true
                    }
                    "data" -> {
                        dataOffset = raf.filePointer
                        dataSize = chunkSize
                        dataChunkFound = true
                        break
                    }
                    else -> {
                        // Skip unknown chunks
                        val skipBytes = chunkSize
                        if (skipBytes > 0) {
                            val actualSkip = minOf(skipBytes, fileSize - raf.filePointer)
                            raf.seek(raf.filePointer + actualSkip)
                        }
                    }
                }
            }

            if (!fmtChunkFound || !dataChunkFound) {
                Log.e("AudioProcessor", "Missing essential chunks (fmt=$fmtChunkFound, data=$dataChunkFound)")
                return null
            }

            // Calculate actual data size if it seems wrong
            if (dataSize <= 0 || dataSize > fileSize - dataOffset) {
                dataSize = fileSize - dataOffset
                Log.d("AudioProcessor", "Adjusted data size to: $dataSize")
            }

            Log.d("AudioProcessor", "Reading PCM data: offset=$dataOffset, size=$dataSize")
            
            val wavData = ByteArray(dataSize.toInt())
            raf.seek(dataOffset)
            raf.readFully(wavData)

            // Calculate duration in ms
            // Each sample is bitsPerSample/8 bytes, and we have 'channels' samples per frame
            val bytesPerFrame = channels * (bitDepth / 8)
            val numFrames = wavData.size / bytesPerFrame
            val durationMs = (numFrames * 1000L) / sampleRate

            Log.d(Constants.TAG, "WAV duration calculation: size=${wavData.size}, bytesPerFrame=$bytesPerFrame, numFrames=$numFrames, sampleRate=$sampleRate, duration=${durationMs}ms")

            return AudioData(
                data = wavData,
                sampleRate = sampleRate,
                channels = channels,
                bitDepth = bitDepth,
                durationMs = durationMs
            )
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to load WAV file: ${e.message}")
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
        var maxAmplitude = Float.NEGATIVE_INFINITY
        val durationMs = (segmentDurationSeconds * 1000).toInt()

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

                // Update cumulative amplitude range
                cumulativeMinAmplitude = min(cumulativeMinAmplitude, localMinAmplitude)
                cumulativeMaxAmplitude = max(cumulativeMaxAmplitude, localMaxAmplitude)

                val dataPoint = DataPoint(
                    id = uniqueIdCounter.getAndIncrement(), // Assign unique ID and increment the counter
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
            amplitudeRange = AudioAnalysisData.AmplitudeRange(cumulativeMinAmplitude, cumulativeMaxAmplitude),
            speakerChanges = emptyList(),
            extractionTimeMs = extractionTimeMs.toFloat() // Return the measured extraction time
        )
    }

    fun resetCumulativeAmplitudeRange() {
        cumulativeMinAmplitude = Float.MAX_VALUE
        cumulativeMaxAmplitude = Float.MIN_VALUE
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

    fun loadAudioFromAnyFormat(fileUri: String, decodingConfig: DecodingConfig? = null): AudioData? {
        val cleanUri = fileUri.removePrefix("file://")
        val file = File(cleanUri).takeIf { it.exists() } ?: File(filesDir, File(cleanUri).name).takeIf { it.exists() }
            ?: run {
                Log.e("AudioProcessor", "File not found in any location: $cleanUri")
                return null
            }

        // First try MediaExtractor
        val extractor = MediaExtractor()
        try {
            Log.d("AudioProcessor", "Attempting MediaExtractor with path: ${file.absolutePath}")
            extractor.setDataSource(file.absolutePath)
            
            // Find the first audio track
            val audioTrackIndex = (0 until extractor.trackCount)
                .find { extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true }
            
            if (audioTrackIndex != null) {
                val format = extractor.getTrackFormat(audioTrackIndex)
                extractor.selectTrack(audioTrackIndex)

                // Get original audio properties
                val originalSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                val originalChannels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                val totalDurationUs = try {
                    format.getLong(MediaFormat.KEY_DURATION)
                } catch (e: Exception) {
                    (format.getString(MediaFormat.KEY_DURATION) ?: "-1").toLong()
                }
                Log.d("AudioProcessor", "Raw duration from format: ${totalDurationUs}us")
                
                val totalDurationMs = totalDurationUs / 1000
                Log.d("AudioProcessor", "Final duration: ${totalDurationMs}ms")

                // Process using MediaExtractor
                val pcmData = decodeAudioToPCM(extractor, format)
                val processedData = if (decodingConfig != null) {
                    processAudio(
                        pcmData,
                        originalSampleRate,
                        decodingConfig.targetSampleRate,
                        originalChannels,
                        decodingConfig.targetChannels,
                        decodingConfig.normalizeAudio
                    )
                } else {
                    pcmData
                }

                return AudioData(
                    data = processedData,
                    sampleRate = decodingConfig?.targetSampleRate ?: originalSampleRate,
                    bitDepth = decodingConfig?.targetBitDepth ?: 16,
                    channels = decodingConfig?.targetChannels ?: originalChannels,
                    durationMs = totalDurationMs  // Pass through the duration
                )
            }
        } catch (e: Exception) {
            Log.d("AudioProcessor", "MediaExtractor failed, attempting WAV parser: ${e.message}")
        } finally {
            extractor.release()
        }

        // If MediaExtractor failed and file is WAV, try WAV parser
        if (file.name.lowercase().endsWith(".wav")) {
            Log.d("AudioProcessor", "Falling back to WAV parser")
            return loadAudioFile(file.absolutePath, false)?.let { wavData ->
                if (decodingConfig != null) {
                    val processedData = processAudio(
                        wavData.data,
                        wavData.sampleRate,
                        decodingConfig.targetSampleRate,
                        wavData.channels,
                        decodingConfig.targetChannels,
                        decodingConfig.normalizeAudio
                    )
                    AudioData(
                        data = processedData,
                        sampleRate = decodingConfig.targetSampleRate ?: wavData.sampleRate,
                        bitDepth = decodingConfig.targetBitDepth,
                        channels = decodingConfig.targetChannels ?: wavData.channels,
                        durationMs = wavData.durationMs  // Pass through the duration
                    )
                } else {
                    wavData
                }
            }
        }

        Log.e("AudioProcessor", "Failed to process audio file with both MediaExtractor and WAV parser")
        return null
    }

    private fun decodeAudioToPCM(extractor: MediaExtractor, format: MediaFormat): ByteArray {
        val decoder = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
        decoder.configure(format, null, null, 0)
        decoder.start()

        val info = MediaCodec.BufferInfo()
        val pcmData = mutableListOf<Byte>()

        var isEOS = false
        while (!isEOS) {
            val inputBufferId = decoder.dequeueInputBuffer(10000)
            if (inputBufferId >= 0) {
                val inputBuffer = decoder.getInputBuffer(inputBufferId)!!
                val sampleSize = extractor.readSampleData(inputBuffer, 0)

                if (sampleSize < 0) {
                    decoder.queueInputBuffer(inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                    isEOS = true
                } else {
                    decoder.queueInputBuffer(inputBufferId, 0, sampleSize, extractor.sampleTime, 0)
                    extractor.advance()
                }
            }

            val outputBufferId = decoder.dequeueOutputBuffer(info, 10000)
            if (outputBufferId >= 0) {
                val outputBuffer = decoder.getOutputBuffer(outputBufferId)!!
                val chunk = ByteArray(info.size)
                outputBuffer.get(chunk)
                pcmData.addAll(chunk.toList())
                decoder.releaseOutputBuffer(outputBufferId, false)
            }
        }

        decoder.stop()
        decoder.release()

        return pcmData.toByteArray()
    }

    private fun resampleAudio(
        pcmData: ByteArray,
        originalSampleRate: Int,
        targetSampleRate: Int,
        originalChannels: Int
    ): ByteArray {
        // Convert byte array to short array (16-bit samples)
        val shortArray = ShortArray(pcmData.size / 2)
        ByteBuffer.wrap(pcmData).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shortArray)

        // Convert to mono if needed
        val monoShortArray = if (originalChannels > 1) {
            convertToMono(shortArray, originalChannels)
        } else {
            shortArray
        }

        // Resample
        val resampleRatio = targetSampleRate.toDouble() / originalSampleRate
        val newLength = (monoShortArray.size * resampleRatio).toInt()
        val resampledArray = ShortArray(newLength)

        for (i in resampledArray.indices) {
            val originalIndex = (i / resampleRatio).toInt()
            val nextIndex = minOf(originalIndex + 1, monoShortArray.size - 1)
            val fraction = (i / resampleRatio) - originalIndex

            // Linear interpolation
            val sample = linearInterpolate(
                monoShortArray[originalIndex].toDouble(),
                monoShortArray[nextIndex].toDouble(),
                fraction
            ).toInt().toShort()

            resampledArray[i] = sample
        }

        // Convert back to byte array
        val resultBuffer = ByteBuffer.allocate(resampledArray.size * 2)
        resultBuffer.order(ByteOrder.LITTLE_ENDIAN)
        resultBuffer.asShortBuffer().put(resampledArray)
        return resultBuffer.array()
    }

    private fun convertToMono(stereoData: ShortArray, channels: Int): ShortArray {
        val monoLength = stereoData.size / channels
        val monoData = ShortArray(monoLength)

        for (i in 0 until monoLength) {
            var sum = 0
            for (ch in 0 until channels) {
                sum += stereoData[i * channels + ch]
            }
            monoData[i] = (sum / channels).toShort()
        }

        return monoData
    }

    private fun linearInterpolate(a: Double, b: Double, fraction: Double): Double {
        return a + fraction * (b - a)
    }

    private fun processAudio(
        pcmData: ByteArray,
        originalSampleRate: Int,
        targetSampleRate: Int?,
        originalChannels: Int,
        targetChannels: Int?,
        normalize: Boolean
    ): ByteArray {
        var processedData = pcmData

        // Only resample if target sample rate is explicitly specified and different
        if (targetSampleRate != null && originalSampleRate != targetSampleRate) {
            processedData = resampleAudio(processedData, originalSampleRate, targetSampleRate, originalChannels)
        }

        // Only convert channels if target channels is explicitly specified and different
        if (targetChannels != null && originalChannels != targetChannels) {
            processedData = convertChannels(processedData, originalChannels, targetChannels)
        }

        // Only normalize if explicitly requested
        if (normalize) {
            processedData = normalizeAudio(processedData)
        }

        return processedData
    }

    private fun normalizeAudio(pcmData: ByteArray): ByteArray {
        val shorts = ShortArray(pcmData.size / 2)
        ByteBuffer.wrap(pcmData).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts)

        // Find maximum amplitude
        var maxAmplitude = 0
        for (sample in shorts) {
            maxAmplitude = maxOf(maxAmplitude, abs(sample.toInt()))
        }

        // Normalize if we found a non-zero maximum
        if (maxAmplitude > 0) {
            val normalizationFactor = Short.MAX_VALUE.toFloat() / maxAmplitude
            for (i in shorts.indices) {
                shorts[i] = (shorts[i] * normalizationFactor).toInt().toShort()
            }
        }

        // Convert back to bytes
        val resultBuffer = ByteBuffer.allocate(shorts.size * 2)
        resultBuffer.order(ByteOrder.LITTLE_ENDIAN)
        resultBuffer.asShortBuffer().put(shorts)
        return resultBuffer.array()
    }

    private fun convertChannels(pcmData: ByteArray, originalChannels: Int, targetChannels: Int): ByteArray {
        val result = ByteArray(pcmData.size * targetChannels / originalChannels)
        val inputBuffer = ByteBuffer.wrap(pcmData).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
        val outputBuffer = ByteBuffer.wrap(result).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()

        for (i in 0 until result.size) {
            val channelData = ShortArray(targetChannels)
            for (j in 0 until targetChannels) {
                channelData[j] = inputBuffer.get()
            }
            outputBuffer.put(channelData)
        }

        return result
    }

    private fun debugWavHeader(file: File) {
        try {
            val bytes = ByteArray(44) // Standard WAV header size
            RandomAccessFile(file, "r").use { raf ->
                raf.readFully(bytes)
            }
            
            Log.d("AudioProcessor", "WAV Header Bytes: ${bytes.joinToString(", ") { String.format("%02X", it) }}")
            Log.d("AudioProcessor", "ASCII: ${bytes.map { it.toInt().toChar() }.joinToString("")}")
            
            val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            Log.d("AudioProcessor", """
                RIFF header: ${String(bytes, 0, 4)}
                File size: ${buffer.getInt(4)}
                WAVE header: ${String(bytes, 8, 4)}
                fmt  header: ${String(bytes, 12, 4)}
                Chunk size: ${buffer.getInt(16)}
                Audio format: ${buffer.getShort(20)}
                Channels: ${buffer.getShort(22)}
                Sample rate: ${buffer.getInt(24)}
                Byte rate: ${buffer.getInt(28)}
                Block align: ${buffer.getShort(32)}
                Bits per sample: ${buffer.getShort(34)}
            """.trimIndent())
        } catch (e: Exception) {
            Log.e("AudioProcessor", "Failed to debug WAV header: ${e.message}")
        }
    }

    fun generatePreview(
        audioData: AudioData,
        numberOfPoints: Int,
        startTimeMs: Long? = null,
        endTimeMs: Long? = null,
        config: RecordingConfig
    ): AudioAnalysisData {
        val totalDurationMs = audioData.durationMs
        
        Log.d(Constants.TAG, "Total audio duration: ${totalDurationMs}ms")
        
        // Validate time range
        if (startTimeMs != null) {
            require(startTimeMs >= 0) { "startTime must be non-negative, got: $startTimeMs" }
            require(startTimeMs <= totalDurationMs) { "startTime ($startTimeMs) is beyond audio duration ($totalDurationMs)" }
        }
        
        if (endTimeMs != null) {
            require(endTimeMs >= 0) { "endTime must be non-negative, got: $endTimeMs" }
            if (endTimeMs > totalDurationMs) {
                Log.w(Constants.TAG, "endTime ($endTimeMs) is beyond audio duration ($totalDurationMs), clamping to duration")
            }
            if (startTimeMs != null) {
                require(startTimeMs < endTimeMs) { "startTime ($startTimeMs) must be less than endTime ($endTimeMs)" }
            }
        }
        
        // Calculate effective range
        val effectiveStartMs = startTimeMs ?: 0L
        val effectiveEndMs = (endTimeMs ?: totalDurationMs).coerceAtMost(totalDurationMs)
        val durationMs = effectiveEndMs - effectiveStartMs
        
        Log.d(Constants.TAG, "Preview range: ${effectiveStartMs}ms to ${effectiveEndMs}ms (${durationMs}ms)")
        
        // Calculate sample range
        val startSampleIndex = ((effectiveStartMs * audioData.sampleRate) / 1000).toInt()
        val endSampleIndex = ((effectiveEndMs * audioData.sampleRate) / 1000).toInt().coerceAtMost(audioData.data.size)
        val samplesInRange = endSampleIndex - startSampleIndex
        
        if (samplesInRange <= 0) {
            throw IllegalArgumentException("Invalid sample range: contains no samples")
        }
        
        val samplesPerPoint = (samplesInRange / numberOfPoints).coerceAtLeast(1)
        val pointsPerSecond = numberOfPoints.toDouble() / (durationMs.toDouble() / 1000.0)
        
        val dataPoints = mutableListOf<DataPoint>()
        var minAmplitude = Float.MAX_VALUE
        var maxAmplitude = Float.MIN_VALUE
        
        val extractionTimeMs = measureTimeMillis {
            for (i in 0 until numberOfPoints) {
                val pointStartSample = startSampleIndex + (i * samplesPerPoint)
                val pointEndSample = minOf(startSampleIndex + ((i + 1) * samplesPerPoint), endSampleIndex)
                
                if (pointStartSample >= pointEndSample) break
                
                try {
                    val segmentBytes = audioData.data.sliceArray(pointStartSample until pointEndSample)
                    
                    // Convert PCM bytes to float samples with proper bit depth handling
                    val segmentData = when (audioData.bitDepth) {
                        16 -> convert16BitPcmToFloat(segmentBytes)
                        32 -> convert32BitPcmToFloat(segmentBytes)
                        else -> convert8BitPcmToFloat(segmentBytes)
                    }
                    
                    // Calculate time points based on actual sample rate
                    val startTimePoint = ((pointStartSample * 1000L) / (audioData.sampleRate * audioData.channels)).toFloat()
                    val endTimePoint = ((pointEndSample * 1000L) / (audioData.sampleRate * audioData.channels)).toFloat()
                    
                    val amplitude = when (config.algorithm.lowercase()) {
                        "peak" -> segmentData.maxOf { abs(it) }
                        else -> sqrt(segmentData.map { it * it }.average().toFloat())
                    }
                    
                    minAmplitude = minOf(minAmplitude, amplitude)
                    maxAmplitude = maxOf(maxAmplitude, amplitude)
                    
                    dataPoints.add(DataPoint(
                        id = i.toLong(),
                        amplitude = amplitude,
                        startTime = startTimePoint,
                        endTime = endTimePoint,
                        startPosition = pointStartSample,
                        endPosition = pointEndSample,
                        samples = pointEndSample - pointStartSample
                    ))
                } catch (e: Exception) {
                    Log.e(Constants.TAG, "Error processing segment $i: ${e.message}")
                    throw IllegalStateException("Failed to process audio segment: ${e.message}", e)
                }
            }
        }
        
        if (dataPoints.isEmpty()) {
            throw IllegalStateException("No data points were generated")
        }
        
        return AudioAnalysisData(
            pointsPerSecond = pointsPerSecond,
            durationMs = durationMs.toInt(),
            bitDepth = audioData.bitDepth,
            numberOfChannels = audioData.channels,
            sampleRate = audioData.sampleRate,
            samples = samplesInRange,
            dataPoints = dataPoints,
            amplitudeRange = AudioAnalysisData.AmplitudeRange(minAmplitude, maxAmplitude),
            speakerChanges = emptyList(),
            extractionTimeMs = extractionTimeMs.toFloat()
        )
    }

    // Add these conversion helpers
    private fun convert16BitPcmToFloat(bytes: ByteArray): FloatArray {
        val shorts = ShortArray(bytes.size / 2)
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts)
        return shorts.map { it.toFloat() / Short.MAX_VALUE }.toFloatArray()
    }

    private fun convert32BitPcmToFloat(bytes: ByteArray): FloatArray {
        val ints = IntArray(bytes.size / 4)
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asIntBuffer().get(ints)
        return ints.map { it.toFloat() / Int.MAX_VALUE }.toFloatArray()
    }

    private fun convert8BitPcmToFloat(bytes: ByteArray): FloatArray {
        return bytes.map { (it.toInt() - 128).toFloat() / 127f }.toFloatArray()
    }

    fun loadAudioRange(
        fileUri: String,
        startTimeMs: Long? = null,
        endTimeMs: Long? = null,
        config: DecodingConfig
    ): AudioData? {
        try {
            // Clean up the URI and get a proper File object
            val cleanUri = fileUri.removePrefix("file://")
            val file = File(cleanUri).takeIf { it.exists() } ?: File(filesDir, File(cleanUri).name).takeIf { it.exists() }
                ?: run {
                    Log.e(Constants.TAG, "File not found in any location: $cleanUri")
                    return null
                }

            // Check if it's a WAV file by reading first 4 bytes
            val isWav = FileInputStream(file).use { fis ->
                val header = ByteArray(4)
                fis.read(header)
                String(header) == "RIFF"
            }

            return if (isWav) {
                loadWavRange(file, startTimeMs, endTimeMs, config)
            } else {
                loadCompressedAudioRange(file, startTimeMs, endTimeMs, config)
            }
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to load audio range: ${e.message}", e)
            return null
        }
    }

    private fun loadWavRange(
        file: File,
        startTimeMs: Long?,
        endTimeMs: Long?,
        config: DecodingConfig
    ): AudioData? {
        try {
            // Read WAV header to get format info
            val fis = FileInputStream(file)
            val headerBuffer = ByteArray(44)  // WAV header is 44 bytes
            fis.read(headerBuffer)
            
            // Parse WAV header
            val sampleRate = ByteBuffer.wrap(headerBuffer, 24, 4).order(ByteOrder.LITTLE_ENDIAN).int
            val channels = ByteBuffer.wrap(headerBuffer, 22, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
            val bitDepth = ByteBuffer.wrap(headerBuffer, 34, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt()
            
            // Calculate duration
            val bytesPerFrame = channels * (bitDepth / 8)
            val numFrames = (file.length() - 44) / bytesPerFrame  // Subtract header size
            val durationMs = (numFrames * 1000L) / sampleRate
            
            // Calculate positions
            val startByte = 44 + ((startTimeMs ?: 0) * sampleRate * bytesPerFrame / 1000)
            val endByte = 44 + ((endTimeMs ?: (file.length() * 1000 / (sampleRate * bytesPerFrame))) * sampleRate * bytesPerFrame / 1000)
            val length = (endByte - startByte).toInt()
            
            Log.d(Constants.TAG, """
                Loading WAV section:
                - start: ${startTimeMs}ms (pos: $startByte)
                - end: ${endTimeMs}ms (pos: $endByte)
                - length: $length bytes
                - format: ${sampleRate}Hz, $channels channels, $bitDepth-bit
            """.trimIndent())
            
            // Read the requested section
            val audioData = ByteArray(length)
            fis.skip(startByte - 44)  // Skip to start position (accounting for header we already read)
            fis.read(audioData)
            fis.close()
            
            return AudioData(
                data = audioData,
                sampleRate = config.targetSampleRate ?: sampleRate,
                channels = config.targetChannels ?: channels,
                bitDepth = config.targetBitDepth ?: bitDepth,
                durationMs = durationMs  // Pass the duration
            )
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to load WAV range: ${e.message}", e)
            return null
        }
    }

    private fun loadCompressedAudioRange(
        file: File,
        startTimeMs: Long?,
        endTimeMs: Long?,
        config: DecodingConfig
    ): AudioData? {
        val extractor = MediaExtractor()
        var decoder: MediaCodec? = null
        
        try {
            extractor.setDataSource(file.absolutePath)
            val format = extractor.getTrackFormat(0)
            extractor.selectTrack(0)

            val originalSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val originalChannels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val totalDurationUs = try {
                format.getLong(MediaFormat.KEY_DURATION)
            } catch (e: Exception) {
                (format.getString(MediaFormat.KEY_DURATION) ?: "-1").toLong()
            }
            Log.d("AudioProcessor", "Raw duration from format: ${totalDurationUs}us")
            
            val totalDurationMs = totalDurationUs / 1000
            Log.d("AudioProcessor", "Final duration: ${totalDurationMs}ms")

            // Calculate valid time range
            val validStartMs = startTimeMs?.coerceIn(0, totalDurationMs) ?: 0
            val validEndMs = endTimeMs?.coerceIn(validStartMs, totalDurationMs) ?: totalDurationMs
            val effectiveDurationMs = validEndMs - validStartMs

            // Initialize decoder
            decoder = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
            decoder.configure(format, null, null, 0)
            decoder.start()

            // Seek to start position if needed
            if (validStartMs > 0) {
                extractor.seekTo(validStartMs * 1000, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            }

            // Calculate buffer sizes
            val targetSampleRate = config.targetSampleRate ?: originalSampleRate
            val targetChannels = config.targetChannels ?: originalChannels
            val targetBitDepth = config.targetBitDepth ?: 16
            val bytesPerSample = targetBitDepth / 8
            val samplesPerSecond = targetSampleRate * targetChannels
            val totalBytes = (effectiveDurationMs * samplesPerSecond * bytesPerSample) / 1000

            Log.d(Constants.TAG, """
                Loading audio range:
                - start: ${validStartMs}ms
                - end: ${validEndMs}ms
                - duration: ${effectiveDurationMs}ms
                - bytes: $totalBytes
                - format: ${targetSampleRate}Hz, $targetChannels channels, $targetBitDepth-bit
            """.trimIndent())

            val outputBuffer = ByteBuffer.allocateDirect(totalBytes.toInt())
            val bufferInfo = MediaCodec.BufferInfo()
            var isEOS = false
            
            while (!isEOS) {
                // Handle input
                val inputBufferId = decoder.dequeueInputBuffer(10000)
                if (inputBufferId >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferId)!!
                    val sampleSize = extractor.readSampleData(inputBuffer, 0)
                    
                    when {
                        sampleSize < 0 -> {
                            decoder.queueInputBuffer(inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            isEOS = true
                        }
                        extractor.sampleTime > validEndMs * 1000 -> {
                            decoder.queueInputBuffer(inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            isEOS = true
                        }
                        else -> {
                            decoder.queueInputBuffer(inputBufferId, 0, sampleSize, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }

                // Handle output
                val outputBufferId = decoder.dequeueOutputBuffer(bufferInfo, 10000)
                if (outputBufferId >= 0) {
                    val outputBuffer = decoder.getOutputBuffer(outputBufferId)!!
                    if (bufferInfo.size > 0) {
                        outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                        outputBuffer.position(bufferInfo.offset)
                        if (outputBuffer.remaining() <= totalBytes - outputBuffer.position()) {
                            outputBuffer.get(ByteArray(outputBuffer.remaining()))
                        }
                    }
                    decoder.releaseOutputBuffer(outputBufferId, false)
                }
            }

            outputBuffer.flip()
            val audioData = ByteArray(outputBuffer.remaining())
            outputBuffer.get(audioData)

            return AudioData(
                data = audioData,
                sampleRate = targetSampleRate,
                channels = targetChannels,
                bitDepth = targetBitDepth,
                durationMs = effectiveDurationMs  // Pass the duration
            ).also {
                Log.d(Constants.TAG, "Loaded compressed audio with duration: ${effectiveDurationMs}ms")
            }
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to load compressed audio range: ${e.message}", e)
            return null
        } finally {
            decoder?.stop()
            decoder?.release()
            extractor.release()
        }
    }

    // Future audio editing methods
    fun trimAudio(
        fileUri: String,
        startTimeMs: Long,
        endTimeMs: Long,
        config: DecodingConfig? = null,
        outputFileName: String? = null
    ): AudioData? {
        try {
            // Load the specified range
            val audioData = loadAudioRange(fileUri, startTimeMs, endTimeMs, config ?: DecodingConfig())
                ?: return null
            
            // Generate output filename if not provided
            val outputFile = if (outputFileName != null) {
                File(filesDir, outputFileName)
            } else {
                val timestamp = System.currentTimeMillis()
                File(filesDir, "trimmed_${timestamp}.wav")
            }
            
            val durationMs = (endTimeMs - startTimeMs).toInt()
            
            Log.d(Constants.TAG, """
                Trimming audio:
                - start: ${startTimeMs}ms
                - end: ${endTimeMs}ms
                - duration: ${durationMs}ms
                - output: ${outputFile.name}
            """.trimIndent())

            // Write WAV header
            RandomAccessFile(outputFile, "rw").use { raf ->
                // RIFF header
                raf.write("RIFF".toByteArray())
                val fileSize = audioData.data.size + 36 // File size minus RIFF header
                raf.writeInt(fileSize)
                raf.write("WAVE".toByteArray())

                // fmt chunk
                raf.write("fmt ".toByteArray())
                raf.writeInt(16) // Subchunk1Size (16 for PCM)
                val formatBytes = ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
                formatBytes.putShort(1) // AudioFormat (1 for PCM)
                raf.write(formatBytes.array())

                val channelsBytes = ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN)
                channelsBytes.putShort(audioData.channels.toShort())
                raf.write(channelsBytes.array())

                val sampleRateBytes = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
                sampleRateBytes.putInt(audioData.sampleRate)
                raf.write(sampleRateBytes.array())
                
                val byteRate = audioData.sampleRate * audioData.channels * (audioData.bitDepth / 8)
                raf.writeInt(byteRate) // ByteRate
                
                val blockAlign = audioData.channels * (audioData.bitDepth / 8)
                raf.writeShort(blockAlign) // BlockAlign
                raf.writeShort(audioData.bitDepth) // BitsPerSample

                // data chunk
                raf.write("data".toByteArray())
                raf.writeInt(audioData.data.size) // Subchunk2Size
                
                // Write audio data
                raf.write(audioData.data)
            }

            // Debug WAV header to verify
            debugWavHeader(outputFile)

            // Return the trimmed audio data
            return AudioData(
                data = audioData.data,
                sampleRate = audioData.sampleRate,
                channels = audioData.channels,
                bitDepth = audioData.bitDepth
            )
        } catch (e: Exception) {
            Log.e(Constants.TAG, "Failed to trim audio: ${e.message}", e)
            return null
        }
    }

    fun removeSection(
        fileUri: String,
        startTimeMs: Long,
        endTimeMs: Long,
        config: DecodingConfig? = null
    ): AudioData? {
        // TODO: Implement removing a section by concatenating before and after ranges
        // This will use loadAudioRange to get two sections and join them
        return null
    }

    fun joinAudioSections(
        sections: List<AudioData>,
        config: DecodingConfig? = null
    ): AudioData? {
        // TODO: Implement joining multiple audio sections
        // This will be used by removeSection and other future editing features
        return null
    }

    // Helper method for future editing features
    private fun convertAudioFormat(
        audioData: AudioData,
        targetSampleRate: Int? = null,
        targetChannels: Int? = null,
        targetBitDepth: Int? = null
    ): AudioData {
        // TODO: Implement audio format conversion
        // This will help ensure consistent format when joining sections
        return audioData
    }
}
