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
            Log.d(tag, "Calling JNI newFromAsset with asset manager and config")
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
    // Log all input parameters for debugging
    Log.d("SherpaOnnxTtsSupport", "Convert to JNI config with parameters:")
    Log.d("SherpaOnnxTtsSupport", "  modelDir: $modelDir")
    Log.d("SherpaOnnxTtsSupport", "  modelName: $modelName")
    Log.d("SherpaOnnxTtsSupport", "  acousticModelName: $acousticModelName")
    Log.d("SherpaOnnxTtsSupport", "  vocoder: $vocoder")
    Log.d("SherpaOnnxTtsSupport", "  voices: $voices")
    Log.d("SherpaOnnxTtsSupport", "  lexicon: $lexicon")
    Log.d("SherpaOnnxTtsSupport", "  dataDir: $dataDir")
    Log.d("SherpaOnnxTtsSupport", "  dictDir: $dictDir")
    Log.d("SherpaOnnxTtsSupport", "  ruleFsts: $ruleFsts")
    Log.d("SherpaOnnxTtsSupport", "  ruleFars: $ruleFars")
    Log.d("SherpaOnnxTtsSupport", "  numThreads: $numThreads")
    
    // Determine which model type to use
    val numberOfThreads = numThreads ?: if (voices.isNotEmpty()) 4 else 2
    Log.d("SherpaOnnxTtsSupport", "Using $numberOfThreads threads")
    
    // Determine model type
    val modelType = when {
        voices.isNotEmpty() -> "Kokoro"
        acousticModelName.isNotEmpty() -> "Matcha"
        modelName.isNotEmpty() -> "VITS"
        else -> "Unknown"
    }
    Log.d("SherpaOnnxTtsSupport", "Detected model type: $modelType")
    
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
        val kokoroConfig = com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig(
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
        
        Log.d("SherpaOnnxTtsSupport", "Created Kokoro config with model=${kokoroConfig.model}, voices=${kokoroConfig.voices}, tokens=${kokoroConfig.tokens}")
        Log.d("SherpaOnnxTtsSupport", "Kokoro lexicon=${kokoroConfig.lexicon}, dataDir=${kokoroConfig.dataDir}, dictDir=${kokoroConfig.dictDir}")
        
        kokoroConfig
    } else {
        com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig()
    }
    
    // For Matcha model (with acoustic model and vocoder)
    val matcha = if (acousticModelName.isNotEmpty()) {
        val matchaConfig = com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig(
            acousticModel = "$actualModelDir/$acousticModelName",
            vocoder = vocoder,
            lexicon = "$actualModelDir/$lexicon",
            tokens = "$actualModelDir/tokens.txt",
            dataDir = dataDir,
            dictDir = dictDir
        )
        
        Log.d("SherpaOnnxTtsSupport", "Created Matcha config with acousticModel=${matchaConfig.acousticModel}, vocoder=${matchaConfig.vocoder}")
        Log.d("SherpaOnnxTtsSupport", "Matcha tokens=${matchaConfig.tokens}, lexicon=${matchaConfig.lexicon}")
        Log.d("SherpaOnnxTtsSupport", "Matcha dataDir=${matchaConfig.dataDir}, dictDir=${matchaConfig.dictDir}")
        
        matchaConfig
    } else {
        com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig()
    }
    
    // For VITS model (just model name, no voices)
    val vits = if (modelName.isNotEmpty() && voices.isEmpty() && acousticModelName.isEmpty()) {
        val vitsConfig = com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig(
            model = "$actualModelDir/$modelName",
            lexicon = "$actualModelDir/$lexicon",
            tokens = "$actualModelDir/tokens.txt",
            dataDir = dataDir,
            dictDir = dictDir
        )
        
        Log.d("SherpaOnnxTtsSupport", "Created VITS config with model=${vitsConfig.model}, tokens=${vitsConfig.tokens}")
        Log.d("SherpaOnnxTtsSupport", "VITS lexicon=${vitsConfig.lexicon}, dataDir=${vitsConfig.dataDir}, dictDir=${vitsConfig.dictDir}")
        
        vitsConfig
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
    
    Log.d("SherpaOnnxTtsSupport", "Created JNI Config for $modelType model")
    Log.d("SherpaOnnxTtsSupport", "Final JNI config with provider=${config.model.provider}, threads=${config.model.numThreads}")
    if (ruleFsts.isNotEmpty()) Log.d("SherpaOnnxTtsSupport", "Using ruleFsts: $ruleFsts")
    if (ruleFars.isNotEmpty()) Log.d("SherpaOnnxTtsSupport", "Using ruleFars: $ruleFars")
    
    return config
} 