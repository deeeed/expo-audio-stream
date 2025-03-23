/**
 * SherpaOnnxTtsSupport - High-level interface for sherpa-onnx TTS
 * Uses the JNI bridge in com.k2fsa.sherpa.onnx package
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import kotlin.math.min

// Import the JNI bridge
import com.k2fsa.sherpa.onnx.OfflineTts as JniBridge
import com.k2fsa.sherpa.onnx.OfflineTtsAudio as JniAudio

/**
 * Configuration for Offline TTS - for React Native interface
 * This is different from the bridge config
 */
data class OfflineTtsConfig(
    val modelDir: String = "",
    val modelName: String = "",
    val acousticModelName: String = "",
    val vocoder: String = "",
    val voices: String = "",
    val lexicon: String = "",
    val dataDir: String = "",
    val dictDir: String = "",
    val ruleFsts: String = "",
    val ruleFars: String = "",
    val numThreads: Int? = null
)

/**
 * Audio data class
 */
class OfflineTtsAudio(
    val samples: FloatArray,
    val sampleRate: Int
) {
    fun save(path: String): Boolean {
        return try {
            Log.i(TAG, "Saving audio to $path")
            
            // Create the parent directory if it doesn't exist
            val file = File(path)
            file.parentFile?.mkdirs()
            
            // Create FileOutputStream to write the WAV file
            val outputStream = FileOutputStream(file)
            
            // Calculate sizes for WAV header
            val numChannels = 1 // Mono
            val bitsPerSample = 16 // 16-bit audio
            val byteRate = sampleRate * numChannels * (bitsPerSample / 8)
            val blockAlign = numChannels * (bitsPerSample / 8)
            val dataSize = samples.size * (bitsPerSample / 8)
            val totalSize = 36 + dataSize
            
            // Write WAV header - RIFF chunk
            outputStream.write("RIFF".toByteArray()) // ChunkID
            writeInt(outputStream, totalSize) // ChunkSize
            outputStream.write("WAVE".toByteArray()) // Format
            
            // Write WAV header - fmt subchunk
            outputStream.write("fmt ".toByteArray()) // Subchunk1ID
            writeInt(outputStream, 16) // Subchunk1Size (PCM)
            writeShort(outputStream, 1) // AudioFormat (1 = PCM)
            writeShort(outputStream, numChannels) // NumChannels
            writeInt(outputStream, sampleRate) // SampleRate
            writeInt(outputStream, byteRate) // ByteRate
            writeShort(outputStream, blockAlign) // BlockAlign
            writeShort(outputStream, bitsPerSample) // BitsPerSample
            
            // Write WAV header - data subchunk
            outputStream.write("data".toByteArray()) // Subchunk2ID
            writeInt(outputStream, dataSize) // Subchunk2Size
            
            // Write the audio data (convert float to 16-bit PCM)
            for (sample in samples) {
                // Convert float (-1.0 to 1.0) to 16-bit PCM
                val pcmValue = (sample * 32767f).toInt().coerceIn(-32768, 32767).toShort()
                writeShort(outputStream, pcmValue.toInt())
            }
            
            outputStream.close()
            Log.i(TAG, "Audio saved successfully")
            
            // Validate file exists and has appropriate size
            val savedFile = File(path)
            if (savedFile.exists()) {
                Log.i(TAG, "File exists, size: ${savedFile.length()} bytes")
            } else {
                Log.e(TAG, "File was not created at $path")
            }
            
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save audio: ${e.message}")
            e.printStackTrace()
            false
        }
    }
    
    // Helper function to write an integer in little-endian format
    private fun writeInt(output: FileOutputStream, value: Int) {
        output.write(value and 0xFF)
        output.write((value shr 8) and 0xFF)
        output.write((value shr 16) and 0xFF)
        output.write((value shr 24) and 0xFF)
    }
    
    // Helper function to write a short in little-endian format
    private fun writeShort(output: FileOutputStream, value: Int) {
        output.write(value and 0xFF)
        output.write((value shr 8) and 0xFF)
    }
    
    companion object {
        private const val TAG = "OfflineTtsAudio"
    }
}

