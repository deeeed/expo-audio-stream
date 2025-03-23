package net.siteed.sherpaonnx

import androidx.annotation.NonNull
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.turbomodule.core.interfaces.TurboModule

interface SherpaOnnxTurboModuleSpec : TurboModule {
    // Initialize the speech recognition system with configuration
    fun initialize(@NonNull config: ReadableMap, @NonNull promise: Promise)
    
    // Recognize speech from a file path
    fun recognizeFile(@NonNull filePath: String, @NonNull options: ReadableMap, @NonNull promise: Promise)
    
    // Recognize speech from audio data
    fun recognize(@NonNull audioData: ReadableArray, @NonNull options: ReadableMap, @NonNull promise: Promise)
    
    // Text to speech synthesis
    fun synthesize(@NonNull text: String, @NonNull options: ReadableMap, @NonNull promise: Promise)
    
    // Start streaming recognition
    fun startStreaming(@NonNull options: ReadableMap, @NonNull promise: Promise)
    
    // Feed audio content to the streaming recognition
    fun feedAudioContent(@NonNull audioData: ReadableArray, @NonNull promise: Promise)
    
    // Stop streaming recognition
    fun stopStreaming(@NonNull promise: Promise)
    
    // Release resources
    fun release(@NonNull promise: Promise)
    
    // Get available voices for TTS
    fun getAvailableVoices(@NonNull promise: Promise)
    
    // Check if a feature is supported
    fun isFeatureSupported(@NonNull feature: String, @NonNull promise: Promise)
    
    // Low-level methods for direct API access
    fun createRecognizer(@NonNull config: ReadableMap, @NonNull promise: Promise)
    fun createStream(recognizerId: Int, @NonNull hotwords: String, @NonNull promise: Promise)
    fun acceptWaveform(streamId: Int, @NonNull samples: ReadableArray, sampleRate: Int, @NonNull promise: Promise)
    fun decode(recognizerId: Int, streamId: Int, @NonNull promise: Promise)
    fun isReady(recognizerId: Int, streamId: Int, @NonNull promise: Promise)
    fun isEndpoint(recognizerId: Int, streamId: Int, @NonNull promise: Promise)
    fun getResult(recognizerId: Int, streamId: Int, @NonNull promise: Promise)
    fun reset(recognizerId: Int, streamId: Int, @NonNull promise: Promise)
    fun releaseStream(streamId: Int, @NonNull promise: Promise)
    fun releaseRecognizer(recognizerId: Int, @NonNull promise: Promise)
} 