/**
 * Dummy C++ file containing empty implementations of all JNI functions.
 * These implementations are only for Android Studio's code analysis and won't be used at runtime.
 * The actual implementations come from the prebuilt libsherpa-onnx-jni.so library.
 */

#include <jni.h>

// ======== Common JNI Functions ========
// These are utility functions used by the actual implementations

// Creates a Java Integer object from a C++ int32_t
extern "C" JNIEXPORT jobject JNICALL
NewInteger(JNIEnv *env, int32_t value) {
    return nullptr;
}

// Creates a Java Float object from a C++ float
extern "C" JNIEXPORT jobject JNICALL
NewFloat(JNIEnv *env, float value) {
    return nullptr;
}

// ======== OfflineStream JNI Functions ========
// OfflineStream processes audio in non-real-time

// Deletes an OfflineStream instance
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineStream_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Adds audio samples to the stream for processing
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineStream_acceptWaveform(JNIEnv *env, jobject obj, jlong ptr, jfloatArray samples, jint sampleRate) {
    // Empty implementation
}

// ======== OfflineTts JNI Functions ========
// OfflineTts performs text-to-speech conversion

// Creates a new OfflineTts instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_newFromAsset(JNIEnv *env, jobject obj, jobject assetManager, jobject config) {
    return 0;
}

// Creates a new OfflineTts instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Generates speech from text
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_generateImpl(JNIEnv *env, jobject obj, jlong ptr, jstring text, jint sid, jfloat speed) {
    return nullptr;
}

// Generates speech with progress callback
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_generateWithCallbackImpl(JNIEnv *env, jobject obj, jlong ptr, jstring text, jint sid, jfloat speed, jobject callback) {
    return nullptr;
}

