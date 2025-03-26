import type {
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
} from '../types/interfaces';
import { SherpaOnnxAPI } from '../SherpaOnnxAPI';

/**
 * Service for Speaker Identification functionality
 */
export class SpeakerIdService {
  private static initialized = false;
  private static embeddingDim = 0;

  /**
   * Get the embedding dimension
   */
  public static getEmbeddingDim(): number {
    return this.embeddingDim;
  }

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibrary(): Promise<ValidateResult> {
    return SherpaOnnxAPI.validateLibraryLoaded();
  }

  /**
   * Initialize Speaker ID with the provided model configuration
   * @param config Configuration for Speaker ID model
   * @returns Promise that resolves with initialization result
   */
  public static async init(
    config: SpeakerIdModelConfig
  ): Promise<SpeakerIdInitResult> {
    try {
      // First validate library is loaded
      const validateResult = await this.validateLibrary();
      if (!validateResult.loaded) {
        return {
          success: false,
          embeddingDim: 0,
          error: validateResult.status || 'Library not loaded',
        };
      }

      const result = await SherpaOnnxAPI.initSpeakerId(config);

      if (result.success) {
        this.initialized = true;
        this.embeddingDim = result.embeddingDim;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        embeddingDim: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process audio samples for speaker identification
   * @param sampleRate Sample rate of the audio
   * @param samples Audio samples as number array
   * @returns Promise that resolves with processing result
   */
  public static async processSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SpeakerIdProcessResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          samplesProcessed: 0,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.processSpeakerIdSamples(sampleRate, samples);
    } catch (error) {
      return {
        success: false,
        samplesProcessed: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Compute speaker embedding from processed audio
   * @returns Promise that resolves with embedding result
   */
  public static async computeEmbedding(): Promise<SpeakerEmbeddingResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          durationMs: 0,
          embedding: [],
          embeddingDim: 0,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.computeSpeakerEmbedding();
    } catch (error) {
      return {
        success: false,
        durationMs: 0,
        embedding: [],
        embeddingDim: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Register a speaker with the given name and embedding
   * @param name Name of the speaker to register
   * @param embedding Speaker's embedding vector
   * @returns Promise that resolves with registration result
   */
  public static async registerSpeaker(
    name: string,
    embedding: number[]
  ): Promise<RegisterSpeakerResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.registerSpeaker(name, embedding);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Remove a speaker from the database
   * @param name Name of the speaker to remove
   * @returns Promise that resolves with removal result
   */
  public static async removeSpeaker(
    name: string
  ): Promise<RemoveSpeakerResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.removeSpeaker(name);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all registered speakers
   * @returns Promise that resolves with speakers result
   */
  public static async getSpeakers(): Promise<GetSpeakersResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          speakers: [],
          count: 0,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.getSpeakers();
    } catch (error) {
      return {
        success: false,
        speakers: [],
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Identify a speaker based on embedding
   * @param embedding Speaker embedding vector
   * @param threshold Similarity threshold (0-1), default: 0.5
   * @returns Promise that resolves with identification result
   */
  public static async identifySpeaker(
    embedding: number[],
    threshold: number = 0.5
  ): Promise<IdentifySpeakerResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          speakerName: '',
          identified: false,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.identifySpeaker(embedding, threshold);
    } catch (error) {
      return {
        success: false,
        speakerName: '',
        identified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify if the embedding matches a specific speaker
   * @param name Name of the speaker to verify
   * @param embedding Speaker embedding vector
   * @param threshold Similarity threshold (0-1), default: 0.5
   * @returns Promise that resolves with verification result
   */
  public static async verifySpeaker(
    name: string,
    embedding: number[],
    threshold: number = 0.5
  ): Promise<VerifySpeakerResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          verified: false,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.verifySpeaker(name, embedding, threshold);
    } catch (error) {
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process audio file to create embedding
   * @param filePath Path to the audio file
   * @returns Promise that resolves with file processing result
   */
  public static async processFile(
    filePath: string
  ): Promise<SpeakerIdFileProcessResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          durationMs: 0,
          embedding: [],
          embeddingDim: 0,
          sampleRate: 0,
          samples: 0,
          error: 'Speaker ID is not initialized',
        };
      }

      return await SherpaOnnxAPI.processSpeakerIdFile(filePath);
    } catch (error) {
      return {
        success: false,
        durationMs: 0,
        embedding: [],
        embeddingDim: 0,
        sampleRate: 0,
        samples: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Full speaker identification flow from audio file
   * @param filePath Path to the audio file
   * @param threshold Similarity threshold (0-1), default: 0.5
   * @returns Promise that resolves with identification result
   */
  public static async identifyFromFile(
    filePath: string,
    threshold: number = 0.5
  ): Promise<IdentifySpeakerResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          speakerName: '',
          identified: false,
          error: 'Speaker ID is not initialized',
        };
      }

      // Process the file to get embedding
      const processResult = await this.processFile(filePath);

      if (!processResult.success) {
        return {
          success: false,
          speakerName: '',
          identified: false,
          error: processResult.error,
        };
      }

      // Identify the speaker using the embedding
      return await this.identifySpeaker(processResult.embedding, threshold);
    } catch (error) {
      return {
        success: false,
        speakerName: '',
        identified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Register a speaker from audio file
   * @param name Name of the speaker to register
   * @param filePath Path to the audio file
   * @returns Promise that resolves with registration result
   */
  public static async registerFromFile(
    name: string,
    filePath: string
  ): Promise<RegisterSpeakerResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          error: 'Speaker ID is not initialized',
        };
      }

      // Process the file to get embedding
      const processResult = await this.processFile(filePath);

      if (!processResult.success) {
        return {
          success: false,
          error: processResult.error,
        };
      }

      // Register the speaker using the embedding
      return await this.registerSpeaker(name, processResult.embedding);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Release Speaker ID resources
   * @returns Promise that resolves with release result
   */
  public static async release(): Promise<{ released: boolean }> {
    try {
      const result = await SherpaOnnxAPI.releaseSpeakerId();

      if (result.released) {
        this.initialized = false;
        this.embeddingDim = 0;
      }

      return result;
    } catch (error) {
      console.error('Error releasing Speaker ID resources:', error);
      return { released: false };
    }
  }
}
