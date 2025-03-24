/**
 * SherpaOnnxTtsSupport - High-level interface for sherpa-onnx TTS
 * Uses the JNI bridge in com.k2fsa.sherpa.onnx package
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.util.Log
import java.io.File
import java.io.FileOutputStream

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
        return AudioUtils.saveAsWav(samples, sampleRate, path)
    }
    
    // You can leave the original methods as private if you want to maintain compatibility
    // or you can remove them since AudioUtils now handles this functionality
    // ...
}

/**
 * Callback interface for audio generation
 */
typealias AudioCallback = (FloatArray) -> Int

/**
 * Offline TTS class - Using JNI bridge
 */
class OfflineTts {
    private val tag = "OfflineTts"
    private var nativePtr: Long = 0

    constructor(config: OfflineTtsConfig) {
        try {
            Log.i(tag, "Initializing OfflineTts with file-based config")
            
            // Convert from our config to the JNI config
            val jniConfig = convertToJniConfig(
                modelDir = config.modelDir,
                modelName = config.modelName,
                voices = config.voices,
                // ... other params ...
                numThreads = config.numThreads
            )
            
            // Use newFromFile for file-based initialization
            nativePtr = JniBridge.newFromFile(jniConfig)
            
            if (nativePtr == 0L) {
                Log.e(tag, "Failed to create native TTS engine - returned null pointer")
            } else {
                Log.i(tag, "Native TTS engine created successfully, handle: $nativePtr")
            }
        } catch (e: Throwable) {
            Log.e(tag, "Error initializing native TTS engine: ${e.message}")
            nativePtr = 0L
            throw e
        }
    }

    constructor(assetManager: AssetManager, config: OfflineTtsConfig) : this(config)

    // Add validation method to check if instance is usable
    fun isInitialized(): Boolean {
        return nativePtr != 0L
    }