// Gets the audio sample rate used by the TTS engine
extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_getSampleRate(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Gets the number of available speakers/voices
extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_getNumSpeakers(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Deletes an OfflineTts instance
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineTts_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// ======== OnlineStream JNI Functions ========
// OnlineStream processes audio in real-time

// Deletes an OnlineStream instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OnlineStream_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Adds audio samples to the stream for real-time processing
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OnlineStream_acceptWaveform(JNIEnv *env, jobject obj, jlong ptr, jfloatArray samples, jint sample_rate) {
    // Empty implementation
}

// Marks that no more audio will be added to the stream
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OnlineStream_inputFinished(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// ======== AudioTagging JNI Functions ========
// AudioTagging identifies sounds/events in audio

// Creates a new AudioTagging instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_newFromAsset(JNIEnv *env, jobject obj, jobject assetManager, jobject config) {
    return 0;
}

// Creates a new AudioTagging instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes an AudioTagging instance
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Creates a stream for audio tagging
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_createStream(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Performs audio tagging analysis, returning top K results
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_AudioTagging_compute(JNIEnv *env, jobject obj, jlong ptr, jlong streamPtr, jint topK) {
    return nullptr;
}

// ======== KeywordSpotter JNI Functions ========
// KeywordSpotter detects specific keywords in audio

// Creates a new KeywordSpotter instance from Android assets
extern "C" JNIEXPORT jlong JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new KeywordSpotter instance from files
extern "C" JNIEXPORT jlong JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes a KeywordSpotter instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Processes audio in a stream to detect keywords
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_decode(JNIEnv *env, jobject obj, jlong ptr, jlong stream_ptr) {
    // Empty implementation
}

// Resets the keyword spotter to initial state
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_reset(JNIEnv *env, jobject obj, jlong ptr, jlong stream_ptr) {
    // Empty implementation
}

// Creates a stream for keyword spotting with optional custom keywords
extern "C" JNIEXPORT jlong JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_createStream(JNIEnv *env, jobject obj, jlong ptr, jstring keywords) {
    return 0;
}

// Checks if the keyword spotter has results ready
extern "C" JNIEXPORT jboolean JNICALL 
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_isReady(JNIEnv *env, jobject obj, jlong ptr, jlong stream_ptr) {
    return JNI_FALSE;
}

// Retrieves keyword spotting results
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_KeywordSpotter_getResult(JNIEnv *env, jobject obj, jlong ptr, jlong stream_ptr) {
    return nullptr;
}

// ======== OfflinePunctuation JNI Functions ========
// OfflinePunctuation adds punctuation to text

// Creates a new OfflinePunctuation instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflinePunctuation_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new OfflinePunctuation instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflinePunctuation_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes an OfflinePunctuation instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OfflinePunctuation_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Adds punctuation to the provided text
extern "C" JNIEXPORT jstring JNICALL
Java_com_k2fsa_sherpa_onnx_OfflinePunctuation_addPunctuation(JNIEnv *env, jobject obj, jlong ptr, jstring text) {
    return nullptr;
}

// ======== OnlinePunctuation JNI Functions ========
// OnlinePunctuation adds punctuation to text in real-time

// Creates a new OnlinePunctuation instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OnlinePunctuation_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new OnlinePunctuation instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OnlinePunctuation_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes an OnlinePunctuation instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OnlinePunctuation_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Adds punctuation to the provided text and preserves case
extern "C" JNIEXPORT jstring JNICALL
Java_com_k2fsa_sherpa_onnx_OnlinePunctuation_addPunctuation(JNIEnv *env, jobject obj, jlong ptr, jstring text) {
    return nullptr;
}

// ======== OfflineSpeakerDiarization JNI Functions ========
// OfflineSpeakerDiarization identifies different speakers in audio

// Creates a new OfflineSpeakerDiarization instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new OfflineSpeakerDiarization instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Updates configuration settings for speaker diarization
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_setConfig(JNIEnv *env, jobject obj, jlong ptr, jobject config) {
    // Empty implementation
}

// Deletes an OfflineSpeakerDiarization instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Processes audio to identify different speakers
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_process(JNIEnv *env, jobject obj, jlong ptr, jfloatArray samples) {
    return nullptr;
}

// Processes audio with progress callback
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_processWithCallback(JNIEnv *env, jobject obj, jlong ptr, jfloatArray samples, jobject callback, jlong arg) {
    return nullptr;
}

// Gets the sample rate used by the diarization model
extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeakerDiarization_getSampleRate(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// ======== OfflineSpeechDenoiser JNI Functions ========
// OfflineSpeechDenoiser removes noise from speech audio

// Creates a new OfflineSpeechDenoiser instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeechDenoiser_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new OfflineSpeechDenoiser instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeechDenoiser_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes an OfflineSpeechDenoiser instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_OfflineSpeechDenoiser_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Gets the sample rate used by the denoiser model
extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_OfflineSpeechDenoiser_getSampleRate(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Performs noise removal and returns denoised audio
extern "C" JNIEXPORT jobject JNICALL 
Java_com_k2fsa_sherpa_onnx_OfflineSpeechDenoiser_run(JNIEnv *env, jobject obj, jlong ptr, jfloatArray samples, jint sample_rate) {
    return nullptr;
}

// Saves denoised audio to a file
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_DenoisedAudio_saveImpl(JNIEnv *env, jobject obj, jstring filename, jfloatArray samples, jint sample_rate) {
    return JNI_TRUE;
}

// ======== SpeakerEmbeddingExtractor JNI Functions ========
// SpeakerEmbeddingExtractor generates vector representations of speakers' voices

// Creates a new SpeakerEmbeddingExtractor instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new SpeakerEmbeddingExtractor instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes a SpeakerEmbeddingExtractor instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Creates a stream for speaker embedding extraction
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_createStream(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Checks if enough audio has been collected to compute an embedding
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_isReady(JNIEnv *env, jobject obj, jlong ptr, jlong stream_ptr) {
    return JNI_FALSE;
}

// Computes a speaker embedding from the collected audio
extern "C" JNIEXPORT jfloatArray JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_compute(JNIEnv *env, jobject obj, jlong ptr, jlong stream_ptr) {
    return nullptr;
}

// Gets the dimension of the embedding vectors
extern "C" JNIEXPORT jint JNICALL 
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingExtractor_dim(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// ======== SpeakerEmbeddingManager JNI Functions ========
// SpeakerEmbeddingManager stores and compares speaker embeddings for identification

// Creates a new SpeakerEmbeddingManager with the specified embedding dimension
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_create(JNIEnv *env, jobject obj, jint dim) {
    return 0;
}

// Deletes a SpeakerEmbeddingManager instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Adds a speaker embedding to the manager with a given name
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_add(JNIEnv *env, jobject obj, jlong ptr, jstring name, jfloatArray embedding) {
    return JNI_TRUE;
}

// Adds multiple embeddings for the same speaker
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_addList(JNIEnv *env, jobject obj, jlong ptr, jstring name, jobjectArray embedding_arr) {
    return JNI_TRUE;
}

// Removes a speaker from the manager
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_remove(JNIEnv *env, jobject obj, jlong ptr, jstring name) {
    return JNI_TRUE;
}

// Searches for the most similar speaker to an embedding
extern "C" JNIEXPORT jstring JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_search(JNIEnv *env, jobject obj, jlong ptr, jfloatArray embedding, jfloat threshold) {
    return nullptr;
}

// Verifies if an embedding matches a specific speaker
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_verify(JNIEnv *env, jobject obj, jlong ptr, jstring name, jfloatArray embedding, jfloat threshold) {
    return JNI_TRUE;
}

// Checks if a speaker exists in the manager
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_contains(JNIEnv *env, jobject obj, jlong ptr, jstring name) {
    return JNI_TRUE;
}

// Gets the number of speakers in the manager
extern "C" JNIEXPORT jint JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_numSpeakers(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Gets all speaker names in the manager
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_SpeakerEmbeddingManager_allSpeakerNames(JNIEnv *env, jobject obj, jlong ptr) {
    return nullptr;
}

// ======== SpokenLanguageIdentification JNI Functions ========
// SpokenLanguageIdentification detects the language being spoken in audio

// Creates a new SpokenLanguageIdentification instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpokenLanguageIdentification_newFromAsset(JNIEnv *env, jobject obj, jobject asset_manager, jobject config) {
    return 0;
}

// Creates a new SpokenLanguageIdentification instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpokenLanguageIdentification_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes a SpokenLanguageIdentification instance
extern "C" JNIEXPORT void JNICALL 
Java_com_k2fsa_sherpa_onnx_SpokenLanguageIdentification_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Creates a stream for language identification
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_SpokenLanguageIdentification_createStream(JNIEnv *env, jobject obj, jlong ptr) {
    return 0;
}

// Computes the identified language from audio
extern "C" JNIEXPORT jstring JNICALL
Java_com_k2fsa_sherpa_onnx_SpokenLanguageIdentification_compute(JNIEnv *env, jobject obj, jlong ptr, jlong s_ptr) {
    return nullptr;
}

// ======== Vad (Voice Activity Detector) JNI Functions ========
// VAD detects when someone is speaking in audio

// Creates a new Vad instance from Android assets
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_newFromAsset(JNIEnv *env, jobject obj, jobject assetManager, jobject config) {
    return 0;
}

// Creates a new Vad instance from files
extern "C" JNIEXPORT jlong JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_newFromFile(JNIEnv *env, jobject obj, jobject config) {
    return 0;
}

// Deletes a Vad instance
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_delete(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Adds audio samples to the VAD for processing
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_acceptWaveform(JNIEnv *env, jobject obj, jlong ptr, jfloatArray samples) {
    // Empty implementation
}

// Checks if there are no voice segments available
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_empty(JNIEnv *env, jobject obj, jlong ptr) {
    return JNI_FALSE;
}

// Removes the current voice segment
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_pop(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Removes all voice segments
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_clear(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Gets the current voice segment
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_front(JNIEnv *env, jobject obj, jlong ptr) {
    return nullptr;
}

// Checks if speech is currently being detected
extern "C" JNIEXPORT jboolean JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_isSpeechDetected(JNIEnv *env, jobject obj, jlong ptr) {
    return JNI_FALSE;
}

// Resets the VAD to initial state
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_reset(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// Processes any remaining audio in the buffer
extern "C" JNIEXPORT void JNICALL
Java_com_k2fsa_sherpa_onnx_Vad_flush(JNIEnv *env, jobject obj, jlong ptr) {
    // Empty implementation
}

// ======== WaveReader JNI Functions ========
// WaveReader reads audio files

// Reads a WAV file from filesystem (Kotlin companion object version)
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_WaveReader_00024Companion_readWaveFromFile(JNIEnv *env, jclass cls, jstring filename) {
    return nullptr;
}

// Reads a WAV file from filesystem (standard version)
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_WaveReader_readWaveFromFile(JNIEnv *env, jclass obj, jstring filename) {
    return nullptr;
}

// Reads a WAV file from Android assets
extern "C" JNIEXPORT jobjectArray JNICALL
Java_com_k2fsa_sherpa_onnx_WaveReader_00024Companion_readWaveFromAsset(JNIEnv *env, jclass cls, jobject asset_manager, jstring filename) {
    return nullptr;
}

// ======== WaveWriter JNI Functions ========
// WaveWriter writes audio files

// Writes audio samples to a WAV file
extern "C" JNIEXPORT jboolean JNICALL 
Java_com_k2fsa_sherpa_onnx_WaveWriter_writeWaveToFile(JNIEnv *env, jclass obj, jstring filename, jfloatArray samples, jint sample_rate) {
    return JNI_TRUE;
}
