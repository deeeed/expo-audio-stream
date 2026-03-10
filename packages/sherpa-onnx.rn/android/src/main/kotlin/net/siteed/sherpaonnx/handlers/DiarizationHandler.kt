/**
 * Handler for Offline Speaker Diarization functionality
 */
package net.siteed.sherpaonnx.handlers

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.k2fsa.sherpa.onnx.FastClusteringConfig
import com.k2fsa.sherpa.onnx.OfflineSpeakerDiarization
import com.k2fsa.sherpa.onnx.OfflineSpeakerDiarizationConfig
import com.k2fsa.sherpa.onnx.OfflineSpeakerSegmentationModelConfig
import com.k2fsa.sherpa.onnx.OfflineSpeakerSegmentationPyannoteModelConfig
import com.k2fsa.sherpa.onnx.SpeakerEmbeddingExtractorConfig
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import net.siteed.sherpaonnx.utils.AudioExtractor
import java.io.File
import java.util.concurrent.Executors

class DiarizationHandler(private val reactContext: ReactApplicationContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var sd: OfflineSpeakerDiarization? = null

    companion object {
        private const val TAG = "SherpaOnnxDiarization"
    }

    fun initDiarization(config: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "===== DIARIZATION INITIALIZATION START =====")

                val segmentationModelDir = AssetUtils.cleanFilePath(config.getString("segmentationModelDir") ?: "")
                val embeddingModelFile = AssetUtils.cleanFilePath(config.getString("embeddingModelFile") ?: "")
                val numThreads = if (config.hasKey("numThreads")) config.getInt("numThreads") else 1
                val debug = if (config.hasKey("debug")) config.getBoolean("debug") else false
                val provider = config.getString("provider") ?: "cpu"
                val minDurationOn = if (config.hasKey("minDurationOn")) config.getDouble("minDurationOn").toFloat() else 0.3f
                val minDurationOff = if (config.hasKey("minDurationOff")) config.getDouble("minDurationOff").toFloat() else 0.5f
                val numClusters = if (config.hasKey("numClusters")) config.getInt("numClusters") else -1
                val threshold = if (config.hasKey("threshold")) config.getDouble("threshold").toFloat() else 0.5f

                // Prefer int8 quantized model if present
                val int8Path = File(segmentationModelDir, "model.int8.onnx")
                val segmentationModelPath = if (int8Path.exists()) {
                    int8Path.absolutePath
                } else {
                    File(segmentationModelDir, "model.onnx").absolutePath
                }

                Log.i(TAG, "segmentationModelPath=$segmentationModelPath (exists: ${File(segmentationModelPath).exists()})")
                Log.i(TAG, "embeddingModelFile=$embeddingModelFile (exists: ${File(embeddingModelFile).exists()})")

                val diarizationConfig = OfflineSpeakerDiarizationConfig(
                    segmentation = OfflineSpeakerSegmentationModelConfig(
                        pyannote = OfflineSpeakerSegmentationPyannoteModelConfig(model = segmentationModelPath),
                        numThreads = numThreads,
                        debug = debug,
                        provider = provider,
                    ),
                    embedding = SpeakerEmbeddingExtractorConfig(
                        model = embeddingModelFile,
                        numThreads = numThreads,
                        debug = debug,
                        provider = provider,
                    ),
                    clustering = FastClusteringConfig(numClusters = numClusters, threshold = threshold),
                    minDurationOn = minDurationOn,
                    minDurationOff = minDurationOff,
                )

                sd = OfflineSpeakerDiarization(config = diarizationConfig)

                val sampleRate = sd!!.sampleRate()
                Log.i(TAG, "Diarization initialized, sampleRate=$sampleRate")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)

                Log.i(TAG, "===== DIARIZATION INITIALIZATION COMPLETE =====")

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing diarization: ${e.message}")
                e.printStackTrace()
                releaseResources()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DIARIZATION_INIT", "Failed to initialize diarization: ${e.message}")
                }
            }
        }
    }

    fun processDiarizationFile(filePath: String, numClusters: Int, threshold: Float, promise: Promise) {
        executor.execute {
            try {
                if (sd == null) throw Exception("Diarization is not initialized")

                val cleanedFilePath = AssetUtils.cleanFilePath(filePath)
                Log.i(TAG, "Processing file for diarization: $cleanedFilePath")

                val audioData = AudioExtractor.extractAudioFromFile(File(cleanedFilePath))
                    ?: throw Exception("Failed to extract audio from file")

                Log.i(TAG, "Audio extracted: ${audioData.samples.size} samples at ${audioData.sampleRate}Hz")

                // Update clustering config if non-default values passed
                if (numClusters != -1 || threshold != 0.5f) {
                    val updatedConfig = sd!!.config.copy(
                        clustering = FastClusteringConfig(numClusters = numClusters, threshold = threshold)
                    )
                    sd!!.setConfig(updatedConfig)
                }

                val startTime = System.currentTimeMillis()
                val segments = sd!!.process(audioData.samples)
                val durationMs = System.currentTimeMillis() - startTime

                Log.i(TAG, "Diarization complete: ${segments.size} segments in ${durationMs}ms")

                val segmentsArray = Arguments.createArray()
                val speakerSet = mutableSetOf<Int>()
                for (seg in segments) {
                    val segMap = Arguments.createMap()
                    segMap.putDouble("start", seg.start.toDouble())
                    segMap.putDouble("end", seg.end.toDouble())
                    segMap.putInt("speaker", seg.speaker)
                    segmentsArray.pushMap(segMap)
                    speakerSet.add(seg.speaker)
                }

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putArray("segments", segmentsArray)
                resultMap.putInt("numSpeakers", speakerSet.size)
                resultMap.putInt("durationMs", durationMs.toInt())

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing diarization file: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DIARIZATION_PROCESS", "Failed to process diarization file: ${e.message}")
                }
            }
        }
    }

    fun releaseDiarization(promise: Promise) {
        executor.execute {
            try {
                releaseResources()
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing diarization: ${e.message}")
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DIARIZATION_RELEASE", "Failed to release diarization: ${e.message}")
                }
            }
        }
    }

    private fun releaseResources() {
        try {
            sd?.release()
            sd = null
            Log.i(TAG, "Diarization resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error in releaseResources: ${e.message}")
        }
    }
}