/**
 * Callback interface for audio generation
 */
typealias AudioCallback = (FloatArray) -> Int

/**
 * Offline TTS class - Using JNI bridge
 */
class OfflineTts(
    private val assetManager: AssetManager,
    private val config: OfflineTtsConfig
) {
    private val tag = "OfflineTts"
    private var nativePtr: Long = 0

    init {
        try {
            Log.i(tag, "Successfully loaded sherpa-onnx-jni library")
            Log.i(tag, "Initializing OfflineTts with config: $config")
            
            // Convert from our config to the JNI config
            val jniConfig = convertToJniConfig(
                modelDir = config.modelDir,
                modelName = config.modelName,
                acousticModelName = config.acousticModelName,
                vocoder = config.vocoder,
                voices = config.voices,
                lexicon = config.lexicon,
                dataDir = config.dataDir,
                dictDir = config.dictDir,
                ruleFsts = config.ruleFsts,
                ruleFars = config.ruleFars,
                numThreads = config.numThreads
            )
            
            // Use JniBridge with the config object
            nativePtr = JniBridge.newFromAsset(
                assetManager,
                jniConfig
            )
            
            if (nativePtr == 0L) {
                Log.e(tag, "Failed to create native TTS engine")
            } else {
                Log.i(tag, "Native TTS engine created successfully, handle: $nativePtr")
            }
        } catch (e: Exception) {
            Log.e(tag, "Error initializing native TTS engine: ${e.message}")
            e.printStackTrace()
        }
    }

    fun generate(text: String, sid: Int = 0, speed: Float = 1.0f): OfflineTtsAudio {
        Log.i(tag, "Generating TTS for text: '$text', sid: $sid, speed: $speed")
        
        if (nativePtr == 0L) {
            Log.e(tag, "Native TTS engine not initialized")
            return createEmptyAudio()
        }
        
        return try {
            // Use the JNI bridge to call the native method
            val result = JniBridge.generateImpl(nativePtr, text, sid, speed)
            
            // Convert from JNI bridge result to our OfflineTtsAudio
            OfflineTtsAudio(
                samples = result[0] as FloatArray,
                sampleRate = result[1] as Int
            )
        } catch (e: Exception) {
            Log.e(tag, "Error generating speech: ${e.message}")
            e.printStackTrace()
            createEmptyAudio()
        }
    }

    fun generateWithCallback(
        text: String,
        sid: Int = 0,
        speed: Float = 1.0f,
        callback: AudioCallback
    ): OfflineTtsAudio {
        Log.i(tag, "Generating TTS with callback for text: '$text', sid: $sid, speed: $speed")
        
        if (nativePtr == 0L) {
            Log.e(tag, "Native TTS engine not initialized")
            return createEmptyAudio()
        }
        
        return try {
            // Use the JNI bridge to call the native method
            val result = JniBridge.generateWithCallbackImpl(nativePtr, text, sid, speed, callback)
            
            // Convert from JNI bridge result to our OfflineTtsAudio
            OfflineTtsAudio(
                samples = result[0] as FloatArray,
                sampleRate = result[1] as Int
            )
        } catch (e: Exception) {
            Log.e(tag, "Error generating speech with callback: ${e.message}")
            e.printStackTrace()
            createEmptyAudio()
        }
    }

    fun sampleRate(): Int {
        if (nativePtr == 0L) {
            return 22050 // Default sample rate
        }
        return JniBridge.getSampleRate(nativePtr)
    }

    fun numSpeakers(): Int {
        if (nativePtr == 0L) {
            return 1 // Default number of speakers
        }
        return JniBridge.getNumSpeakers(nativePtr)
    }

    fun free() {
        Log.i(tag, "Releasing OfflineTts resources")
        if (nativePtr != 0L) {
            JniBridge.delete(nativePtr)
            nativePtr = 0
        }
    }
    
    // Helper function to create empty audio for error cases
    private fun createEmptyAudio(): OfflineTtsAudio {
        Log.w(tag, "Creating empty audio due to error")
        // Create small non-zero audio to detect issues
        return OfflineTtsAudio(
            samples = FloatArray(1000) { (it % 100) * 0.01f }, // Simple pattern
            sampleRate = 22050
        )
    }
    
    companion object {
        // Check if library is loaded
        fun isLoaded(): Boolean {
            return try {
                // Just accessing the JniBridge will load the library
                val version = JniBridge::class.java.name
                true
            } catch (e: UnsatisfiedLinkError) {
                Log.e("OfflineTts", "Library not loaded: ${e.message}")
                false
            }
        }
    }
}

