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
            val extension = when (formatStr) {
                "aac" -> "aac"
                "mp3" -> "mp3"
                "opus" -> "opus"
                else -> "wav"
            }
            
            val outputFile = if (outputFileName != null) {
                File(context.filesDir, "$outputFileName.$extension")
            } else {
                fileHandler.createAudioFile(extension)
            }
            
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
            if (mimeType.contains("wav") && extension == "wav") {
                // For WAV to WAV, we can directly process the PCM data
                processWavFile(
                    inputUri, 
                    outputFile, 
                    timeRanges, 
                    formatOptions
                ) { progress, bytes, _ ->
                    bytesProcessed += bytes
                    progressListener?.onProgress(progress, bytesProcessed, totalBytes)
                }
            } else {
                // For other formats or format conversions, use MediaExtractor/MediaMuxer
                processCompressedAudio(
                    inputUri, 
                    outputFile, 
                    timeRanges, 
                    formatOptions
                ) { progress, bytes, _ ->
                    bytesProcessed += bytes
                    progressListener?.onProgress(progress, bytesProcessed, totalBytes)
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
                "mimeType" to "audio/$extension"
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
            val start = range["startTimeMs"] ?: 0
            val end = range["endTimeMs"] ?: durationMs
            totalDurationMs += (end - start)
        }
        
        // Calculate bytes based on bitrate and duration
        return (totalDurationMs / 1000.0 * bitrate / 8).toLong()
    }
    
    private fun calculateOutputDuration(timeRanges: List<Map<String, Long>>): Long {
        var totalDurationMs = 0L
        for (range in timeRanges) {
            val start = range["startTimeMs"] ?: 0
            val end = range["endTimeMs"] ?: 0
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
        
        // Create a new MediaFormat object instead of cloning
        val outputMediaFormat = MediaFormat()
        
        // Copy essential properties from the original format
        if (format.containsKey(MediaFormat.KEY_MIME)) {
            outputMediaFormat.setString(MediaFormat.KEY_MIME, format.getString(MediaFormat.KEY_MIME))
        }
        if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
            outputMediaFormat.setInteger(MediaFormat.KEY_SAMPLE_RATE, format.getInteger(MediaFormat.KEY_SAMPLE_RATE))
        }
        if (format.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
            outputMediaFormat.setInteger(MediaFormat.KEY_CHANNEL_COUNT, format.getInteger(MediaFormat.KEY_CHANNEL_COUNT))
        }
        if (format.containsKey(MediaFormat.KEY_BIT_RATE)) {
            outputMediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, format.getInteger(MediaFormat.KEY_BIT_RATE))
        }
        
        // Set output format parameters if specified
        formatOptions["sampleRate"]?.let {
            outputMediaFormat.setInteger(MediaFormat.KEY_SAMPLE_RATE, (it as Number).toInt())
        }
        
        formatOptions["channels"]?.let {
            outputMediaFormat.setInteger(MediaFormat.KEY_CHANNEL_COUNT, (it as Number).toInt())
        }
        
        formatOptions["bitrate"]?.let {
            outputMediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, (it as Number).toInt())
        }
        
        // Create a new muxer
        val muxerFormat = when (formatOptions["format"] as? String) {
            "aac", "mp3", "opus" -> MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4
            else -> MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4 // Default
        }
        
        val muxer = MediaMuxer(outputFile.absolutePath, muxerFormat)
        val trackIndex = muxer.addTrack(outputMediaFormat)
        muxer.start()
        
        // Process each time range
        val buffer = ByteBuffer.allocate(BUFFER_SIZE)
        val bufferInfo = android.media.MediaCodec.BufferInfo()
        
        var totalBytesProcessed = 0L
        val totalRangeDuration = calculateOutputDuration(timeRanges)
        var currentRangeProcessed = 0L
        
        for (range in timeRanges) {
            val startTimeUs = (range["startTimeMs"] ?: 0) * 1000
            val endTimeUs = (range["endTimeMs"] ?: Long.MAX_VALUE) * 1000
            
            extractor.seekTo(startTimeUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            
            var rangeBytes = 0L
            val rangeDuration = (range["endTimeMs"] ?: 0) - (range["startTimeMs"] ?: 0)
            
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
        }
        
        // Clean up
        muxer.stop()
        muxer.release()
        extractor.release()
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
} 