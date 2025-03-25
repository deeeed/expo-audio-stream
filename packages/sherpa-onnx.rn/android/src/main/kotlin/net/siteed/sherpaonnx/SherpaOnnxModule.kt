/**
 * SherpaOnnxModule - React Native module for sherpa-onnx
 * Supports both old architecture and New Architecture
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.Executors

// Import the JNI bridge
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig

// Import the AudioTagging class
import com.k2fsa.sherpa.onnx.AudioTagging
import com.k2fsa.sherpa.onnx.AudioTaggingConfig
import com.k2fsa.sherpa.onnx.AudioEvent
import com.k2fsa.sherpa.onnx.OfflineStream
import com.k2fsa.sherpa.onnx.AudioTaggingModelConfig
import com.k2fsa.sherpa.onnx.OfflineZipformerAudioTaggingModelConfig

class SherpaOnnxModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    
    // TTS state
    private var ttsPtr: Long = 0L
    private var isGenerating = false
    private var audioTrack: AudioTrack? = null
    
    // Audio tagging state
    private var audioTagging: AudioTagging? = null
    private var stream: OfflineStream? = null

    // Feature handlers
    private val ttsHandler = TtsHandler(reactContext)
    private val audioTaggingHandler = AudioTaggingHandler(reactContext)
    private val archiveHandler = ArchiveHandler(reactContext)
    private val sttHandler = STTHandler(reactContext)

    companion object {
        const val NAME = "SherpaOnnx"
        private const val TAG = "SherpaOnnxModule"
        var isLibraryLoaded = false
        
        // Move the TIMEOUT_US constant here
        private const val TIMEOUT_US = 10000L
        
        init {
            try {
                // Check if the library is loaded by accessing the JNI bridge class
                isLibraryLoaded = com.k2fsa.sherpa.onnx.OfflineTts::class.java != null
                Log.i(TAG, "Sherpa ONNX JNI library is available")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load sherpa-onnx-jni: ${e.message}")
                isLibraryLoaded = false
            }
        }
    }

    override fun getName(): String = NAME
    
    @ReactMethod
    fun validateLibraryLoaded(promise: Promise) {
        val resultMap = Arguments.createMap()
        resultMap.putBoolean("loaded", isLibraryLoaded)
        
        if (isLibraryLoaded) {
            resultMap.putString("status", "Sherpa ONNX JNI library loaded successfully")
        } else {
            resultMap.putString("status", "Failed to load Sherpa ONNX JNI library")
        }
        
        promise.resolve(resultMap)
    }

    // =========================================================================
    // Archive Methods - Delegated to ArchiveHandler
    // =========================================================================
    
    @ReactMethod
    fun extractTarBz2(sourcePath: String, targetDir: String, promise: Promise) {
        archiveHandler.extractTarBz2(sourcePath, targetDir, promise)
    }
    
    @ReactMethod
    fun createMockModelFiles(targetDir: String, modelId: String, promise: Promise) {
        archiveHandler.createMockModelFiles(targetDir, modelId, promise)
    }

    // =========================================================================
    // TTS Methods - Delegated to TtsHandler
    // =========================================================================
    
    @ReactMethod
    fun initTts(modelConfig: ReadableMap, promise: Promise) {
        ttsHandler.init(modelConfig, promise)
    }
    
    @ReactMethod
    fun generateTts(text: String, speakerId: Int, speed: Float, playAudio: Boolean, promise: Promise) {
        ttsHandler.generate(text, speakerId, speed, playAudio, promise)
    }
    
    @ReactMethod
    fun stopTts(promise: Promise) {
        ttsHandler.stop(promise)
    }
    
    @ReactMethod
    fun releaseTts(promise: Promise) {
        ttsHandler.release(promise)
    }

    // =========================================================================
    // STT Methods - Delegated to STTHandler
    // =========================================================================

    @ReactMethod
    fun initStt(modelConfig: ReadableMap, promise: Promise) {
        sttHandler.init(modelConfig, promise)
    }

    @ReactMethod
    fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        sttHandler.recognizeFromSamples(sampleRate, audioBuffer, promise)
    }

    @ReactMethod
    fun recognizeFromFile(filePath: String, promise: Promise) {
        sttHandler.recognizeFromFile(filePath, promise)
    }

    @ReactMethod
    fun releaseStt(promise: Promise) {
        sttHandler.release(promise)
    }

    // =========================================================================
    // AudioTagging Methods - Delegated to AudioTaggingHandler
    // =========================================================================
    
    @ReactMethod
    fun initAudioTagging(modelConfig: ReadableMap, promise: Promise) {
        audioTaggingHandler.init(modelConfig, promise)
    }
    
    @ReactMethod
    fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        audioTaggingHandler.processAudioSamples(sampleRate, audioBuffer, promise)
    }
    
    @ReactMethod
    fun computeAudioTagging(promise: Promise) {
        audioTaggingHandler.computeAudioTagging(promise)
    }
    
    @ReactMethod
    fun releaseAudioTagging(promise: Promise) {
        audioTaggingHandler.release(promise)
    }
    
    @ReactMethod
    fun processAndComputeAudioTagging(filePath: String, promise: Promise) {
        audioTaggingHandler.processAndComputeAudioTagging(filePath, promise)
    }
    
    @ReactMethod
    fun processAudioFile(filePath: String, promise: Promise) {
        audioTaggingHandler.processAudioFile(filePath, promise)
    }

    /**
     * List all assets recursively
     */
    private fun getAllAssetsRecursively(path: String): List<String> {
        val assets = mutableListOf<String>()
        try {
            val items = reactContext.assets.list(path) ?: return assets
            for (item in items) {
                val fullPath = if (path.isEmpty()) item else "$path/$item"
                try {
                    reactContext.assets.open(fullPath).use {
                        assets.add(fullPath)
                    }
                } catch (e: IOException) {
                    val subItems = reactContext.assets.list(fullPath)
                    if (subItems?.isNotEmpty() == true) {
                        assets.addAll(getAllAssetsRecursively(fullPath))
                    }
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error listing assets in $path: ${e.message}")
        }
        return assets
    }

    private fun validateModelFiles(modelDir: String, modelName: String, voices: String): Triple<Boolean, String, List<String>> {
        val requiredFiles = listOf(
            File(modelDir, modelName),
            File(modelDir, voices),
            File(modelDir, "tokens.txt")
        )
        
        val missingFiles = mutableListOf<String>()
        var isValid = true
        var errorMessage = ""

        for (file in requiredFiles) {
            if (!file.exists() || !file.canRead()) {
                isValid = false
                missingFiles.add(file.absolutePath)
                Log.e(TAG, "Cannot access file: ${file.absolutePath}")
            } else {
                Log.i(TAG, "Found file: ${file.absolutePath} (${file.length()} bytes)")
            }
        }

        if (!isValid) {
            errorMessage = "Missing or unreadable files: ${missingFiles.joinToString(", ")}"
        }

        return Triple(isValid, errorMessage, missingFiles)
    }

    /**
     * Data class to hold extracted audio data
     */
    data class AudioData(val samples: FloatArray, val sampleRate: Int)
    
    /**
     * Extract audio data from any supported audio file using MediaExtractor
     * This handles MP3, WAV, AAC, and other formats supported by Android
     */
    private fun extractAudioFromFile(file: File): AudioData? {
        val extractor = MediaExtractor()
        val decoder = MediaCodec.createDecoderByType(MediaFormat.MIMETYPE_AUDIO_MPEG)
        
        try {
            // Set the data source to our audio file
            extractor.setDataSource(file.absolutePath)
            
            // Find the first audio track
            val audioTrackIndex = selectAudioTrack(extractor)
            if (audioTrackIndex < 0) {
                Log.e(TAG, "No audio track found in the file")
                return null
            }
            
            // Select this track for extraction
            extractor.selectTrack(audioTrackIndex)
            
            // Get the format for this track
            val format = extractor.getTrackFormat(audioTrackIndex)
            
            // Get sample rate from format
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            Log.i(TAG, "Audio sample rate: $sampleRate")
            
            // Get channel count
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            Log.i(TAG, "Audio channels: $channelCount")
            
            // Configure and start the decoder
            decoder.configure(format, null, null, 0)
            decoder.start()
            
            // Decode the audio to PCM
            val pcmData = decodeAudioToPCM(extractor, format, decoder)
            
            // If this is stereo or multi-channel, convert to mono by averaging the channels
            val monoSamples = if (channelCount > 1) {
                convertToMono(pcmData, channelCount)
            } else {
                pcmData
            }
            
            // Convert byte array to float array
            val floatSamples = byteArrayToFloatArray(monoSamples)
            
            return AudioData(floatSamples, sampleRate)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting audio: ${e.message}")
            e.printStackTrace()
            return null
        } finally {
            try {
                extractor.release()
                decoder.stop()
                decoder.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error cleaning up MediaExtractor: ${e.message}")
            }
        }
    }
    
    /**
     * Find and select the first audio track in the media file
     */
    private fun selectAudioTrack(extractor: MediaExtractor): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("audio/") == true) {
                return i
            }
        }
        return -1
    }
    
    /**
     * Decode audio data to raw PCM using MediaCodec
     */
    private fun decodeAudioToPCM(extractor: MediaExtractor, format: MediaFormat, decoder: MediaCodec): ByteArray {
        val outputBuffers = mutableListOf<ByteArray>()
        val bufferInfo = MediaCodec.BufferInfo()
        var inputEOS = false
        var outputEOS = false
        
        // Start decoding
        while (!outputEOS) {
            if (!inputEOS) {
                val inputBufferId = decoder.dequeueInputBuffer(TIMEOUT_US)
                if (inputBufferId >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferId)
                    inputBuffer?.clear()
                    
                    val sampleSize = if (inputBuffer != null) {
                        extractor.readSampleData(inputBuffer, 0)
                    } else -1
                    
                    if (sampleSize < 0) {
                        decoder.queueInputBuffer(
                            inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        inputEOS = true
                        Log.d(TAG, "End of audio stream reached")
                    } else {
                        decoder.queueInputBuffer(
                            inputBufferId, 0, sampleSize, extractor.sampleTime, 0
                        )
                        extractor.advance()
                    }
                }
            }
            
            // Get decoded data
            val outputBufferId = decoder.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
            if (outputBufferId >= 0) {
                if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                    outputEOS = true
                }
                
                // If we have valid output, copy it
                if (bufferInfo.size > 0) {
                    val outputBuffer = decoder.getOutputBuffer(outputBufferId)
                    if (outputBuffer != null) {
                        val data = ByteArray(bufferInfo.size)
                        outputBuffer.position(bufferInfo.offset)
                        outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                        outputBuffer.get(data)
                        outputBuffers.add(data)
                    }
                }
                
                decoder.releaseOutputBuffer(outputBufferId, false)
            }
        }
        
        // Combine all output chunks into a single byte array
        val totalSize = outputBuffers.sumOf { it.size }
        val result = ByteArray(totalSize)
        var offset = 0
        
        for (buffer in outputBuffers) {
            System.arraycopy(buffer, 0, result, offset, buffer.size)
            offset += buffer.size
        }
        
        Log.i(TAG, "Decoded ${result.size} bytes of PCM audio data")
        return result
    }
    
    /**
     * Convert multi-channel audio to mono by averaging all channels
     */
    private fun convertToMono(input: ByteArray, channels: Int): ByteArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val samplesPerFrame = channels
        val bytesPerFrame = bytesPerSample * samplesPerFrame
        val frameCount = input.size / bytesPerFrame
        
        val output = ByteArray(frameCount * bytesPerSample)
        
        for (i in 0 until frameCount) {
            var sum = 0L
            
            // Average all channels
            for (c in 0 until channels) {
                val offset = i * bytesPerFrame + c * bytesPerSample
                // Read 16-bit sample (little endian)
                val sample = (input[offset].toInt() and 0xFF) or
                             ((input[offset + 1].toInt() and 0xFF) shl 8)
                sum += sample
            }
            
            // Calculate the average
            val average = (sum / channels).toInt()
            
            // Write back the mono sample (little endian)
            val outOffset = i * bytesPerSample
            output[outOffset] = (average and 0xFF).toByte()
            output[outOffset + 1] = ((average shr 8) and 0xFF).toByte()
        }
        
        return output
    }
    
    /**
     * Convert a PCM byte array to float array with values in range [-1.0, 1.0]
     */
    private fun byteArrayToFloatArray(input: ByteArray): FloatArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val sampleCount = input.size / bytesPerSample
        val output = FloatArray(sampleCount)
        
        for (i in 0 until sampleCount) {
            val offset = i * bytesPerSample
            // Read 16-bit sample (little endian)
            val sample = (input[offset].toInt() and 0xFF) or
                         ((input[offset + 1].toInt() and 0xFF) shl 8)
            
            // Convert to signed value
            val signedSample = if (sample >= 32768) sample - 65536 else sample
            
            // Normalize to [-1.0, 1.0]
            output[i] = signedSample / 32768f
        }
        
        return output
    }

    /**
     * Process and compute audio samples in one call - safer implementation
     * This creates a dedicated stream for each operation and cleans up properly
     */
    @ReactMethod
    fun processAndComputeAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        if (audioTagging == null) {
            promise.reject("ERR_NOT_INITIALIZED", "AudioTagging is not initialized")
            return
        }
        
        executor.execute {
            try {
                // Convert ReadableArray to FloatArray with safety checks
                val size = audioBuffer.size()
                if (size <= 0) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Empty audio buffer provided")
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                Log.i(TAG, "Processing ${size} audio samples at ${sampleRate}Hz in combined operation")
                
                // Create a local temporary stream for this operation ONLY
                var tempStream: OfflineStream? = null
                
                try {
                    // Convert buffer to FloatArray
                    val samples = FloatArray(size)
                    for (i in 0 until size) {
                        samples[i] = audioBuffer.getDouble(i).toFloat()
                    }
                    
                    // Create a new local stream for this operation
                    tempStream = audioTagging?.createStream()
                    
                    if (tempStream == null) {
                        throw Exception("Failed to create audio stream")
                    }
                    
                    // Feed the samples to the local stream
                    tempStream.acceptWaveform(samples, sampleRate)
                    
                    // Compute the results with safety checks
                    val startTime = System.currentTimeMillis()
                    val events = try {
                        audioTagging?.compute(tempStream, -1) ?: ArrayList()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in native compute call: ${e.message}")
                        e.printStackTrace()
                        ArrayList() // Return empty list on error
                    }
                    val endTime = System.currentTimeMillis()
                    
                    Log.i(TAG, "Computed audio tagging in ${endTime - startTime}ms, found ${events.size} events")
                    
                    // Convert results to JS
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    resultMap.putInt("durationMs", (endTime - startTime).toInt())
                    
                    val eventsArray = Arguments.createArray()
                    for (event in events) {
                        val eventMap = Arguments.createMap()
                        eventMap.putString("name", event.name ?: "unknown")
                        eventMap.putInt("index", event.index)
                        eventMap.putDouble("probability", event.prob.toDouble())
                        eventsArray.pushMap(eventMap)
                    }
                    resultMap.putArray("events", eventsArray)
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing audio data: ${e.message}")
                    throw e
                } finally {
                    // Always release the temporary stream, even on error
                    try {
                        // Make sure to null the reference first
                        val streamRef = tempStream
                        tempStream = null
                        
                        // Then release it safely
                        streamRef?.release()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error releasing temporary stream: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in processAndComputeAudioSamples: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PROCESS_AND_COMPUTE", "Failed to process and compute audio tagging for samples: ${e.message}")
                }
            }
        }
    }

}