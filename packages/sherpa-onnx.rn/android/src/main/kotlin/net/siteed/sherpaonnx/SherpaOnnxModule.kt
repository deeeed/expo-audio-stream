package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.util.Log
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.*
import java.io.File

class SherpaOnnxModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SherpaOnnxModule"
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val DEFAULT_FEATURE_DIM = 80
    }

    override fun getName() = "SherpaOnnx"

    // Keep track of created recognizers and streams
    private val recognizers = mutableMapOf<Int, OnlineRecognizer>()
    private val streams = mutableMapOf<Int, OnlineStream>()
    private var nextRecognizerId = 1
    private var nextStreamId = 1

    // Current model config for high-level API
    private var currentConfig: ReadableMap? = null
    private var currentRecognizerId: Int = -1

    // Feature config mapping
    private fun createFeatureConfigFromMap(map: ReadableMap): FeatureConfig {
        val sampleRate = if (map.hasKey("sampleRate")) map.getInt("sampleRate") else DEFAULT_SAMPLE_RATE
        val featureDim = if (map.hasKey("featureDim")) map.getInt("featureDim") else DEFAULT_FEATURE_DIM

        return FeatureConfig().apply {
            this.sampleRate = sampleRate
            this.featureDim = featureDim
        }
    }

    // Decode model config from JS
    private fun createModelConfigFromMap(map: ReadableMap): OnlineModelConfig {
        val modelConfig = OnlineModelConfig()

        if (map.hasKey("modelType")) {
            when (map.getString("modelType")) {
                "transducer" -> {
                    if (map.hasKey("transducer")) {
                        val transducerConfig = map.getMap("transducer")
                        modelConfig.transducer.encoder = transducerConfig?.getString("encoder") ?: ""
                        modelConfig.transducer.decoder = transducerConfig?.getString("decoder") ?: ""
                        modelConfig.transducer.joiner = transducerConfig?.getString("joiner") ?: ""
                    }
                }
                "paraformer" -> {
                    if (map.hasKey("paraformer")) {
                        val paraformerConfig = map.getMap("paraformer")
                        modelConfig.paraformer.encoder = paraformerConfig?.getString("encoder") ?: ""
                        modelConfig.paraformer.decoder = paraformerConfig?.getString("decoder") ?: ""
                    }
                }
                "zipformer2Ctc" -> {
                    if (map.hasKey("zipformer2Ctc")) {
                        val zipformerConfig = map.getMap("zipformer2Ctc")
                        modelConfig.zipformer2Ctc.model = zipformerConfig?.getString("model") ?: ""
                    }
                }
                "nemoCtc" -> {
                    if (map.hasKey("nemoCtc")) {
                        val nemoConfig = map.getMap("nemoCtc")
                        modelConfig.nemoCtc.model = nemoConfig?.getString("model") ?: ""
                    }
                }
            }
        }

        if (map.hasKey("tokens")) {
            modelConfig.tokens = map.getString("tokens") ?: ""
        }

        if (map.hasKey("numThreads")) {
            modelConfig.numThreads = map.getInt("numThreads")
        }

        if (map.hasKey("provider")) {
            modelConfig.provider = map.getString("provider") ?: "cpu"
        }

        if (map.hasKey("decodingMethod")) {
            modelConfig.decodingMethod = map.getString("decodingMethod") ?: "greedy_search"
        }

        if (map.hasKey("maxActivePaths")) {
            modelConfig.maxActivePaths = map.getInt("maxActivePaths")
        }

        return modelConfig
    }

    // Decode endpoint config from JS
    private fun createEndpointConfigFromMap(map: ReadableMap?): EndpointConfig {
        val endpointConfig = EndpointConfig()

        map?.let { config ->
            if (config.hasKey("rule1")) {
                val rule1 = config.getMap("rule1")
                rule1?.let {
                    if (it.hasKey("mustContainNonSilence")) {
                        endpointConfig.rule1.mustContainNonSilence = it.getBoolean("mustContainNonSilence")
                    }
                    if (it.hasKey("minTrailingSilence")) {
                        endpointConfig.rule1.minTrailingSilence = it.getDouble("minTrailingSilence").toFloat()
                    }
                    if (it.hasKey("minUtteranceLength")) {
                        endpointConfig.rule1.minUtteranceLength = it.getDouble("minUtteranceLength").toFloat()
                    }
                }
            }

            if (config.hasKey("rule2")) {
                val rule2 = config.getMap("rule2")
                rule2?.let {
                    if (it.hasKey("mustContainNonSilence")) {
                        endpointConfig.rule2.mustContainNonSilence = it.getBoolean("mustContainNonSilence")
                    }
                    if (it.hasKey("minTrailingSilence")) {
                        endpointConfig.rule2.minTrailingSilence = it.getDouble("minTrailingSilence").toFloat()
                    }
                    if (it.hasKey("minUtteranceLength")) {
                        endpointConfig.rule2.minUtteranceLength = it.getDouble("minUtteranceLength").toFloat()
                    }
                }
            }

            if (config.hasKey("rule3")) {
                val rule3 = config.getMap("rule3")
                rule3?.let {
                    if (it.hasKey("mustContainNonSilence")) {
                        endpointConfig.rule3.mustContainNonSilence = it.getBoolean("mustContainNonSilence")
                    }
                    if (it.hasKey("minTrailingSilence")) {
                        endpointConfig.rule3.minTrailingSilence = it.getDouble("minTrailingSilence").toFloat()
                    }
                    if (it.hasKey("minUtteranceLength")) {
                        endpointConfig.rule3.minUtteranceLength = it.getDouble("minUtteranceLength").toFloat()
                    }
                }
            }
        }

        return endpointConfig
    }

    // Convert Recognition Result to React Native map
    private fun recognitionResultToMap(result: OnlineRecognizerResult): WritableMap {
        val resultMap = Arguments.createMap()
        resultMap.putString("text", result.text)

        val tokensArray = Arguments.createArray()
        result.tokens.forEach { tokensArray.pushString(it) }
        resultMap.putArray("tokens", tokensArray)

        val timestampsArray = Arguments.createArray()
        result.timestamps.forEach { timestampsArray.pushDouble(it.toDouble()) }
        resultMap.putArray("timestamps", timestampsArray)

        return resultMap
    }

    // High-level API methods that match the JavaScript API

    @ReactMethod
    fun initialize(config: ReadableMap, promise: Promise) {
        try {
            // Save config for later use
            currentConfig = config
            
            // Create a recognizer
            val featureConfig = createFeatureConfigFromMap(config)
            val modelConfig = createModelConfigFromMap(config)
            
            // For simplicity, we'll enable endpoint detection by default
            val enableEndpoint = config.hasKey("enableEndpoint") && config.getBoolean("enableEndpoint")
            val endpointConfig = if (config.hasKey("endpointConfig")) {
                createEndpointConfigFromMap(config.getMap("endpointConfig"))
            } else {
                EndpointConfig()
            }
            
            val recognizer = OnlineRecognizer(featureConfig, modelConfig, endpointConfig, enableEndpoint)
            val recognizerId = nextRecognizerId++
            recognizers[recognizerId] = recognizer
            currentRecognizerId = recognizerId
            
            Log.d(TAG, "Initialized recognizer with ID: $recognizerId")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize: ${e.message}")
            promise.reject("INIT_ERROR", "Failed to initialize SherpaOnnx: ${e.message}", e)
        }
    }

    @ReactMethod
    fun recognizeFile(filePath: String, options: ReadableMap, promise: Promise) {
        if (currentRecognizerId < 0) {
            promise.reject("NOT_INITIALIZED", "SherpaOnnx is not initialized")
            return
        }

        try {
            val recognizer = recognizers[currentRecognizerId]
                ?: throw Exception("Recognizer not found")
                
            // TODO: Implement file recognition
            // This is a placeholder for file-based recognition
            // For now, just return an empty result
            val resultMap = Arguments.createMap()
            resultMap.putString("text", "File recognition not implemented yet")
            promise.resolve(resultMap)
        } catch (e: Exception) {
            Log.e(TAG, "recognizeFile error: ${e.message}")
            promise.reject("RECOGNIZE_ERROR", "Error recognizing file: ${e.message}", e)
        }
    }

    @ReactMethod
    fun recognize(audioData: ReadableArray, options: ReadableMap, promise: Promise) {
        if (currentRecognizerId < 0) {
            promise.reject("NOT_INITIALIZED", "SherpaOnnx is not initialized")
            return
        }

        try {
            val recognizer = recognizers[currentRecognizerId]
                ?: throw Exception("Recognizer not found")
            
            // Create a stream for this recognition
            val stream = recognizer.createStream()
            
            // Convert JS array to float array
            val samples = FloatArray(audioData.size())
            for (i in 0 until audioData.size()) {
                samples[i] = audioData.getDouble(i).toFloat()
            }
            
            // Process the audio
            stream.acceptWaveform(currentConfig?.getInt("sampleRate") ?: DEFAULT_SAMPLE_RATE, samples)
            recognizer.decode(stream)
            
            // Get the result
            val result = recognizer.getResult(stream)
            val resultMap = recognitionResultToMap(result)
            
            // Clean up
            stream.free()
            
            promise.resolve(resultMap)
        } catch (e: Exception) {
            Log.e(TAG, "recognize error: ${e.message}")
            promise.reject("RECOGNIZE_ERROR", "Error recognizing audio: ${e.message}", e)
        }
    }

    @ReactMethod
    fun synthesize(text: String, options: ReadableMap, promise: Promise) {
        // TTS not implemented yet
        promise.reject("NOT_IMPLEMENTED", "Text-to-speech is not implemented yet")
    }

    // Streaming recognition methods

    private var streamingStreamId: Int = -1

    @ReactMethod
    fun startStreaming(options: ReadableMap, promise: Promise) {
        if (currentRecognizerId < 0) {
            promise.reject("NOT_INITIALIZED", "SherpaOnnx is not initialized")
            return
        }

        try {
            val recognizer = recognizers[currentRecognizerId]
                ?: throw Exception("Recognizer not found")
            
            // Create a stream for streaming recognition
            val stream = recognizer.createStream()
            val streamId = nextStreamId++
            streams[streamId] = stream
            streamingStreamId = streamId
            
            Log.d(TAG, "Started streaming with stream ID: $streamId")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "startStreaming error: ${e.message}")
            promise.reject("STREAMING_ERROR", "Error starting streaming: ${e.message}", e)
        }
    }

    @ReactMethod
    fun feedAudioContent(audioData: ReadableArray, promise: Promise) {
        if (streamingStreamId < 0) {
            promise.reject("NOT_STREAMING", "Streaming has not been started")
            return
        }

        try {
            val stream = streams[streamingStreamId]
                ?: throw Exception("Stream not found")
            val recognizer = recognizers[currentRecognizerId]
                ?: throw Exception("Recognizer not found")
            
            // Convert JS array to float array
            val samples = FloatArray(audioData.size())
            for (i in 0 until audioData.size()) {
                samples[i] = audioData.getDouble(i).toFloat()
            }
            
            // Process the audio
            stream.acceptWaveform(currentConfig?.getInt("sampleRate") ?: DEFAULT_SAMPLE_RATE, samples)
            recognizer.decode(stream)
            
            // Get the result
            val result = recognizer.getResult(stream)
            val resultMap = recognitionResultToMap(result)
            
            promise.resolve(resultMap)
        } catch (e: Exception) {
            Log.e(TAG, "feedAudioContent error: ${e.message}")
            promise.reject("STREAMING_ERROR", "Error feeding audio content: ${e.message}", e)
        }
    }

    @ReactMethod
    fun stopStreaming(promise: Promise) {
        if (streamingStreamId < 0) {
            promise.reject("NOT_STREAMING", "Streaming has not been started")
            return
        }

        try {
            val stream = streams[streamingStreamId]
                ?: throw Exception("Stream not found")
            val recognizer = recognizers[currentRecognizerId]
                ?: throw Exception("Recognizer not found")
            
            // Flush the stream and get final result
            recognizer.decode(stream)
            val result = recognizer.getResult(stream)
            val resultMap = recognitionResultToMap(result)
            
            // Clean up
            stream.free()
            streams.remove(streamingStreamId)
            streamingStreamId = -1
            
            promise.resolve(resultMap)
        } catch (e: Exception) {
            Log.e(TAG, "stopStreaming error: ${e.message}")
            promise.reject("STREAMING_ERROR", "Error stopping streaming: ${e.message}", e)
        }
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            // Clean up all streams
            for (stream in streams.values) {
                try {
                    stream.free()
                } catch (e: Exception) {
                    Log.e(TAG, "Error freeing stream: ${e.message}")
                }
            }
            streams.clear()
            
            // Clean up all recognizers
            for (recognizer in recognizers.values) {
                try {
                    recognizer.free()
                } catch (e: Exception) {
                    Log.e(TAG, "Error freeing recognizer: ${e.message}")
                }
            }
            recognizers.clear()
            
            // Reset state
            currentRecognizerId = -1
            streamingStreamId = -1
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "release error: ${e.message}")
            promise.reject("RELEASE_ERROR", "Error releasing resources: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getAvailableVoices(promise: Promise) {
        // TTS not implemented yet
        val voices = Arguments.createArray()
        promise.resolve(voices)
    }

    @ReactMethod
    fun isFeatureSupported(feature: String, promise: Promise) {
        when (feature) {
            "stt" -> promise.resolve(true) // STT is supported
            "tts" -> promise.resolve(false) // TTS is not implemented yet
            else -> promise.resolve(false)
        }
    }

    // Low-level API methods that map directly to Sherpa ONNX calls

    @ReactMethod
    fun createRecognizer(config: ReadableMap, promise: Promise) {
        try {
            val featureConfig = createFeatureConfigFromMap(config)
            val modelConfig = createModelConfigFromMap(config)
            
            val enableEndpoint = config.hasKey("enableEndpoint") && config.getBoolean("enableEndpoint")
            val endpointConfig = if (config.hasKey("endpointConfig")) {
                createEndpointConfigFromMap(config.getMap("endpointConfig"))
            } else {
                EndpointConfig()
            }
            
            val recognizer = OnlineRecognizer(featureConfig, modelConfig, endpointConfig, enableEndpoint)
            val recognizerId = nextRecognizerId++
            recognizers[recognizerId] = recognizer
            
            promise.resolve(recognizerId)
        } catch (e: Exception) {
            Log.e(TAG, "createRecognizer error: ${e.message}")
            promise.reject("CREATE_ERROR", "Error creating recognizer: ${e.message}", e)
        }
    }

    @ReactMethod
    fun createStream(recognizerId: Int, hotwords: String, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            
            val stream = recognizer.createStream()
            val streamId = nextStreamId++
            streams[streamId] = stream
            
            promise.resolve(streamId)
        } catch (e: Exception) {
            Log.e(TAG, "createStream error: ${e.message}")
            promise.reject("CREATE_STREAM_ERROR", "Error creating stream: ${e.message}", e)
        }
    }

    @ReactMethod
    fun acceptWaveform(streamId: Int, samples: ReadableArray, sampleRate: Int, promise: Promise) {
        try {
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            // Convert JS array to float array
            val floatSamples = FloatArray(samples.size())
            for (i in 0 until samples.size()) {
                floatSamples[i] = samples.getDouble(i).toFloat()
            }
            
            val result = stream.acceptWaveform(sampleRate, floatSamples)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "acceptWaveform error: ${e.message}")
            promise.reject("ACCEPT_WAVEFORM_ERROR", "Error accepting waveform: ${e.message}", e)
        }
    }

    @ReactMethod
    fun decode(recognizerId: Int, streamId: Int, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            recognizer.decode(stream)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "decode error: ${e.message}")
            promise.reject("DECODE_ERROR", "Error decoding: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isReady(recognizerId: Int, streamId: Int, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            val result = recognizer.isReady(stream)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "isReady error: ${e.message}")
            promise.reject("IS_READY_ERROR", "Error checking ready state: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isEndpoint(recognizerId: Int, streamId: Int, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            val result = recognizer.isEndpoint(stream)
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "isEndpoint error: ${e.message}")
            promise.reject("IS_ENDPOINT_ERROR", "Error checking endpoint: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getResult(recognizerId: Int, streamId: Int, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            val result = recognizer.getResult(stream)
            val resultMap = recognitionResultToMap(result)
            
            promise.resolve(resultMap)
        } catch (e: Exception) {
            Log.e(TAG, "getResult error: ${e.message}")
            promise.reject("GET_RESULT_ERROR", "Error getting result: ${e.message}", e)
        }
    }

    @ReactMethod
    fun reset(recognizerId: Int, streamId: Int, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            stream.reset()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "reset error: ${e.message}")
            promise.reject("RESET_ERROR", "Error resetting stream: ${e.message}", e)
        }
    }

    @ReactMethod
    fun releaseStream(streamId: Int, promise: Promise) {
        try {
            val stream = streams[streamId]
                ?: throw Exception("Stream not found with ID: $streamId")
            
            stream.free()
            streams.remove(streamId)
            
            if (streamingStreamId == streamId) {
                streamingStreamId = -1
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "releaseStream error: ${e.message}")
            promise.reject("RELEASE_STREAM_ERROR", "Error releasing stream: ${e.message}", e)
        }
    }

    @ReactMethod
    fun releaseRecognizer(recognizerId: Int, promise: Promise) {
        try {
            val recognizer = recognizers[recognizerId]
                ?: throw Exception("Recognizer not found with ID: $recognizerId")
            
            // First, release all streams associated with this recognizer
            val streamsToRemove = mutableListOf<Int>()
            for ((id, stream) in streams) {
                try {
                    stream.free()
                    streamsToRemove.add(id)
                } catch (e: Exception) {
                    Log.e(TAG, "Error freeing stream: ${e.message}")
                }
            }
            streamsToRemove.forEach { streams.remove(it) }
            
            // Then release the recognizer
            recognizer.free()
            recognizers.remove(recognizerId)
            
            if (currentRecognizerId == recognizerId) {
                currentRecognizerId = -1
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "releaseRecognizer error: ${e.message}")
            promise.reject("RELEASE_RECOGNIZER_ERROR", "Error releasing recognizer: ${e.message}", e)
        }
    }
} 