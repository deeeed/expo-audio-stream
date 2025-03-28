package net.siteed.sherpaonnx

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Promise
import com.facebook.react.turbomodule.core.interfaces.TurboModule

class SherpaOnnxTurboModuleImpl(
    private val reactContext: ReactApplicationContext
) : SherpaOnnxTurboModule {
    
    private val implementation = SherpaOnnxImpl(reactContext)

    override fun initialize() {
        // Initialize any necessary resources
    }

    override fun invalidate() {
        // Clean up any resources
    }

    override fun initTts(config: ReadableMap, promise: Promise) {
        implementation.initTts(config, promise)
    }

    override fun generateTts(config: ReadableMap, promise: Promise) {
        implementation.generateTts(config, promise)
    }

    override fun stopTts(promise: Promise) {
        implementation.stopTts(promise)
    }

    override fun releaseTts(promise: Promise) {
        implementation.releaseTts(promise)
    }

    override fun initAsr(config: ReadableMap, promise: Promise) {
        implementation.initAsr(config, promise)
    }

    override fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        implementation.recognizeFromSamples(sampleRate, audioBuffer, promise)
    }

    override fun recognizeFromFile(filePath: String, promise: Promise) {
        implementation.recognizeFromFile(filePath, promise)
    }

    override fun releaseAsr(promise: Promise) {
        implementation.releaseAsr(promise)
    }

    override fun initAudioTagging(config: ReadableMap, promise: Promise) {
        implementation.initAudioTagging(config, promise)
    }

    override fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        implementation.processAudioSamples(sampleRate, audioBuffer, promise)
    }

    override fun computeAudioTagging(promise: Promise) {
        implementation.computeAudioTagging(promise)
    }

    override fun processAndComputeAudioTagging(filePath: String, promise: Promise) {
        implementation.processAndComputeAudioTagging(filePath, promise)
    }

    override fun processAudioFile(filePath: String, promise: Promise) {
        implementation.processAudioFile(filePath, promise)
    }

    override fun releaseAudioTagging(promise: Promise) {
        implementation.releaseAudioTagging(promise)
    }

    override fun initSpeakerId(config: ReadableMap, promise: Promise) {
        implementation.initSpeakerId(config, promise)
    }

    override fun processSpeakerIdSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        implementation.processSpeakerIdSamples(sampleRate, audioBuffer, promise)
    }

    override fun computeSpeakerEmbedding(promise: Promise) {
        implementation.computeSpeakerEmbedding(promise)
    }

    override fun registerSpeaker(name: String, embedding: ReadableArray, promise: Promise) {
        implementation.registerSpeaker(name, embedding, promise)
    }

    override fun removeSpeaker(name: String, promise: Promise) {
        implementation.removeSpeaker(name, promise)
    }

    override fun getSpeakers(promise: Promise) {
        implementation.getSpeakers(promise)
    }

    override fun identifySpeaker(embedding: ReadableArray, threshold: Float, promise: Promise) {
        implementation.identifySpeaker(embedding, threshold, promise)
    }

    override fun verifySpeaker(name: String, embedding: ReadableArray, threshold: Float, promise: Promise) {
        implementation.verifySpeaker(name, embedding, threshold, promise)
    }

    override fun processSpeakerIdFile(filePath: String, promise: Promise) {
        implementation.processSpeakerIdFile(filePath, promise)
    }

    override fun releaseSpeakerId(promise: Promise) {
        implementation.releaseSpeakerId(promise)
    }

    override fun extractTarBz2(sourcePath: String, targetDir: String, promise: Promise) {
        implementation.extractTarBz2(sourcePath, targetDir, promise)
    }

    override fun validateLibraryLoaded(promise: Promise) {
        implementation.validateLibraryLoaded(promise)
    }

    override fun testOnnxIntegration(promise: Promise) {
        implementation.testOnnxIntegration(promise)
    }
} 