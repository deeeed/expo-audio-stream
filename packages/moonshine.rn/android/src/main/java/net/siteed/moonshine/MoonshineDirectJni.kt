package net.siteed.moonshine

import ai.moonshine.voice.JNI
import ai.moonshine.voice.Transcript
import ai.moonshine.voice.TranscriberOption
import java.lang.reflect.InvocationTargetException

internal data class MoonshineIntentMatchNative(
  val triggerPhrase: String,
  val utterance: String,
  val similarity: Float
)

internal object MoonshineDirectJni {
  private val jniClass: Class<*> = JNI::class.java

  fun addAudioToStream(
    transcriberHandle: Int,
    streamHandle: Int,
    audioData: FloatArray,
    sampleRate: Int
  ): Int {
    ensureLoaded()
    return JNI.moonshineAddAudioToStream(
      transcriberHandle,
      streamHandle,
      audioData,
      sampleRate
    )
  }

  fun clearIntents(intentRecognizerHandle: Int): Int {
    return invokeOptionalInt(
      "moonshineClearIntents",
      arrayOf(Int::class.javaPrimitiveType!!),
      arrayOf(intentRecognizerHandle)
    )
  }

  fun createIntentRecognizer(
    modelPath: String,
    modelArch: Int,
    modelVariant: String?,
    threshold: Float
  ): Int {
    return invokeOptionalInt(
      "moonshineCreateIntentRecognizer",
      arrayOf(
        String::class.java,
        Int::class.javaPrimitiveType!!,
        String::class.java,
        Float::class.javaPrimitiveType!!
      ),
      arrayOf(modelPath, modelArch, modelVariant, threshold)
    )
  }

  fun createStream(transcriberHandle: Int): Int {
    ensureLoaded()
    return JNI.moonshineCreateStream(transcriberHandle, 0)
  }

  fun errorToString(code: Int): String {
    ensureLoaded()
    return JNI.moonshineErrorToString(code)
  }

  fun freeIntentRecognizer(intentRecognizerHandle: Int) {
    invokeOptionalVoid(
      "moonshineFreeIntentRecognizer",
      arrayOf(Int::class.javaPrimitiveType!!),
      arrayOf(intentRecognizerHandle)
    )
  }

  fun freeStream(transcriberHandle: Int, streamHandle: Int) {
    ensureLoaded()
    JNI.moonshineFreeStream(transcriberHandle, streamHandle)
  }

  fun freeTranscriber(transcriberHandle: Int) {
    ensureLoaded()
    JNI.moonshineFreeTranscriber(transcriberHandle)
  }

  fun getIntentCount(intentRecognizerHandle: Int): Int {
    return invokeOptionalInt(
      "moonshineGetIntentCount",
      arrayOf(Int::class.javaPrimitiveType!!),
      arrayOf(intentRecognizerHandle)
    )
  }

  fun getIntentThreshold(intentRecognizerHandle: Int): Float {
    return invokeOptionalFloat(
      "moonshineGetIntentThreshold",
      arrayOf(Int::class.javaPrimitiveType!!),
      arrayOf(intentRecognizerHandle)
    )
  }

  fun getVersion(): Int {
    ensureLoaded()
    return JNI.moonshineGetVersion()
  }

  fun loadTranscriberFromFiles(
    path: String,
    modelArch: Int,
    options: Array<TranscriberOption>
  ): Int {
    ensureLoaded()
    return JNI.moonshineLoadTranscriberFromFiles(path, modelArch, options)
  }

  fun loadTranscriberFromMemory(
    encoderModelData: ByteArray,
    decoderModelData: ByteArray,
    tokenizerData: ByteArray,
    modelArch: Int,
    options: Array<TranscriberOption>
  ): Int {
    ensureLoaded()
    return JNI.moonshineLoadTranscriberFromMemory(
      encoderModelData,
      decoderModelData,
      tokenizerData,
      modelArch,
      options
    )
  }

