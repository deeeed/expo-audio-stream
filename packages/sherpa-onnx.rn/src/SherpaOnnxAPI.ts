import NativeSherpaOnnx from './NativeSherpaOnnx';
import type {
  ValidateResult,
  TtsModelConfig,
  TtsInitResult,
  TtsOptions,
  TtsGenerateResult,
  AsrModelConfig,
  AsrInitResult,
  AsrRecognizeResult,
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
} from './types/interfaces';

/**
 * Api interface for the Sherpa-ONNX native module
 * This provides type-safe access to the native methods
 */
export class SherpaOnnxAPI {
  /**
   * Check if the library is loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibraryLoaded(): Promise<ValidateResult> {
    return NativeSherpaOnnx.validateLibraryLoaded();
  }

  /**
   * Initialize the TTS engine with the provided model configuration
   * @param config Configuration for the TTS model
   * @returns Promise that resolves with initialization result
   */
  public static async initTts(config: TtsModelConfig): Promise<TtsInitResult> {
    try {
      // Clean up file paths in the config
      const cleanedConfig: TtsModelConfig = {
        ...config,
        modelDir: this.cleanFilePath(config.modelDir),
      };

      // Handle model file configuration
      if (!cleanedConfig.modelName) {
        cleanedConfig.modelName = 'model.onnx';
      }

      // Ensure data directory is set properly
      if (!cleanedConfig.dataDir) {
        cleanedConfig.dataDir = cleanedConfig.modelDir;
      } else {
        cleanedConfig.dataDir = this.cleanFilePath(cleanedConfig.dataDir);
      }

      console.log(
        'Initializing TTS with config:',
        JSON.stringify(cleanedConfig)
      );

      return await NativeSherpaOnnx.initTts(cleanedConfig);
    } catch (error: any) {
      console.error('Failed to initialize TTS:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text using the TTS engine
   * @param text Text to synthesize
   * @param options Options for speech generation
   * @returns Promise that resolves with generation result
   */
  public static async generateTts(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    try {
      const config = {
        text,
        speakerId: options.speakerId ?? 0,
        speakingRate: options.speakingRate ?? 1.0,
        playAudio: options.playAudio ?? false,
        fileNamePrefix: options.fileNamePrefix ?? null,
        lengthScale: options.lengthScale ?? null,
        noiseScale: options.noiseScale ?? null,
        noiseScaleW: options.noiseScaleW ?? null,
      };
      
      return await NativeSherpaOnnx.generateTts(config);
    } catch (error: any) {
      console.error('Failed to generate TTS:', error);
      throw error;
    }
  }

  /**
   * Stop ongoing TTS playback
   * @returns Promise that resolves when playback is stopped
   */
  public static async stopTts(): Promise<{
    stopped: boolean;
    message?: string;
  }> {
    try {
      return await NativeSherpaOnnx.stopTts();
    } catch (error: any) {
      console.error('Failed to stop TTS:', error);
      throw error;
    }
  }

  /**
   * Release TTS resources
   * @returns Promise that resolves when resources are released
   */
  public static async releaseTts(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseTts();
    } catch (error: any) {
      console.error('Failed to release TTS resources:', error);
      throw error;
    }
  }

  /**
   * Initialize the ASR engine with the provided model configuration
   * @param config Configuration for the ASR model
   * @returns Promise that resolves with initialization result
   */
  public static async initAsr(config: AsrModelConfig): Promise<AsrInitResult> {
    try {
      // Clean up the modelDir path to ensure proper file access
      const cleanedModelDir = this.cleanFilePath(config.modelDir);

      // Create a config object with clean file paths
      const nativeConfig: Record<string, any> = {
        modelDir: cleanedModelDir,
        modelType: config.modelType,
        numThreads: config.numThreads || 1,
        decodingMethod: config.decodingMethod || 'greedy_search',
        maxActivePaths: config.maxActivePaths || 4,
        streaming: config.streaming || false,
        debug: config.debug || false,
      };

      // Process modelFiles if provided
      if (config.modelFiles) {
        // Create a clean version of modelFiles for the native side
        nativeConfig.modelFiles = {};
        
        // Process each model file entry
        for (const [key, value] of Object.entries(config.modelFiles)) {
          if (value) {
            nativeConfig.modelFiles[key] = value;
          }
        }
      }

      console.log(
        'Initializing ASR with config:',
        JSON.stringify(nativeConfig)
      );
      return await NativeSherpaOnnx.initAsr(nativeConfig);
    } catch (error: any) {
      console.error('Failed to initialize ASR:', error);
      throw error;
    }
  }

  /**
   * Recognize speech from audio samples
   * @param sampleRate Sample rate of the audio
   * @param samples Audio samples as float array
   * @returns Promise that resolves with recognition result
   */
  public static async recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult> {
    try {
      return await NativeSherpaOnnx.recognizeFromSamples(sampleRate, samples);
    } catch (error: any) {
      console.error('Failed to recognize speech from samples:', error);
      throw error;
    }
  }

  /**
   * Recognize speech from an audio file
   * @param filePath Path to the audio file
   * @returns Promise that resolves with recognition result
   */
  public static async recognizeFromFile(
    filePath: string
  ): Promise<AsrRecognizeResult> {
    try {
      return await NativeSherpaOnnx.recognizeFromFile(filePath);
    } catch (error: any) {
      console.error('Failed to recognize speech from file:', error);
      throw error;
    }
  }

  /**
   * Release ASR resources
   * @returns Promise that resolves when resources are released
   */
  public static async releaseAsr(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseAsr();
    } catch (error: any) {
      console.error('Failed to release ASR resources:', error);
      throw error;
    }
  }

  /**
   * Initialize the Audio Tagging engine with the provided model configuration
   * @param config Configuration for the audio tagging model
   * @returns Promise that resolves with initialization result
   */
  public static async initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    try {
      // Create a modified config object for the native module
      const nativeConfig = {
        modelDir: this.cleanFilePath(config.modelDir),
        modelFile: config.modelFile || config.modelName || 'model.onnx',
        labelsFile: config.labelsFile || 'labels.txt',
        modelType: config.modelType, // Pass model type explicitly
        numThreads: config.numThreads || 1,
        topK: config.topK || 3,
      };

      console.log(
        'Initializing audio tagging with native config:',
        JSON.stringify(nativeConfig)
      );
      return await NativeSherpaOnnx.initAudioTagging(nativeConfig);
    } catch (error: any) {
      console.error('Failed to initialize audio tagging:', error);
      throw error;
    }
  }

