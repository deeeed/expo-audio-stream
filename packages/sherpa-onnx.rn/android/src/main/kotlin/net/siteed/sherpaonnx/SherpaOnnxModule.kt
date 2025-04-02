/**
 * SherpaOnnxModule - React Native module for sherpa-onnx
 * Supports both old architecture and New Architecture
 */
package net.siteed.sherpaonnx

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

@Suppress("unused")
class SherpaOnnxModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SherpaOnnx"
        var isLibraryLoaded = false
    }

    private val implementation = SherpaOnnxImpl(reactContext)

    override fun getName(): String = NAME

    @ReactMethod
    fun initTts(config: ReadableMap, promise: Promise) {
        implementation.initTts(config, promise)
    }

    @ReactMethod
    fun generateTts(config: ReadableMap, promise: Promise) {
        implementation.generateTts(config, promise)
    }

    @ReactMethod
    fun stopTts(promise: Promise) {
        implementation.stopTts(promise)
    }

    @ReactMethod
    fun releaseTts(promise: Promise) {
        implementation.releaseTts(promise)
    }

    @ReactMethod
    fun initAsr(config: ReadableMap, promise: Promise) {
        implementation.initAsr(config, promise)
    }

    @ReactMethod
    fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        implementation.recognizeFromSamples(sampleRate, audioBuffer, promise)
    }

    @ReactMethod
    fun recognizeFromFile(filePath: String, promise: Promise) {
        implementation.recognizeFromFile(filePath, promise)
    }

    @ReactMethod
    fun releaseAsr(promise: Promise) {
        implementation.releaseAsr(promise)
    }

    @ReactMethod
    fun initAudioTagging(config: ReadableMap, promise: Promise) {
        implementation.initAudioTagging(config, promise)
    }

    @ReactMethod
    fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, topK: Int = -1, promise: Promise) {
        implementation.processAudioSamples(sampleRate, audioBuffer, topK, promise)
    }

    @ReactMethod
    fun computeAudioTagging(topK: Int = -1, promise: Promise) {
        implementation.computeAudioTagging(topK, promise)
    }

    @ReactMethod
    fun processAndComputeAudioTagging(filePath: String, topK: Int = -1, promise: Promise) {
        implementation.processAndComputeAudioTagging(filePath, topK, promise)
    }

    @ReactMethod
    fun processAudioFile(filePath: String, topK: Int = -1, promise: Promise) {
        implementation.processAudioFile(filePath, topK, promise)
    }

    @ReactMethod
    fun releaseAudioTagging(promise: Promise) {
        implementation.releaseAudioTagging(promise)
    }

    @ReactMethod
    fun initSpeakerId(config: ReadableMap, promise: Promise) {
        implementation.initSpeakerId(config, promise)
    }

    @ReactMethod
    fun processSpeakerIdSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        implementation.processSpeakerIdSamples(sampleRate, audioBuffer, promise)
    }

    @ReactMethod
    fun computeSpeakerEmbedding(promise: Promise) {
        implementation.computeSpeakerEmbedding(promise)
    }

    @ReactMethod
    fun registerSpeaker(name: String, embedding: ReadableArray, promise: Promise) {
        implementation.registerSpeaker(name, embedding, promise)
    }

    @ReactMethod
    fun removeSpeaker(name: String, promise: Promise) {
        implementation.removeSpeaker(name, promise)
    }

    @ReactMethod
    fun getSpeakers(promise: Promise) {
        implementation.getSpeakers(promise)
    }

    @ReactMethod
    fun identifySpeaker(embedding: ReadableArray, threshold: Float, promise: Promise) {
        implementation.identifySpeaker(embedding, threshold, promise)
    }

    @ReactMethod
    fun verifySpeaker(name: String, embedding: ReadableArray, threshold: Float, promise: Promise) {
        implementation.verifySpeaker(name, embedding, threshold, promise)
    }

    @ReactMethod
    fun processSpeakerIdFile(filePath: String, promise: Promise) {
        implementation.processSpeakerIdFile(filePath, promise)
    }

    @ReactMethod
    fun releaseSpeakerId(promise: Promise) {
        implementation.releaseSpeakerId(promise)
    }

    @ReactMethod
    fun extractTarBz2(sourcePath: String, targetDir: String, promise: Promise) {
        implementation.extractTarBz2(sourcePath, targetDir, promise)
    }

    @ReactMethod
    fun validateLibraryLoaded(promise: Promise) {
        implementation.validateLibraryLoaded(promise)
    }

    @ReactMethod
    fun testOnnxIntegration(promise: Promise) {
        implementation.testOnnxIntegration(promise)
    }
}