  fun processUtterance(intentRecognizerHandle: Int, utterance: String): MoonshineIntentMatchNative? {
    val result = invokeOptional(
      "moonshineProcessUtteranceDetailed",
      arrayOf(Int::class.javaPrimitiveType!!, String::class.java),
      arrayOf(intentRecognizerHandle, utterance)
    ) as? Array<*>
    if (result == null || result.size < 3) {
      return null
    }
    return MoonshineIntentMatchNative(
      triggerPhrase = result[0]?.toString().orEmpty(),
      utterance = result[1]?.toString().orEmpty(),
      similarity = result[2]?.toString()?.toFloatOrNull() ?: 0f
    )
  }

  fun registerIntent(intentRecognizerHandle: Int, triggerPhrase: String): Int {
    return invokeOptionalInt(
      "moonshineRegisterIntent",
      arrayOf(Int::class.javaPrimitiveType!!, String::class.java),
      arrayOf(intentRecognizerHandle, triggerPhrase)
    )
  }

  fun setIntentThreshold(intentRecognizerHandle: Int, threshold: Float): Int {
    return invokeOptionalInt(
      "moonshineSetIntentThreshold",
      arrayOf(Int::class.javaPrimitiveType!!, Float::class.javaPrimitiveType!!),
      arrayOf(intentRecognizerHandle, threshold)
    )
  }

  fun startStream(transcriberHandle: Int, streamHandle: Int): Int {
    ensureLoaded()
    return JNI.moonshineStartStream(transcriberHandle, streamHandle)
  }

  fun stopStream(transcriberHandle: Int, streamHandle: Int): Int {
    ensureLoaded()
    return JNI.moonshineStopStream(transcriberHandle, streamHandle)
  }

  fun transcribeStream(transcriberHandle: Int, streamHandle: Int, flags: Int): Transcript? {
    ensureLoaded()
    return JNI.moonshineTranscribeStream(transcriberHandle, streamHandle, flags)
  }

  fun transcribeWithoutStreaming(
    transcriberHandle: Int,
    audioData: FloatArray,
    sampleRate: Int,
    flags: Int = 0
  ): Transcript? {
    ensureLoaded()
    return JNI.moonshineTranscribeWithoutStreaming(
      transcriberHandle,
      audioData,
      sampleRate,
      flags
    )
  }

  fun unregisterIntent(intentRecognizerHandle: Int, triggerPhrase: String): Int {
    return invokeOptionalInt(
      "moonshineUnregisterIntent",
      arrayOf(Int::class.javaPrimitiveType!!, String::class.java),
      arrayOf(intentRecognizerHandle, triggerPhrase)
    )
  }

  private fun ensureLoaded() {
    JNI.ensureLibraryLoaded()
  }

  private fun invokeOptional(
    methodName: String,
    parameterTypes: Array<Class<*>>,
    args: Array<Any?>
  ): Any? {
    ensureLoaded()
    val method = try {
      jniClass.getMethod(methodName, *parameterTypes)
    } catch (_: NoSuchMethodException) {
      throw UnsupportedOperationException(
        "$methodName is unavailable in the loaded Moonshine Android artifact. " +
          "Use the source-built artifact from packages/moonshine.rn/build-moonshine-android.sh."
      )
    }

    return try {
      method.invoke(null, *args)
    } catch (error: InvocationTargetException) {
      throw (error.targetException ?: error)
    }
  }

  private fun invokeOptionalFloat(
    methodName: String,
    parameterTypes: Array<Class<*>>,
    args: Array<Any?>
  ): Float {
    val value = invokeOptional(methodName, parameterTypes, args)
    return when (value) {
      is Float -> value
      is Double -> value.toFloat()
      is Number -> value.toFloat()
      else -> throw IllegalStateException("$methodName returned an unexpected value")
    }
  }

  private fun invokeOptionalInt(
    methodName: String,
    parameterTypes: Array<Class<*>>,
    args: Array<Any?>
  ): Int {
    val value = invokeOptional(methodName, parameterTypes, args)
    return when (value) {
      is Int -> value
      is Number -> value.toInt()
      else -> throw IllegalStateException("$methodName returned an unexpected value")
    }
  }

  private fun invokeOptionalVoid(
    methodName: String,
    parameterTypes: Array<Class<*>>,
    args: Array<Any?>
  ) {
    invokeOptional(methodName, parameterTypes, args)
  }
}