/**
 * Helper function to convert from simple config to JNI config
 */
fun convertToJniConfig(
    modelDir: String = "",
    modelName: String = "",
    acousticModelName: String = "",
    vocoder: String = "",
    voices: String = "",
    lexicon: String = "",
    dataDir: String = "",
    dictDir: String = "",
    ruleFsts: String = "",
    ruleFars: String = "",
    numThreads: Int? = null
): com.k2fsa.sherpa.onnx.OfflineTtsConfig {
    // Determine which model type to use
    val numberOfThreads = numThreads ?: if (voices.isNotEmpty()) 4 else 2
    
    // Correct the paths - check if models are in a tts/ subdirectory
    val actualModelDir = if (modelDir.startsWith("tts/")) {
        modelDir
    } else {
        // Check if the model dir is under tts/
        "tts/$modelDir"
    }
    
    Log.d("SherpaOnnxTtsSupport", "Using model directory: $actualModelDir")
    
    // For Kokoro model (with voices file)
    val kokoro = if (voices.isNotEmpty()) {
        com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig(
            model = "$actualModelDir/$modelName",
            voices = "$actualModelDir/$voices",
            tokens = "$actualModelDir/tokens.txt",
            dataDir = dataDir,
            lexicon = when {
                lexicon.isEmpty() -> lexicon
                lexicon.contains(",") -> lexicon
                else -> "$actualModelDir/$lexicon"
            },
            dictDir = dictDir
        )
    } else {
        com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig()
    }
    
    // For Matcha model (with acoustic model and vocoder)
    val matcha = if (acousticModelName.isNotEmpty()) {
        com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig(
            acousticModel = "$actualModelDir/$acousticModelName",
            vocoder = vocoder,
            lexicon = "$actualModelDir/$lexicon",
            tokens = "$actualModelDir/tokens.txt",
            dataDir = dataDir,
            dictDir = dictDir
        )
    } else {
        com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig()
    }
    
    // For VITS model (just model name, no voices)
    val vits = if (modelName.isNotEmpty() && voices.isEmpty() && acousticModelName.isEmpty()) {
        com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig(
            model = "$actualModelDir/$modelName",
            lexicon = "$actualModelDir/$lexicon",
            tokens = "$actualModelDir/tokens.txt",
            dataDir = dataDir,
            dictDir = dictDir
        )
    } else {
        com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig()
    }
    
    // Log the final configuration for debugging
    val config = com.k2fsa.sherpa.onnx.OfflineTtsConfig(
        model = com.k2fsa.sherpa.onnx.OfflineTtsModelConfig(
            vits = vits,
            matcha = matcha,
            kokoro = kokoro,
            numThreads = numberOfThreads,
            debug = true,
            provider = "cpu"
        ),
        ruleFsts = ruleFsts,
        ruleFars = ruleFars
    )
    
    Log.d("SherpaOnnxTtsSupport", "JNI Config: $config")
    
    return config
} 