  /**
   * Process and compute audio tagging for a file in a single operation
   * @param filePath Path to the audio file to process
   * @returns Promise that resolves with audio tagging result
   */
  public static async processAndComputeAudioTagging(
    filePath: string
  ): Promise<AudioTaggingResult> {
    try {
      // Clean up file path before sending to native
      const cleanedPath = this.cleanFilePath(filePath);
      console.log('Processing audio file with path:', cleanedPath);
      return await NativeSherpaOnnx.processAndComputeAudioTagging(cleanedPath);
    } catch (error: any) {
      console.error('Failed to process and compute audio tagging:', error);
      throw error;
    }
  }

  /**
   * Helper function to clean file paths from Expo by removing file:// or file:/ prefixes
   * @param path The file path to clean
   * @returns The cleaned file path
   */
  private static cleanFilePath(path: string): string {
    if (path.startsWith('file://')) {
      return path.substring(7);
    } else if (path.startsWith('file:/')) {
      return path.substring(6);
    }
    return path;
  }

  /**
   * Process and compute audio tagging for samples
   * @param sampleRate Sample rate of the audio
   * @param samples Audio samples as float array
   * @returns Promise that resolves with audio tagging result
   */
  public static async processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AudioTaggingResult> {
    try {
      return await NativeSherpaOnnx.processAndComputeAudioSamples(
        sampleRate,
        samples
      );
    } catch (error: any) {
      console.error('Failed to process and compute audio samples:', error);
      throw error;
    }
  }

  /**
   * Release Audio Tagging resources
   * @returns Promise that resolves when resources are released
   */
  public static async releaseAudioTagging(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseAudioTagging();
    } catch (error: any) {
      console.error('Failed to release audio tagging resources:', error);
      throw error;
    }
  }

  /**
   * Extract a tar.bz2 archive to a directory
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory where files should be extracted
   * @returns Promise that resolves with extraction result
   */
  public static async extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }> {
    try {
      return await NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir);
    } catch (error: any) {
      console.error('Failed to extract archive:', error);
      throw error;
    }
  }
}
