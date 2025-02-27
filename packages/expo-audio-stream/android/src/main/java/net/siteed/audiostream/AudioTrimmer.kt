package net.siteed.audiostream

import android.content.Context
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.nio.ByteBuffer
import kotlin.math.min

class AudioTrimmer(
    private val context: Context, 
    private val fileHandler: AudioFileHandler
) {
    companion object {
        private const val TAG = "AudioTrimmer"
        private const val BUFFER_SIZE = 1024 * 1024 // 1MB buffer
    }

    interface ProgressListener {
        fun onProgress(progress: Float, bytesProcessed: Long, totalBytes: Long)
    }

    /**
     * Trims audio file based on the provided options
     */
    fun trimAudio(
        fileUri: String,
        mode: String = "single",
        startTimeMs: Long? = null,
        endTimeMs: Long? = null,
        ranges: List<Map<String, Long>>? = null,
        outputFileName: String? = null,
        outputFormat: Map<String, Any>? = null,
        progressListener: ProgressListener? = null
    ): Map<String, Any> {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "Starting audio trim operation: mode=$mode, fileUri=$fileUri")
        Log.d(TAG, "Parameters: startTimeMs=$startTimeMs, endTimeMs=$endTimeMs, ranges=$ranges")
        Log.d(TAG, "Output format options: $outputFormat")

        try {
            // Resolve the input file URI
            val inputUri = Uri.parse(fileUri)
            
            // Get audio file metadata
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(context, inputUri)
            
            val durationMsStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
            val durationMs = durationMsStr?.toLong() ?: 0
            
            val bitrateStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE)
            val bitrate = bitrateStr?.toInt() ?: 128000
            
            val mimeType = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE) ?: "audio/wav"
            
            // Create output file
            val formatOptions = outputFormat ?: mapOf()
            val formatStr = formatOptions["format"] as? String ?: "wav"
            Log.d(TAG, "Using format string: $formatStr")
            
            // Determine the appropriate extension and format
            val extension = when (formatStr.toLowerCase()) {
                "wav" -> "wav"
                "opus" -> "opus"
                else -> "aac" // Default to AAC for other formats
            }
            
            Log.d(TAG, "Using output extension: $extension")
            
            // Add a warning log if the requested format is not supported
            if (formatStr != "wav" && formatStr != "aac" && formatStr != "opus") {
                Log.w(TAG, "Requested format '$formatStr' is not fully supported. Using '$extension' instead.")
            }
            
            val outputFile = if (outputFileName != null) {
                File(context.filesDir, "$outputFileName.$extension")
            } else {
                fileHandler.createAudioFile(extension)
            }
            
            Log.d(TAG, "Created output file: ${outputFile.absolutePath}")
            
            // Determine the time ranges to process based on the mode
            val timeRanges = when (mode) {
                "single" -> {
                    val start = startTimeMs ?: 0
                    val end = endTimeMs ?: durationMs
                    listOf(mapOf("startTimeMs" to start, "endTimeMs" to end))
                }
                "keep" -> ranges ?: emptyList()
                "remove" -> {
                    // For remove mode, we need to invert the ranges
                    val invertedRanges = mutableListOf<Map<String, Long>>()
                    var lastEnd = 0L
                    
                    ranges?.sortedBy { it["startTimeMs"] }?.forEach { range ->
                        val start = range["startTimeMs"] ?: 0
                        val end = range["endTimeMs"] ?: durationMs
                        
                        if (start > lastEnd) {
                            invertedRanges.add(mapOf("startTimeMs" to lastEnd, "endTimeMs" to start))
                        }
                        lastEnd = end
                    }
                    
                    if (lastEnd < durationMs) {
                        invertedRanges.add(mapOf("startTimeMs" to lastEnd, "endTimeMs" to durationMs))
                    }
                    
                    invertedRanges
                }
                else -> throw IllegalArgumentException("Invalid mode: $mode")
            }
            
            // Calculate total bytes to process for progress reporting
            val totalBytes = calculateTotalBytes(timeRanges, durationMs, bitrate)
            var bytesProcessed = 0L
            
            // Process the audio file based on format
            if (extension == "wav") {
                // For any format to WAV conversion, use processToWav which properly decodes to PCM
                val config = DecodingConfig(
                    targetSampleRate = formatOptions["sampleRate"] as? Int,
                    targetChannels = formatOptions["channels"] as? Int,
                    targetBitDepth = formatOptions["bitDepth"] as? Int ?: 16,
                    normalizeAudio = false
                )
                
                processToWav(
                    inputUri,
                    outputFile,
                    timeRanges,
                    config,
                    progressListener
                )
            } else if (extension == "opus") {
                // For Opus output, we'll use the same two-step approach as AAC
                val tempWavFile = File(context.filesDir, "temp_${System.currentTimeMillis()}.wav")
                
                try {
                    // First decode to WAV
                    val config = DecodingConfig(
                        // Opus works best at 16kHz or 48kHz for voice
                        // 16kHz is optimal for voice-only content
                        targetSampleRate = formatOptions["sampleRate"] as? Int ?: 16000, 
                        targetChannels = formatOptions["channels"] as? Int ?: 1, // Default to mono for voice
                        targetBitDepth = 16, // Use 16-bit for compatibility
                        normalizeAudio = false
                    )
                    
                    // Process to temporary WAV file
                    processToWav(
                        inputUri,
                        tempWavFile,
                        timeRanges,
                        config,
                        object : ProgressListener {
                            override fun onProgress(progress: Float, bytesProcessed: Long, totalBytes: Long) {
                                progressListener?.onProgress(progress / 2, bytesProcessed, totalBytes)
                            }
                        }
                    )
                    
                    // Now encode the WAV to Opus using Android's MediaCodec
                    val audioProcessor = AudioProcessor(context.filesDir)
                    val audioData = audioProcessor.loadAudioFromAnyFormat(
                        tempWavFile.absolutePath,
                        DecodingConfig(
                            targetSampleRate = formatOptions["sampleRate"] as? Int ?: 16000,
                            targetChannels = formatOptions["channels"] as? Int ?: 1,
                            targetBitDepth = 16,
                            normalizeAudio = false
                        )
                    ) ?: throw IOException("Failed to load WAV file")
                    
                    // Use the same MediaCodec approach as in encodeWavToAac but with Opus codec
                    encodeToOpus(
                        audioData,
                        outputFile,
                        formatOptions,
                        object : ProgressListener {
                            override fun onProgress(progress: Float, bytesProcessed: Long, totalBytes: Long) {
                                progressListener?.onProgress(50 + progress / 2, bytesProcessed, totalBytes)
                            }
                        }
                    )
                } finally {
                    // Clean up temp file
                    if (tempWavFile.exists()) {
                        tempWavFile.delete()
                    }
                }
            } else {
                // For AAC output, we need to decode to PCM first, then encode to AAC
                // This is more reliable than trying to copy frames directly
                val tempWavFile = File(context.filesDir, "temp_${System.currentTimeMillis()}.wav")
                
                try {
                    // First decode to WAV
                    val config = DecodingConfig(
                        targetSampleRate = formatOptions["sampleRate"] as? Int,
                        targetChannels = formatOptions["channels"] as? Int,
                        targetBitDepth = 16, // Use 16-bit for compatibility
                        normalizeAudio = false
                    )
                    
                    // Process to temporary WAV file
                    processToWav(
                        inputUri,
                        tempWavFile,
                        timeRanges,
                        config,
                        object : ProgressListener {
                            override fun onProgress(progress: Float, bytesProcessed: Long, totalBytes: Long) {
                                // Report half the progress for the first step
                                progressListener?.onProgress(progress / 2, bytesProcessed, totalBytes)
                            }
                        }
                    )
                    
                    // Now encode the WAV to AAC using Android's MediaCodec
                    encodeWavToAac(
                        tempWavFile,
                        outputFile,
                        formatOptions,
                        object : ProgressListener {
                            override fun onProgress(progress: Float, bytesProcessed: Long, totalBytes: Long) {
                                // Report the second half of progress
                                progressListener?.onProgress(50 + progress / 2, bytesProcessed, totalBytes)
                            }
                        }
                    )
                } finally {
                    // Clean up temp file
                    if (tempWavFile.exists()) {
                        tempWavFile.delete()
                    }
                }
            }
            
            // Get output file metadata
            val outputFileSize = outputFile.length()
            val outputDurationMs = calculateOutputDuration(timeRanges)
            
            // Extract audio format details
            val extractor = MediaExtractor()
            extractor.setDataSource(outputFile.absolutePath)
            
            // Initialize variables that will be populated from the file or user options
            val sampleRate: Int
            val channels: Int
            val outputBitrate: Int

            // First try to get values from the output file
            if (extractor.trackCount > 0) {
                val format = extractor.getTrackFormat(0)
                
                sampleRate = if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                    format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                } else {
                    // Use from user options or fall back to Constants default
                    formatOptions["sampleRate"] as? Int ?: Constants.DEFAULT_SAMPLE_RATE
                }
                
                channels = if (format.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
                    format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                } else {
                    // Use from user options or fall back to Constants default
                    formatOptions["channels"] as? Int ?: Constants.DEFAULT_CHANNEL_CONFIG
                }
                
                outputBitrate = if (format.containsKey(MediaFormat.KEY_BIT_RATE)) {
                    format.getInteger(MediaFormat.KEY_BIT_RATE)
                } else {
                    // Use original bitrate or user-specified value
                    formatOptions["bitrate"] as? Int ?: bitrate
                }
            } else {
                // If we can't get from the file, use user options or defaults from Constants
                sampleRate = formatOptions["sampleRate"] as? Int ?: Constants.DEFAULT_SAMPLE_RATE
                channels = formatOptions["channels"] as? Int ?: Constants.DEFAULT_CHANNEL_CONFIG
                outputBitrate = formatOptions["bitrate"] as? Int ?: bitrate
            }

            // Determine bit depth (not directly available from MediaFormat)
            val bitDepth: Int = when {
                extension == "wav" -> formatOptions["bitDepth"] as? Int ?: Constants.DEFAULT_AUDIO_FORMAT
                else -> Constants.DEFAULT_AUDIO_FORMAT // Default for compressed formats
            }
            
            extractor.release()
            
            val result = mutableMapOf<String, Any>(
                "uri" to outputFile.absolutePath,
                "filename" to outputFile.name,
                "durationMs" to outputDurationMs,
                "size" to outputFileSize,
                "sampleRate" to sampleRate,
                "channels" to channels,
                "bitDepth" to bitDepth,
                "mimeType" to "audio/$extension",
                "requestedFormat" to formatStr, // Add the originally requested format
                "actualFormat" to extension     // Add the actual format used
            )
            
            // Add compression info if not WAV
            if (extension != "wav") {
                result["compression"] = mapOf(
                    "format" to extension,
                    "bitrate" to outputBitrate,
                    "size" to outputFileSize
                )
            }
            
            Log.d(TAG, "Audio trim completed in ${System.currentTimeMillis() - startTime}ms")
            return result
            
        } catch (e: Exception) {
            Log.e(TAG, "Error trimming audio", e)
            throw e
        }
    }
    
    private fun calculateTotalBytes(timeRanges: List<Map<String, Long>>, durationMs: Long, bitrate: Int): Long {
        var totalDurationMs = 0L
        for (range in timeRanges) {
            val start = range["startTimeMs"] ?: 0L
            val end = range["endTimeMs"] ?: durationMs
            totalDurationMs += (end - start)
        }
        
        // Calculate bytes based on bitrate and duration
        // Use toLong() to ensure we're getting a Long result
        return ((totalDurationMs / 1000.0) * (bitrate / 8.0)).toLong()
    }
    
    private fun calculateOutputDuration(timeRanges: List<Map<String, Long>>): Long {
        var totalDurationMs = 0L
        for (range in timeRanges) {
            val start = range["startTimeMs"] ?: 0L
            val end = range["endTimeMs"] ?: 0L
            totalDurationMs += (end - start)
        }
        return totalDurationMs
    }
    
    private fun processWavFile(
        inputUri: Uri,
        outputFile: File,
        timeRanges: List<Map<String, Long>>,
        formatOptions: Map<String, Any>,
        progressCallback: (Float, Long, Long) -> Unit
    ) {
        // Get input file path from URI
        val inputPath = inputUri.path ?: throw IOException("Invalid input URI")
        val inputFile = File(inputPath)
        
        if (!inputFile.exists()) {
            throw IOException("Input file does not exist: $inputPath")
        }
        
        // Create output file if it doesn't exist
        if (!outputFile.exists() && !outputFile.createNewFile()) {
            throw IOException("Failed to create output file: ${outputFile.path}")
        }
        
        // Use AudioProcessor to determine actual WAV header length
        val audioProcessor = AudioProcessor(context.filesDir)
        val headerSize = audioProcessor.getWavHeaderSize(inputFile.absolutePath) ?: 44 // Default to 44 if we can't determine
        
        // Read WAV header to get format information using 'use' pattern
        val headerBuffer = FileInputStream(inputFile).use { inputStream ->
            ByteArray(headerSize).also { buffer ->
                inputStream.read(buffer)
            }
        }
        
        // Parse header to get format info
        val sampleRate = ByteBuffer.wrap(headerBuffer, 24, 4).order(java.nio.ByteOrder.LITTLE_ENDIAN).int
        val channels = ByteBuffer.wrap(headerBuffer, 22, 2).order(java.nio.ByteOrder.LITTLE_ENDIAN).short.toInt()
        val bitDepth = ByteBuffer.wrap(headerBuffer, 34, 2).order(java.nio.ByteOrder.LITTLE_ENDIAN).short.toInt()
        
        // Get file duration using MediaMetadataRetriever for consistency
        val retriever = MediaMetadataRetriever()
        retriever.setDataSource(inputFile.absolutePath)
        val durationMsStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
        val fileDurationMs = durationMsStr?.toLong() ?: 0
        retriever.release()
        
        // Override with output format if specified
        val targetSampleRate = formatOptions["sampleRate"] as? Int ?: sampleRate
        val targetChannels = formatOptions["channels"] as? Int ?: channels
        val targetBitDepth = formatOptions["bitDepth"] as? Int ?: bitDepth
        
        // Create output file with WAV header
        FileOutputStream(outputFile).use { outputStream ->
            fileHandler.writeWavHeader(outputStream, targetSampleRate, targetChannels, targetBitDepth)
            
            // Process each time range
            val bytesPerSample = bitDepth / 8
            val bytesPerFrame = bytesPerSample * channels
            val buffer = ByteArray(BUFFER_SIZE - (BUFFER_SIZE % bytesPerFrame)) // Ensure buffer size is multiple of frame size
            
            var totalBytesProcessed = 0L
            val totalRangeDuration = calculateOutputDuration(timeRanges)
            var currentRangeProcessed = 0L
            
            for (range in timeRanges) {
                val startTimeMs = range["startTimeMs"] ?: 0
                val endTimeMs = range["endTimeMs"] ?: fileDurationMs // Use actual file duration instead of Long.MAX_VALUE
                
                // Calculate byte positions
                val startByte = headerSize + ((startTimeMs * sampleRate * bytesPerFrame) / 1000)
                val endByte = headerSize + ((endTimeMs * sampleRate * bytesPerFrame) / 1000)
                
                val rangeSize = endByte - startByte
                val rangeDuration = endTimeMs - startTimeMs
                
                // Read and write the range using 'use' pattern
                FileInputStream(inputFile).use { rangeInputStream ->
                    if (rangeInputStream.skip(startByte) != startByte) {
                        throw IOException("Failed to skip to position $startByte in input file")
                    }
                    
                    var bytesRead: Int
                    var rangeProcessed = 0L
                    
                    while (rangeInputStream.read(buffer).also { bytesRead = it } > 0 && rangeProcessed < rangeSize) {
                        // Ensure we don't read past the range
                        val bytesToWrite = min(bytesRead.toLong(), rangeSize - rangeProcessed).toInt()
                        
                        // Convert bit depth if needed
                        val outputData = if (bitDepth != targetBitDepth) {
                            AudioFormatUtils.convertBitDepth(
                                buffer.copyOfRange(0, bytesToWrite),
                                bitDepth,
                                targetBitDepth
                            )
                        } else {
                            buffer.copyOfRange(0, bytesToWrite)
                        }
                        
                        outputStream.write(outputData)
                        
                        rangeProcessed += bytesToWrite
                        totalBytesProcessed += bytesToWrite
                        
                        // Calculate progress based on time for consistency with compressed audio
                        val currentTimeInRange = (rangeProcessed * 1000) / (sampleRate * bytesPerFrame)
                        
                        // Calculate overall progress directly
                        val overallProgress = (currentRangeProcessed + currentTimeInRange).toFloat() / totalRangeDuration
                        
                        progressCallback(overallProgress * 100, bytesToWrite.toLong(), totalRangeDuration)
                        
                        // Break if we've read the entire range
                        if (rangeProcessed >= rangeSize) {
                            break
                        }
                    }
                }
                
                currentRangeProcessed += rangeDuration
            }
        }
        
        // Update WAV header with correct file size
        fileHandler.updateWavHeader(outputFile)
    }
    
    private fun processCompressedAudio(
        inputUri: Uri,
        outputFile: File,
        timeRanges: List<Map<String, Long>>,
        formatOptions: Map<String, Any>,
        progressCallback: (Float, Long, Long) -> Unit
    ) {
        // Create output file if it doesn't exist
        if (!outputFile.exists() && !outputFile.createNewFile()) {
            throw IOException("Failed to create output file: ${outputFile.path}")
        }
        
        // Get file duration using MediaMetadataRetriever for consistency
        val retriever = MediaMetadataRetriever()
        retriever.setDataSource(context, inputUri)
        val mimeType = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE)
        Log.d(TAG, "Input file mime type: $mimeType")
        retriever.release()

        val extractor = MediaExtractor()
        extractor.setDataSource(context, inputUri, null)

        // Find the audio track
        val audioTrackIndex = selectTrack(extractor)
        if (audioTrackIndex < 0) {
            throw IOException("No audio track found in $inputUri")
        }

        extractor.selectTrack(audioTrackIndex)
        val format = extractor.getTrackFormat(audioTrackIndex)

        // Log the original format details
        Log.d(TAG, "Original format: $format")

        // Create a new MediaFormat object instead of cloning
        val outputMediaFormat = MediaFormat()

        // Get the input MIME type
        val inputMime = format.getString(MediaFormat.KEY_MIME)
        Log.d(TAG, "Input MIME type from format: $inputMime")

        // Determine output MIME type based on format options
        // MediaMuxer only reliably supports AAC for audio in MP4 container
        val outputMime = MediaFormat.MIMETYPE_AUDIO_AAC

        Log.d(TAG, "Using output MIME type: $outputMime")
        outputMediaFormat.setString(MediaFormat.KEY_MIME, outputMime)

        // Copy essential properties from the original format
        if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            outputMediaFormat.setInteger(MediaFormat.KEY_SAMPLE_RATE, sampleRate)
            Log.d(TAG, "Setting sample rate: $sampleRate")
        }
        if (format.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            outputMediaFormat.setInteger(MediaFormat.KEY_CHANNEL_COUNT, channelCount)
            Log.d(TAG, "Setting channel count: $channelCount")
        }

        // Set a reasonable default bitrate if not present in original
        val defaultBitrate = 128000 // 128kbps
        val bitRate = if (format.containsKey(MediaFormat.KEY_BIT_RATE)) {
            format.getInteger(MediaFormat.KEY_BIT_RATE)
        } else {
            defaultBitrate
        }
        outputMediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitRate)
        Log.d(TAG, "Setting bit rate: $bitRate")

        // Set output format parameters if specified
        formatOptions["sampleRate"]?.let {
            val sampleRate = (it as Number).toInt()
            outputMediaFormat.setInteger(MediaFormat.KEY_SAMPLE_RATE, sampleRate)
            Log.d(TAG, "Overriding sample rate with: $sampleRate")
        }

        formatOptions["channels"]?.let {
            val channels = (it as Number).toInt()
            outputMediaFormat.setInteger(MediaFormat.KEY_CHANNEL_COUNT, channels)
            Log.d(TAG, "Overriding channel count with: $channels")
        }

        formatOptions["bitrate"]?.let {
            val bitrate = (it as Number).toInt()
            outputMediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            Log.d(TAG, "Overriding bit rate with: $bitrate")
        }

        // Create a new muxer
        val muxerFormat = MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4 // Always use MP4 container

        Log.d(TAG, "Creating MediaMuxer with format: $muxerFormat for output file: ${outputFile.absolutePath}")
        val muxer = MediaMuxer(outputFile.absolutePath, muxerFormat)

        try {
            Log.d(TAG, "Adding track with format: $outputMediaFormat")
            val trackIndex = muxer.addTrack(outputMediaFormat)
            Log.d(TAG, "Track added successfully with index: $trackIndex")
            muxer.start()

            // Process each time range
            val buffer = ByteBuffer.allocate(BUFFER_SIZE)
            val bufferInfo = android.media.MediaCodec.BufferInfo()

            var totalBytesProcessed = 0L
            val totalRangeDuration = calculateOutputDuration(timeRanges)
            var currentRangeProcessed = 0L
            val muxerStarted = true // Add flag to track muxer state

            for (range in timeRanges) {
                val startTimeUs = (range["startTimeMs"] ?: 0) * 1000
                val endTimeUs = (range["endTimeMs"] ?: Long.MAX_VALUE) * 1000

                extractor.seekTo(startTimeUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

                var rangeBytes = 0L
                val rangeDuration = (range["endTimeMs"] ?: 0) - (range["startTimeMs"] ?: 0)
                var samplesWritten = 0 // Track if we've written any samples

                while (true) {
                    val sampleSize = extractor.readSampleData(buffer, 0)
                    if (sampleSize < 0) {
                        break
                    }

                    val sampleTime = extractor.sampleTime
                    if (sampleTime > endTimeUs) {
                        break
                    }

                    bufferInfo.size = sampleSize
                    bufferInfo.offset = 0

                    // Map MediaExtractor sample flags to MediaCodec buffer flags
                    val sampleFlags = extractor.sampleFlags
                    bufferInfo.flags = when {
                        (sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC) != 0 ->
                            android.media.MediaCodec.BUFFER_FLAG_KEY_FRAME
                        else -> 0
                    }

                    bufferInfo.presentationTimeUs = sampleTime - startTimeUs + currentRangeProcessed * 1000

                    muxer.writeSampleData(trackIndex, buffer, bufferInfo)
                    samplesWritten++

                    extractor.advance()

                    // Update progress
                    rangeBytes += sampleSize
                    totalBytesProcessed += sampleSize

                    // Calculate progress based on time
                    val currentTimeInRange = (sampleTime - startTimeUs) / 1000

                    // Calculate overall progress directly
                    val overallProgress = (currentRangeProcessed + currentTimeInRange).toFloat() / totalRangeDuration

                    progressCallback(overallProgress * 100, sampleSize.toLong(), totalRangeDuration)
                }

                currentRangeProcessed += rangeDuration
                
                // If we didn't write any samples for this range, log a warning
                if (samplesWritten == 0) {
                    Log.w(TAG, "No samples written for range: startTimeMs=${range["startTimeMs"]}, endTimeMs=${range["endTimeMs"]}")
                }
            }
            
            // Only stop if we've actually started and written data
            if (muxerStarted) {
                try {
                    Log.d(TAG, "Stopping muxer...")
                    muxer.stop()
                    Log.d(TAG, "Muxer stopped successfully")
                } catch (e: IllegalStateException) {
                    // This can happen if no samples were written or muxer is already stopped
                    Log.w(TAG, "Error stopping muxer: ${e.message}. This may be normal if no samples were written.")
                    // Don't rethrow - we'll still release the muxer
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in processCompressedAudio", e)
            throw e
        } finally {
            // Always release resources in finally block
            try {
                muxer.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing muxer: ${e.message}")
            }
            
            try {
                extractor.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing extractor: ${e.message}")
            }
        }
    }

    private fun selectTrack(extractor: MediaExtractor): Int {
        val numTracks = extractor.trackCount
        for (i in 0 until numTracks) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("audio/") == true) {
                return i
            }
        }
        return -1
    }

    private fun processToWav(
        inputUri: Uri,
        outputFile: File,
        timeRanges: List<Map<String, Long>>,
        config: DecodingConfig,
        progressListener: ProgressListener?
    ) {
        // Increase buffer size for better performance
        val LARGER_BUFFER_SIZE = 8 * 1024 * 1024 // 8MB buffer instead of 1MB
        
        val audioProcessor = AudioProcessor(context.filesDir)
        
        // Create output file with WAV header
        FileOutputStream(outputFile).use { outputStream ->
            // We'll write the header at the end when we know the total size
            var totalBytes = 0L
            var totalProgress = 0f
            val totalRanges = timeRanges.size
            
            // Process each time range
            for ((index, range) in timeRanges.withIndex()) {
                val startTimeMs = range["startTimeMs"] ?: 0
                val endTimeMs = range["endTimeMs"] ?: 0
                val rangeDuration = endTimeMs - startTimeMs
                
                Log.d(TAG, "Processing range $index: $startTimeMs-$endTimeMs ms")
                
                // Load just this range of audio
                val audioData = audioProcessor.loadAudioRange(
                    fileUri = inputUri.toString(),
                    startTimeMs = startTimeMs,
                    endTimeMs = endTimeMs,
                    config = config
                ) ?: throw IOException("Failed to load audio range $startTimeMs-$endTimeMs")
                
                // For the first range, write the WAV header
                if (index == 0) {
                    fileHandler.writeWavHeader(
                        outputStream,
                        audioData.sampleRate,
                        audioData.channels,
                        audioData.bitDepth
                    )
                }
                
                // Write the PCM data for this range
                outputStream.write(audioData.data)
                totalBytes += audioData.data.size
                
                // Update progress
                val rangeProgress = (index + 1).toFloat() / totalRanges
                totalProgress = rangeProgress * 100
                progressListener?.onProgress(totalProgress, audioData.data.size.toLong(), rangeDuration)
                
                Log.d(TAG, "Range $index processed: ${audioData.data.size} bytes, ${audioData.durationMs} ms")
            }
        }
        
        // Update WAV header with correct file size
        fileHandler.updateWavHeader(outputFile)
        
        Log.d(TAG, "WAV file created successfully: ${outputFile.absolutePath}")
    }

    /**
     * Encodes a WAV file to AAC format using MediaCodec
     */
    private fun encodeWavToAac(
        inputWavFile: File,
        outputAacFile: File,
        formatOptions: Map<String, Any>,
        progressListener: ProgressListener?
    ) {
        // Increase MediaCodec buffer size
        val LARGER_INPUT_BUFFER_SIZE = 65536 // 64KB
        
        Log.d(TAG, "Encoding WAV to AAC: ${inputWavFile.absolutePath} -> ${outputAacFile.absolutePath}")
        
        // Get WAV file details
        val audioProcessor = AudioProcessor(context.filesDir)
        val audioFormat = audioProcessor.getAudioFormat(inputWavFile.absolutePath)
            ?: throw IOException("Failed to get audio format from WAV file")
        
        val sampleRate = formatOptions["sampleRate"] as? Int ?: audioFormat.sampleRate
        val channels = formatOptions["channels"] as? Int ?: audioFormat.channels
        val bitrate = formatOptions["bitrate"] as? Int ?: 128000
        
        // Load the entire WAV file as PCM data
        val audioData = audioProcessor.loadAudioFromAnyFormat(
            inputWavFile.absolutePath,
            DecodingConfig(
                targetSampleRate = sampleRate,
                targetChannels = channels,
                targetBitDepth = 16,
                normalizeAudio = false
            )
        ) ?: throw IOException("Failed to load WAV file")
        
        // Set up MediaCodec for AAC encoding
        val mediaFormat = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels)
        mediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
        mediaFormat.setInteger(MediaFormat.KEY_AAC_PROFILE, android.media.MediaCodecInfo.CodecProfileLevel.AACObjectLC)
        mediaFormat.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, LARGER_INPUT_BUFFER_SIZE)
        
        val encoder = android.media.MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
        encoder.configure(mediaFormat, null, null, android.media.MediaCodec.CONFIGURE_FLAG_ENCODE)
        encoder.start()
        
        // Set up MediaMuxer for MP4 container
        val muxer = MediaMuxer(outputAacFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        var trackIndex = -1
        var muxerStarted = false
        
        try {
            val bufferInfo = android.media.MediaCodec.BufferInfo()
            val timeoutUs = 10000L
            var presentationTimeUs = 0L
            var totalBytesProcessed = 0L
            val totalBytes = audioData.data.size.toLong()
            var allInputSubmitted = false
            var encoderDone = false
            
            // Calculate bytes per frame
            val bytesPerSample = audioData.bitDepth / 8
            val bytesPerFrame = bytesPerSample * audioData.channels
            val frameSizeInBytes = 4096 * bytesPerFrame // Process 4096 samples at a time instead of 1024
            
            // Process the PCM data in larger chunks
            var inputOffset = 0
            
            while (!encoderDone) {
                // Submit input data if we have any left
                if (!allInputSubmitted) {
                    val inputBufferIndex = encoder.dequeueInputBuffer(timeoutUs)
                    if (inputBufferIndex >= 0) {
                        val inputBuffer = encoder.getInputBuffer(inputBufferIndex)
                        inputBuffer?.clear()
                        
                        // Calculate how many bytes to read
                        val bytesToRead = if (inputOffset + frameSizeInBytes <= audioData.data.size) {
                            frameSizeInBytes
                        } else {
                            audioData.data.size - inputOffset
                        }
                        
                        if (bytesToRead > 0) {
                            // Copy data to the input buffer
                            inputBuffer?.put(audioData.data, inputOffset, bytesToRead)
                            
                            // Calculate presentation time in microseconds
                            val frameDurationUs = (bytesToRead * 1000000L) / (sampleRate * bytesPerFrame)
                            
                            // Submit the input buffer
                            encoder.queueInputBuffer(
                                inputBufferIndex,
                                0,
                                bytesToRead,
                                presentationTimeUs,
                                0
                            )
                            
                            // Update state
                            presentationTimeUs += frameDurationUs
                            inputOffset += bytesToRead
                            totalBytesProcessed += bytesToRead
                            
                            // Report progress
                            val progress = (totalBytesProcessed * 100f) / totalBytes
                            progressListener?.onProgress(progress, bytesToRead.toLong(), totalBytes)
                        } else {
                            // End of input
                            encoder.queueInputBuffer(
                                inputBufferIndex,
                                0,
                                0,
                                presentationTimeUs,
                                android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            allInputSubmitted = true
                        }
                    }
                }
                
                // Get encoded output
                val outputBufferIndex = encoder.dequeueOutputBuffer(bufferInfo, timeoutUs)
                if (outputBufferIndex == android.media.MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    // Encoder output format changed, must be the first before any data
                    if (trackIndex >= 0) {
                        throw RuntimeException("Format changed twice")
                    }
                    val newFormat = encoder.outputFormat
                    Log.d(TAG, "Encoder output format changed: $newFormat")
                    trackIndex = muxer.addTrack(newFormat)
                    muxer.start()
                    muxerStarted = true
                } else if (outputBufferIndex >= 0) {
                    // Got encoded data
                    val encodedData = encoder.getOutputBuffer(outputBufferIndex)
                    
                    if (encodedData != null) {
                        if ((bufferInfo.flags and android.media.MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
                            // Codec config data, not actual media data
                            bufferInfo.size = 0
                        }
                        
                        if (bufferInfo.size > 0 && muxerStarted) {
                            // Adjust buffer info offset and size for the buffer
                            encodedData.position(bufferInfo.offset)
                            encodedData.limit(bufferInfo.offset + bufferInfo.size)
                            
                            // Write to muxer
                            muxer.writeSampleData(trackIndex, encodedData, bufferInfo)
                        }
                        
                        // Release the output buffer
                        encoder.releaseOutputBuffer(outputBufferIndex, false)
                        
                        // Check if we're done
                        if ((bufferInfo.flags and android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                            encoderDone = true
                        }
                    }
                }
            }
            
            // Make sure we report 100% progress
            progressListener?.onProgress(100f, totalBytes, totalBytes)
            
        } finally {
            // Clean up resources
            try {
                encoder.stop()
                encoder.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing encoder: ${e.message}")
            }
            
            if (muxerStarted) {
                try {
                    muxer.stop()
                } catch (e: Exception) {
                    Log.w(TAG, "Error stopping muxer: ${e.message}")
                }
            }
            
            try {
                muxer.release()
            } catch (e: Exception) {
                Log.w(TAG, "Error releasing muxer: ${e.message}")
            }
        }
        
        Log.d(TAG, "WAV to AAC encoding completed successfully")
    }

    /**
     * Encodes audio data to Opus format using MediaCodec
     */
    private fun encodeToOpus(
        audioData: AudioProcessor.AudioData,
        outputFile: File,
        formatOptions: Map<String, Any>,
        progressListener: ProgressListener?
    ) {
        Log.d(TAG, "Encoding to Opus: ${outputFile.absolutePath}")
        
        try {
            // Check if Opus codec is available
            val codecList = android.media.MediaCodecList(android.media.MediaCodecList.REGULAR_CODECS)
            val opusCodecName = codecList.codecInfos
                .filter { it.isEncoder && it.supportedTypes.contains(MediaFormat.MIMETYPE_AUDIO_OPUS) }
                .map { it.name }
                .firstOrNull()
            
            if (opusCodecName == null) {
                Log.w(TAG, "Opus encoder not available, falling back to AAC")
                
                // Create a temporary WAV file
                val tempWavFile = File(context.filesDir, "temp_${System.currentTimeMillis()}.wav")
                try {
                    // Use AudioFileHandler to write WAV header and data
                    val audioFileHandler = AudioFileHandler(context.filesDir)
                    tempWavFile.outputStream().use { outputStream ->
                        // Write WAV header
                        audioFileHandler.writeWavHeader(
                            outputStream,
                            audioData.sampleRate,
                            audioData.channels,
                            audioData.bitDepth
                        )
                        
                        // Write PCM data
                        outputStream.write(audioData.data)
                    }
                    
                    // Update WAV header with correct file size
                    audioFileHandler.updateWavHeader(tempWavFile)
                    
                    // Now we can call encodeWavToAac with the temp file
                    encodeWavToAac(
                        tempWavFile,
                        outputFile,
                        formatOptions,
                        progressListener
                    )
                } finally {
                    // Clean up temp file
                    if (tempWavFile.exists()) {
                        tempWavFile.delete()
                    }
                }
                return
            }
            
            // Set up MediaCodec for Opus encoding
            val sampleRate = formatOptions["sampleRate"] as? Int ?: audioData.sampleRate
            val channels = formatOptions["channels"] as? Int ?: audioData.channels
            
            // Determine appropriate bitrate based on content type and channels
            // For voice: 8-24kbps for mono, 16-32kbps for stereo is typically sufficient
            val defaultBitrate = if (channels > 1) 32000 else 16000 // Lower defaults for voice
            val bitrate = formatOptions["bitrate"] as? Int ?: defaultBitrate
            
            // Determine if this is voice content based on sample rate and/or explicit flag
            val isVoiceContent = formatOptions["isVoice"] as? Boolean ?: (sampleRate <= 16000)
            
            val mediaFormat = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_OPUS, sampleRate, channels)
            mediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            mediaFormat.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384)
            
            // Set complexity - lower for voice (faster encoding, still good quality)
            // Complexity range is 0-10, with 10 being highest quality but slowest
            val complexity = if (isVoiceContent) 5 else 7
            try {
                mediaFormat.setInteger("complexity", complexity)
                Log.d(TAG, "Set Opus complexity to $complexity")
            } catch (e: Exception) {
                // Some devices might not support this parameter
                Log.w(TAG, "Failed to set complexity parameter: ${e.message}")
            }

            // For API 28+ we can set some additional parameters
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                try {
                    // Use 1 for speech, 2 for music
                    val contentTypeValue = if (isVoiceContent) 1 else 2
                    mediaFormat.setInteger("audio-content-type", contentTypeValue)
                    Log.d(TAG, "Set Opus content type to: ${if (isVoiceContent) "SPEECH" else "MUSIC"}")
                } catch (e: Exception) {
                    // Some devices might not support this parameter
                    Log.w(TAG, "Failed to set audio-content-type parameter: ${e.message}")
                }
            }

            // Create encoder
            val encoder = android.media.MediaCodec.createByCodecName(opusCodecName)
            encoder.configure(mediaFormat, null, null, android.media.MediaCodec.CONFIGURE_FLAG_ENCODE)
            encoder.start()
            
            // Set up MediaMuxer for Opus container (using OGG container)
            val muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_OGG)
            var trackIndex = -1
            var muxerStarted = false
            
            try {
                val bufferInfo = android.media.MediaCodec.BufferInfo()
                val timeoutUs = 10000L
                var presentationTimeUs = 0L
                var totalBytesProcessed = 0L
                val totalBytes = audioData.data.size.toLong()
                var allInputSubmitted = false
                var encoderDone = false
                
                // Calculate bytes per frame
                val bytesPerSample = audioData.bitDepth / 8
                val bytesPerFrame = bytesPerSample * audioData.channels
                val frameSizeInBytes = 960 * bytesPerFrame // Opus typically uses 20ms frames (960 samples at 48kHz)
                
                // Process the PCM data in chunks
                var inputOffset = 0
                
                while (!encoderDone) {
                    // Submit input data if we have any left
                    if (!allInputSubmitted) {
                        val inputBufferIndex = encoder.dequeueInputBuffer(timeoutUs)
                        if (inputBufferIndex >= 0) {
                            val inputBuffer = encoder.getInputBuffer(inputBufferIndex)
                            inputBuffer?.clear()
                            
                            // Calculate how many bytes to read
                            val bytesToRead = if (inputOffset + frameSizeInBytes <= audioData.data.size) {
                                frameSizeInBytes
                            } else {
                                audioData.data.size - inputOffset
                            }
                            
                            if (bytesToRead > 0) {
                                // Copy data to the input buffer
                                inputBuffer?.put(audioData.data, inputOffset, bytesToRead)
                                
                                // Calculate presentation time in microseconds
                                val frameDurationUs = (bytesToRead * 1000000L) / (sampleRate * bytesPerFrame)
                                
                                // Submit the input buffer
                                encoder.queueInputBuffer(
                                    inputBufferIndex,
                                    0,
                                    bytesToRead,
                                    presentationTimeUs,
                                    0
                                )
                                
                                // Update state
                                presentationTimeUs += frameDurationUs
                                inputOffset += bytesToRead
                                totalBytesProcessed += bytesToRead
                                
                                // Report progress
                                val progress = (totalBytesProcessed * 100f) / totalBytes
                                progressListener?.onProgress(progress, bytesToRead.toLong(), totalBytes)
                            } else {
                                // End of input
                                encoder.queueInputBuffer(
                                    inputBufferIndex,
                                    0,
                                    0,
                                    presentationTimeUs,
                                    android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM
                                )
                                allInputSubmitted = true
                            }
                        }
                    }
                    
                    // Get encoded output
                    val outputBufferIndex = encoder.dequeueOutputBuffer(bufferInfo, timeoutUs)
                    if (outputBufferIndex == android.media.MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                        // Encoder output format changed, must be the first before any data
                        if (trackIndex >= 0) {
                            throw RuntimeException("Format changed twice")
                        }
                        val newFormat = encoder.outputFormat
                        Log.d(TAG, "Encoder output format changed: $newFormat")
                        trackIndex = muxer.addTrack(newFormat)
                        muxer.start()
                        muxerStarted = true
                    } else if (outputBufferIndex >= 0) {
                        // Got encoded data
                        val encodedData = encoder.getOutputBuffer(outputBufferIndex)
                        
                        if (encodedData != null) {
                            if ((bufferInfo.flags and android.media.MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
                                // Codec config data, not actual media data
                                bufferInfo.size = 0
                            }
                            
                            if (bufferInfo.size > 0 && muxerStarted) {
                                // Adjust buffer info offset and size for the buffer
                                encodedData.position(bufferInfo.offset)
                                encodedData.limit(bufferInfo.offset + bufferInfo.size)
                                
                                // Write to muxer
                                muxer.writeSampleData(trackIndex, encodedData, bufferInfo)
                            }
                            
                            // Release the output buffer
                            encoder.releaseOutputBuffer(outputBufferIndex, false)
                            
                            // Check if we're done
                            if ((bufferInfo.flags and android.media.MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                                encoderDone = true
                            }
                        }
                    }
                }
                
                // Make sure we report 100% progress
                progressListener?.onProgress(100f, totalBytes, totalBytes)
                
            } finally {
                // Clean up resources
                try {
                    encoder.stop()
                    encoder.release()
                } catch (e: Exception) {
                    Log.w(TAG, "Error releasing encoder: ${e.message}")
                }
                
                if (muxerStarted) {
                    try {
                        muxer.stop()
                    } catch (e: Exception) {
                        Log.w(TAG, "Error stopping muxer: ${e.message}")
                    }
                }
                
                try {
                    muxer.release()
                } catch (e: Exception) {
                    Log.w(TAG, "Error releasing muxer: ${e.message}")
                }
            }
            
            Log.d(TAG, "Opus encoding completed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error encoding to Opus: ${e.message}", e)
            
            // Fall back to AAC if Opus encoding fails
            Log.w(TAG, "Opus encoding failed, falling back to AAC")
            
            // Create a temporary WAV file
            val tempWavFile = File(context.filesDir, "temp_${System.currentTimeMillis()}.wav")
            try {
                // Write the audio data to a temporary WAV file
                val audioFileHandler = AudioFileHandler(context.filesDir)
                tempWavFile.outputStream().use { outputStream ->
                    audioFileHandler.writeWavHeader(
                        outputStream,
                        audioData.sampleRate,
                        audioData.channels,
                        audioData.bitDepth
                    )
                    outputStream.write(audioData.data)
                }
                audioFileHandler.updateWavHeader(tempWavFile)
                
                // Encode to AAC
                encodeWavToAac(
                    tempWavFile,
                    File(outputFile.absolutePath.replace(".opus", ".aac")),
                    formatOptions,
                    progressListener
                )
            } finally {
                if (tempWavFile.exists()) {
                    tempWavFile.delete()
                }
            }
            
            throw IOException("Failed to encode to Opus: ${e.message}", e)
        }
    }
} 