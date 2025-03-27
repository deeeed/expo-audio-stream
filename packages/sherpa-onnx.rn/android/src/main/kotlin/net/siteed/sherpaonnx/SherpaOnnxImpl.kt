package net.siteed.sherpaonnx

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

import com.k2fsa.sherpa.onnx.OnlineStream

// Import the handlers
import net.siteed.sherpaonnx.handlers.ASRHandler
import net.siteed.sherpaonnx.handlers.ArchiveHandler
import net.siteed.sherpaonnx.handlers.AudioTaggingHandler
import net.siteed.sherpaonnx.handlers.SpeakerIdHandler
import net.siteed.sherpaonnx.handlers.TtsHandler

class SherpaOnnxImpl(reactContext: ReactApplicationContext) {
    // Feature handlers
    private val ttsHandler = TtsHandler(reactContext)
    private val audioTaggingHandler = AudioTaggingHandler(reactContext)
    private val archiveHandler = ArchiveHandler(reactContext)
    private val asrHandler = ASRHandler(reactContext)
    private val speakerIdHandler = SpeakerIdHandler(reactContext)

    companion object {
        private const val TAG = "SherpaOnnxImpl"
        var isLibraryLoaded = false

        init {
            try {
                System.loadLibrary("sherpa-onnx-jni")
                isLibraryLoaded = true
                Log.i(TAG, "Sherpa ONNX JNI library is available")
                
                try {
                    Class.forName("org.apache.commons.compress.archivers.tar.TarArchiveInputStream")
                    Log.i(TAG, "Apache Commons Compress library is available")
                } catch (e: ClassNotFoundException) {
                    Log.e(TAG, "Failed to load Apache Commons Compress: ${e.message}")
                    isLibraryLoaded = false
                }
            } catch (e: UnsatisfiedLinkError) {
                isLibraryLoaded = false
                Log.e(TAG, "Failed to load Sherpa ONNX JNI library", e)
            }
        }
    }

    // TTS Methods
    fun initTts(config: ReadableMap, promise: Promise) {
        ttsHandler.init(config, promise)
    }
    
    fun generateTts(config: ReadableMap, promise: Promise) {
        ttsHandler.generate(config, promise)
    }
    
    fun stopTts(promise: Promise) {
        ttsHandler.stop(promise)
    }
    
    fun releaseTts(promise: Promise) {
        ttsHandler.release(promise)
    }

    // ASR Methods
    fun initAsr(config: ReadableMap, promise: Promise) {
        asrHandler.init(config, promise)
    }

    fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        asrHandler.recognizeFromSamples(sampleRate, audioBuffer, promise)
    }

    fun recognizeFromFile(filePath: String, promise: Promise) {
        asrHandler.recognizeFromFile(filePath, promise)
    }

    fun releaseAsr(promise: Promise) {
        asrHandler.release(promise)
    }

    // Audio Tagging Methods
    fun initAudioTagging(config: ReadableMap, promise: Promise) {
        audioTaggingHandler.init(config, promise)
    }
    
    fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        audioTaggingHandler.processAudioSamples(sampleRate, audioBuffer, promise)
    }
    
    fun computeAudioTagging(promise: Promise) {
        audioTaggingHandler.computeAudioTagging(promise)
    }
    
    fun releaseAudioTagging(promise: Promise) {
        audioTaggingHandler.release(promise)
    }
    
    fun processAndComputeAudioTagging(filePath: String, promise: Promise) {
        audioTaggingHandler.processAndComputeAudioTagging(filePath, promise)
    }
    
    fun processAudioFile(filePath: String, promise: Promise) {
        audioTaggingHandler.processAudioFile(filePath, promise)
    }

    // Speaker ID Methods
    fun initSpeakerId(config: ReadableMap, promise: Promise) {
        speakerIdHandler.init(config, promise)
    }
    
    fun processSpeakerIdSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        speakerIdHandler.processAudioSamples(sampleRate, audioBuffer, promise)
    }
    
    fun computeSpeakerEmbedding(promise: Promise) {
        speakerIdHandler.computeEmbedding(promise)
    }
    
    fun registerSpeaker(name: String, embedding: ReadableArray, promise: Promise) {
        speakerIdHandler.registerSpeaker(name, embedding, promise)
    }
    
    fun removeSpeaker(name: String, promise: Promise) {
        speakerIdHandler.removeSpeaker(name, promise)
    }
    
    fun getSpeakers(promise: Promise) {
        speakerIdHandler.getSpeakers(promise)
    }
    
    fun identifySpeaker(embedding: ReadableArray, threshold: Float, promise: Promise) {
        speakerIdHandler.identifySpeaker(embedding, threshold, promise)
    }
    
    fun verifySpeaker(name: String, embedding: ReadableArray, threshold: Float, promise: Promise) {
        speakerIdHandler.verifySpeaker(name, embedding, threshold, promise)
    }
    
    fun processSpeakerIdFile(filePath: String, promise: Promise) {
        speakerIdHandler.processAudioFile(filePath, promise)
    }
    
    fun releaseSpeakerId(promise: Promise) {
        speakerIdHandler.release(promise)
    }

    // Utility Methods
    fun extractTarBz2(sourcePath: String, targetDir: String, promise: Promise) {
        archiveHandler.extractTarBz2(sourcePath, targetDir, promise)
    }

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

    fun testOnnxIntegration(promise: Promise) {
        try {
            // Test JNI communication by creating a simple stream
            val stream = OnlineStream()
            stream.release()
            
            val response = Arguments.createMap().apply {
                putString("status", "C library integration successful")
                putBoolean("success", true)
            }
            
            promise.resolve(response)
        } catch (e: Exception) {
            val response = Arguments.createMap().apply {
                putString("status", "C library integration failed: ${e.message}")
                putBoolean("success", false)
            }
            promise.resolve(response)  // Still resolve but with error info
        }
    }
} 