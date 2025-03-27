import NativeSherpaOnnx from './NativeSherpaOnnx';
import type { ApiInterface } from './types/api';
import type {
  TtsModelConfig,
  TtsInitResult,
  TtsGenerateConfig,
  TtsGenerateResult,
  AsrModelConfig,
  AsrInitResult,
  AsrRecognizeResult,
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
  SpeakerIdModelConfig,
  SpeakerIdInitResult,
  SpeakerIdProcessResult,
  SpeakerEmbeddingResult,
  RegisterSpeakerResult,
  RemoveSpeakerResult,
  GetSpeakersResult,
  IdentifySpeakerResult,
  VerifySpeakerResult,
  SpeakerIdFileProcessResult,
  ValidateResult,
  TestOnnxIntegrationResult,
} from './types/interfaces';
import { cleanFilePath } from './utils/fileUtils';

/**
 * Implementation of the SherpaOnnx API
 * This provides type-safe access to the native methods
 */
export const SherpaOnnxAPI: ApiInterface = {
  testOnnxIntegration(): Promise<TestOnnxIntegrationResult> {
    return NativeSherpaOnnx.testOnnxIntegration();
  },

  validateLibraryLoaded(): Promise<ValidateResult> {
    return NativeSherpaOnnx.validateLibraryLoaded();
  },

  /**
   * Initialize the TTS engine with the provided model configuration
   * @param config Configuration for the TTS model
   * @returns Promise that resolves with initialization result
   */
  async initTts(config: TtsModelConfig): Promise<TtsInitResult> {
    try {
      // Clean up file paths
      const cleanedModelDir = cleanFilePath(config.modelDir);
      const cleanedDataDir = config.dataDir
        ? cleanFilePath(config.dataDir)
        : cleanedModelDir;
      const cleanedDictDir = config.dictDir
        ? cleanFilePath(config.dictDir)
        : undefined;

      // Create base config with common properties
      const nativeConfig: TtsModelConfig = {
        modelDir: cleanedModelDir,
        modelType: config.modelType,
        numThreads: config.numThreads || 1,
        debug: config.debug || false,
        dataDir: cleanedDataDir,
        dictDir: cleanedDictDir,
      };

      // Set model-specific properties based on model type
      switch (config.modelType) {
        case 'vits':
          nativeConfig.modelName = config.modelName || 'model.onnx';
          nativeConfig.lexicon = config.lexicon;
          nativeConfig.noiseScale = config.noiseScale ?? 0.667;
          nativeConfig.noiseScaleW = config.noiseScaleW ?? 0.8;
          nativeConfig.lengthScale = config.lengthScale ?? 1.0;
          break;

        case 'matcha':
          nativeConfig.acousticModelName = config.acousticModelName;
          nativeConfig.vocoder = config.vocoder;
          nativeConfig.lexicon = config.lexicon;
          nativeConfig.noiseScale = config.noiseScale ?? 1.0;
          nativeConfig.lengthScale = config.lengthScale ?? 1.0;
          break;

        case 'kokoro':
          nativeConfig.modelName = config.modelName;
          nativeConfig.voices = config.voices;
          nativeConfig.lexicon = config.lexicon;
          nativeConfig.lengthScale = config.lengthScale ?? 1.0;
          break;

        default:
          throw new Error(`Unsupported model type: ${config.modelType}`);
      }

      // Set optional rule files if provided
      if (config.ruleFsts) {
        nativeConfig.ruleFsts = cleanFilePath(config.ruleFsts);
      }
      if (config.ruleFars) {
        nativeConfig.ruleFars = cleanFilePath(config.ruleFars);
      }

      console.log(
        'Initializing TTS with config:',
        JSON.stringify(nativeConfig)
      );
      return await NativeSherpaOnnx.initTts(nativeConfig);
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      throw error;
    }
  },

  generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult> {
    return NativeSherpaOnnx.generateTts(config);
  },

  stopTts(): Promise<{ stopped: boolean; message?: string }> {
    return NativeSherpaOnnx.stopTts();
  },

  releaseTts(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseTts();
  },

  // ASR methods
  initAsr(config: AsrModelConfig): Promise<AsrInitResult> {
    return NativeSherpaOnnx.initAsr(config);
  },

  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult> {
    return NativeSherpaOnnx.recognizeFromSamples(sampleRate, samples);
  },

  recognizeFromFile(filePath: string): Promise<AsrRecognizeResult> {
    return NativeSherpaOnnx.recognizeFromFile(filePath);
  },

  releaseAsr(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseAsr();
  },

  // Audio tagging methods
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    return NativeSherpaOnnx.initAudioTagging(config);
  },

  processAndComputeAudioTagging(filePath: string): Promise<AudioTaggingResult> {
    return NativeSherpaOnnx.processAndComputeAudioTagging(filePath);
  },

  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AudioTaggingResult> {
    return NativeSherpaOnnx.processAndComputeAudioSamples(sampleRate, samples);
  },

  releaseAudioTagging(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseAudioTagging();
  },

  // Speaker ID methods
  initSpeakerId(config: SpeakerIdModelConfig): Promise<SpeakerIdInitResult> {
    return NativeSherpaOnnx.initSpeakerId(config);
  },

  processSpeakerIdSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SpeakerIdProcessResult> {
    return NativeSherpaOnnx.processSpeakerIdSamples(sampleRate, samples);
  },

  computeSpeakerEmbedding(): Promise<SpeakerEmbeddingResult> {
    return NativeSherpaOnnx.computeSpeakerEmbedding();
  },

  registerSpeaker(
    name: string,
    embedding: number[]
  ): Promise<RegisterSpeakerResult> {
    return NativeSherpaOnnx.registerSpeaker(name, embedding);
  },

  removeSpeaker(name: string): Promise<RemoveSpeakerResult> {
    return NativeSherpaOnnx.removeSpeaker(name);
  },

  getSpeakers(): Promise<GetSpeakersResult> {
    return NativeSherpaOnnx.getSpeakers();
  },

  identifySpeaker(
    embedding: number[],
    threshold: number
  ): Promise<IdentifySpeakerResult> {
    return NativeSherpaOnnx.identifySpeaker(embedding, threshold);
  },

  verifySpeaker(
    name: string,
    embedding: number[],
    threshold: number
  ): Promise<VerifySpeakerResult> {
    return NativeSherpaOnnx.verifySpeaker(name, embedding, threshold);
  },

  processSpeakerIdFile(filePath: string): Promise<SpeakerIdFileProcessResult> {
    return NativeSherpaOnnx.processSpeakerIdFile(filePath);
  },

  releaseSpeakerId(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseSpeakerId();
  },

  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }> {
    return NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir);
  },
};