    fun generate(text: String, sid: Int = 0, speed: Float = 1.0f): OfflineTtsAudio {
        Log.i(tag, "Generating TTS for text: '$text', sid: $sid, speed: $speed")
        
        if (nativePtr == 0L) {
            Log.e(tag, "Native TTS engine not initialized")
            return createEmptyAudio()
        }
        
        return try {
            // Use the JNI bridge to call the native method
            Log.d(tag, "Calling JNI generateImpl with nativePtr=$nativePtr, text='$text', sid=$sid, speed=$speed")
            val result = JniBridge.generateImpl(nativePtr, text, sid, speed)
            
            // Log the result structure
            val samples = result[0] as FloatArray
            val sampleRate = result[1] as Int
            Log.d(tag, "JNI generateImpl returned ${samples.size} samples with sample rate $sampleRate")
            
            // Convert from JNI bridge result to our OfflineTtsAudio
            OfflineTtsAudio(
                samples = samples,
                sampleRate = sampleRate
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
            Log.d(tag, "Calling JNI generateWithCallbackImpl with nativePtr=$nativePtr, text='$text', sid=$sid, speed=$speed")
            val result = JniBridge.generateWithCallbackImpl(nativePtr, text, sid, speed, callback)
            
            // Log the result structure
            val samples = result[0] as FloatArray
            val sampleRate = result[1] as Int
            Log.d(tag, "JNI generateWithCallbackImpl returned ${samples.size} samples with sample rate $sampleRate")
            
            // Convert from JNI bridge result to our OfflineTtsAudio
            OfflineTtsAudio(
                samples = samples,
                sampleRate = sampleRate
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
        Log.d(tag, "Calling JNI getSampleRate with nativePtr=$nativePtr")
        val rate = JniBridge.getSampleRate(nativePtr)
        Log.d(tag, "JNI getSampleRate returned $rate")
        return rate
    }

    fun numSpeakers(): Int {
        if (nativePtr == 0L) {
            return 1 // Default number of speakers
        }
        Log.d(tag, "Calling JNI getNumSpeakers with nativePtr=$nativePtr")
        val speakers = JniBridge.getNumSpeakers(nativePtr)
        Log.d(tag, "JNI getNumSpeakers returned $speakers")
        return speakers
    }

    fun free() {
        Log.i(tag, "Releasing OfflineTts resources")
        if (nativePtr != 0L) {
            Log.d(tag, "Calling JNI delete with nativePtr=$nativePtr")
            JniBridge.delete(nativePtr)
            nativePtr = 0
        }
    }
    
    // Helper function to create empty audio for error cases
    private fun createEmptyAudio(): OfflineTtsAudio {
        Log.w(tag, "Creating empty audio due to error")
        // Use AudioUtils.createEmptyAudio() instead of duplicating the logic
        val (samples, sampleRate) = AudioUtils.createEmptyAudio()
        return OfflineTtsAudio(samples, sampleRate)
    }
    
    companion object {
        // Check if library is loaded
        fun isLoaded(): Boolean {
            return try {
                // Just accessing the JniBridge will load the library
                val version = JniBridge::class.java.name
                Log.i("OfflineTts", "Library loaded successfully: $version")
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
 * With enhanced logging
 */
fun convertToJniConfig(
    modelDir: String,
    modelName: String,
    voices: String,
    acousticModelName: String = "",
    vocoder: String = "",
    lexicon: String = "",
    dataDir: String = "",
    dictDir: String = "",
    ruleFsts: String = "",
    ruleFars: String = "",
    numThreads: Int? = null
): com.k2fsa.sherpa.onnx.OfflineTtsConfig {
    val tag = "SherpaOnnxTtsSupport"
    
    // Debug full input parameters
    Log.i(tag, "=== TTS Config Input Parameters ===")
    Log.i(tag, "Model Directory: '$modelDir'")
    Log.i(tag, "Model Name: '$modelName'")
    Log.i(tag, "Voices: '$voices'")
    Log.i(tag, "Acoustic Model: '$acousticModelName'")
    Log.i(tag, "Vocoder: '$vocoder'")
    Log.i(tag, "Lexicon: '$lexicon'")
    Log.i(tag, "Data Dir: '$dataDir'")
    Log.i(tag, "Dict Dir: '$dictDir'")
    Log.i(tag, "Rule FSTs: '$ruleFsts'")
    Log.i(tag, "Rule FARs: '$ruleFars'")
    Log.i(tag, "Num Threads: ${numThreads ?: "null (will use default)"}")
    
    // Use absolute paths for files
    val modelPath = File(modelDir, modelName).absolutePath
    val voicesPath = File(modelDir, voices).absolutePath
    val tokensPath = File(modelDir, "tokens.txt").absolutePath
    
    // Check for espeak-ng-data directory
    var espeakDataPath = ""
    if (dataDir.isNotEmpty()) {
        espeakDataPath = dataDir
        Log.i(tag, "Using provided dataDir: $espeakDataPath")
    } else {
        // Try to find espeak-ng-data in model directory
        val espeakDir = File(modelDir, "espeak-ng-data")
        if (espeakDir.exists() && espeakDir.isDirectory) {
            espeakDataPath = espeakDir.absolutePath
            Log.i(tag, "Found espeak-ng-data in model directory: $espeakDataPath")
        } else {
            Log.w(tag, "espeak-ng-data directory not found in model directory")
            
            // Try looking in parent directory if this is a versioned subdirectory
            val parentEspeakDir = File(File(modelDir).parentFile, "espeak-ng-data")
            if (parentEspeakDir.exists() && parentEspeakDir.isDirectory) {
                espeakDataPath = parentEspeakDir.absolutePath
                Log.i(tag, "Found espeak-ng-data in parent directory: $espeakDataPath")
            } else {
                Log.w(tag, "espeak-ng-data not found in parent directory either")
            }
        }
    }
    
    // Verify file existence
    Log.i(tag, "=== Verifying File Existence ===")
    val modelFile = File(modelPath)
    Log.i(tag, "Model file exists: ${modelFile.exists()} (${modelFile.length()} bytes)")
    
    val voicesFile = File(voicesPath)
    Log.i(tag, "Voices file exists: ${voicesFile.exists()} (${voicesFile.length()} bytes)")
    
    val tokensFile = File(tokensPath)
    Log.i(tag, "Tokens file exists: ${tokensFile.exists()} (${tokensFile.length()} bytes)")
    
    if (espeakDataPath.isNotEmpty()) {
        val espeakDir = File(espeakDataPath)
        Log.i(tag, "espeak-ng-data directory exists: ${espeakDir.exists()} and is directory: ${espeakDir.isDirectory}")
        
        // Check for key files in espeak-ng-data
        val phontab = File(espeakDir, "phontab")
        val phonindex = File(espeakDir, "phonindex")
        Log.i(tag, "phontab exists: ${phontab.exists()}, phonindex exists: ${phonindex.exists()}")
    }

    // Create kokoro config
    val kokoroConfig = com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig(
        model = modelPath,
        voices = voicesPath,
        tokens = tokensPath,
        dataDir = espeakDataPath,
        lexicon = lexicon,
        dictDir = dictDir,
        lengthScale = 1.0f
    )
    
    // Log complete config for debugging
    Log.i(tag, "=== Final Kokoro Config ===")
    Log.i(tag, "model = ${kokoroConfig.model}")
    Log.i(tag, "voices = ${kokoroConfig.voices}")
    Log.i(tag, "tokens = ${kokoroConfig.tokens}")
    Log.i(tag, "dataDir = ${kokoroConfig.dataDir}")
    Log.i(tag, "lexicon = ${kokoroConfig.lexicon}")
    Log.i(tag, "dictDir = ${kokoroConfig.dictDir}")
    
    // Create the full config
    val finalConfig = com.k2fsa.sherpa.onnx.OfflineTtsConfig(
        model = com.k2fsa.sherpa.onnx.OfflineTtsModelConfig(
            kokoro = kokoroConfig,
            numThreads = numThreads ?: 2,
            debug = true,
            provider = "cpu"
        ),
        ruleFsts = ruleFsts,
        ruleFars = ruleFars
    )
    
    Log.i(tag, "Configuration complete")
    return finalConfig
}

// Add a helper method to check if a file exists in assets
private fun assetExists(path: String, assetManager: AssetManager? = null): Boolean {
    // This is just a declaration - implementation would be similar to the one in SherpaOnnxModule
    // You'll need to implement or refer to the existing implementation
    return false  // Placeholder
} 