import type { ApiInterface } from '../types/api';
import type {
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  TtsOptions,
  ValidateResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';

/**
 * Service for Text-to-Speech functionality
 */
export class TtsService {
  private initialized = false;
  private sampleRate = 0;
  private numSpeakers = 0;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  /**
<<<<<<< HEAD
   * Helper function to wait for a specified time
   * @param ms Milliseconds to wait
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validates the library with multiple attempts
   * @param maxAttempts Maximum number of attempts
   * @param delayMs Delay between attempts (ms)
   * @returns Promise that resolves with validation result
   */
  private async validateLibraryWithRetry(
    maxAttempts = 10,
    delayMs = 500
  ): Promise<ValidateResult> {
    let attempts = 0;
    let lastError: Error | null = null;

    console.log('Validating Sherpa-ONNX library with retry...');

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const validation = await this.api.validateLibraryLoaded();

        if (validation.loaded) {
          console.log(
            `Library validated successfully after ${attempts} attempt(s)`
          );
          return validation;
        }

        console.log(
          `Validation attempt ${attempts}/${maxAttempts} - Status: ${validation.status}`
        );

        // Special case - if window.SherpaOnnx exists but isn't fully initialized
        if (typeof window !== 'undefined' && (window as any).SherpaOnnx) {
          console.log(
            'SherpaOnnx object exists but may not be fully initialized yet'
          );
        }

        // Wait before trying again
        await this.delay(delayMs);
      } catch (error) {
        console.warn(`Validation attempt ${attempts} failed:`, error);
        lastError = error as Error;
        await this.delay(delayMs);
      }
    }

    throw new Error(
      `Failed to validate library after ${maxAttempts} attempts: ${lastError?.message || 'unknown error'}`
    );
  }

  /**
=======
>>>>>>> origin/main
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  /**
   * Initialize the TTS engine
   * @param config The TTS model configuration
   * @returns Promise resolving to initialization result
   */
  public async initialize(config: TtsModelConfig): Promise<TtsInitResult> {
    try {
<<<<<<< HEAD
      // First validate library with retry mechanism
      await this.validateLibraryWithRetry();
=======
      // First validate library
      const validation = await this.api.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }
>>>>>>> origin/main

      // If we're already initialized, release resources
      if (this.initialized) {
        await this.release();
      }

      // Clean up file paths
      const cleanedModelDir = cleanFilePath(config.modelDir);
      const cleanedDataDir = config.dataDir
        ? cleanFilePath(config.dataDir)
        : undefined;
      const cleanedDictDir = config.dictDir
        ? cleanFilePath(config.dictDir)
        : undefined;

      // Create base config with common properties
      const nativeConfig: TtsModelConfig = {
        modelDir: cleanedModelDir,
        modelFile: config.modelFile,
        tokensFile: config.tokensFile,
        ttsModelType: config.ttsModelType,
        numThreads: config.numThreads || 1,
        debug: config.debug || false,
        provider: config.provider || 'cpu',
      };

      // Only add dataDir if it's defined
      if (cleanedDataDir) {
        nativeConfig.dataDir = cleanedDataDir;
      }

      // Only add dictDir if it's defined
      if (cleanedDictDir) {
        nativeConfig.dictDir = cleanedDictDir;
      }

      // Set model-specific properties based on model type
      switch (config.ttsModelType) {
        case 'vits':
          if (config.lexiconFile) {
            nativeConfig.lexiconFile = config.lexiconFile;
          }
          // Only add these if they're defined
          if (config.noiseScale !== undefined) {
            nativeConfig.noiseScale = config.noiseScale;
          }
          if (config.noiseScaleW !== undefined) {
            nativeConfig.noiseScaleW = config.noiseScaleW;
          }
          if (config.lengthScale !== undefined) {
            nativeConfig.lengthScale = config.lengthScale;
          }
          break;

        case 'matcha':
          if (config.vocoderFile) {
            nativeConfig.vocoderFile = config.vocoderFile;
          }
          if (config.lexiconFile) {
            nativeConfig.lexiconFile = config.lexiconFile;
          }
          if (config.noiseScale !== undefined) {
            nativeConfig.noiseScale = config.noiseScale;
          }
          if (config.lengthScale !== undefined) {
            nativeConfig.lengthScale = config.lengthScale;
          }
          break;

        case 'kokoro':
          if (config.voicesFile) {
            nativeConfig.voicesFile = config.voicesFile;
          }
          if (config.lexiconFile) {
            nativeConfig.lexiconFile = config.lexiconFile;
          }
          if (config.lengthScale !== undefined) {
            nativeConfig.lengthScale = config.lengthScale;
          }
          break;

        default:
          throw new Error(`Unsupported model type: ${config.ttsModelType}`);
      }

      // Set optional rule files if provided
      if (config.ruleFstsFile) {
        nativeConfig.ruleFstsFile = cleanFilePath(config.ruleFstsFile);
      }
      if (config.ruleFarsFile) {
        nativeConfig.ruleFarsFile = cleanFilePath(config.ruleFarsFile);
      }

      // Set optional TTS config settings
      if (config.maxNumSentences !== undefined) {
        nativeConfig.maxNumSentences = config.maxNumSentences;
      }
      if (config.silenceScale !== undefined) {
        nativeConfig.silenceScale = config.silenceScale;
      }

<<<<<<< HEAD
      console.log(
        'Initializing TTS with config:',
        JSON.stringify(nativeConfig)
      );

      // Attempt TTS initialization with retries
      let initResult: TtsInitResult | null = null;
      const maxInitAttempts = 3;

      for (let attempt = 1; attempt <= maxInitAttempts; attempt++) {
        try {
          // Call the native API to initialize TTS
          initResult = await this.api.initTts(nativeConfig);

          if (initResult.success) {
            console.log(`TTS initialized successfully on attempt ${attempt}`);
            break;
          } else {
            console.warn(
              `TTS initialization failed on attempt ${attempt}:`,
              initResult.error
            );

            if (attempt < maxInitAttempts) {
              console.log(
                `Waiting before retry ${attempt + 1}/${maxInitAttempts}...`
              );
              await this.delay(1000); // Wait longer between init attempts
            }
          }
        } catch (error) {
          console.error(
            `TTS initialization error on attempt ${attempt}:`,
            error
          );

          if (attempt < maxInitAttempts) {
            console.log(
              `Waiting before retry ${attempt + 1}/${maxInitAttempts}...`
            );
            await this.delay(1000);
          } else {
            throw error; // Re-throw on final attempt
          }
        }
      }

      if (!initResult || !initResult.success) {
        throw new Error(
          `Failed to initialize TTS after ${maxInitAttempts} attempts`
        );
      }

      // Store initialization results
      this.initialized = initResult.success;
      this.sampleRate = initResult.sampleRate;
      this.numSpeakers = initResult.numSpeakers;

      return initResult;
=======
      // Call the native API to initialize TTS
      const result = await this.api.initTts(nativeConfig);

      // Store initialization results
      this.initialized = result.success;
      this.sampleRate = result.sampleRate;
      this.numSpeakers = result.numSpeakers;

      return result;
>>>>>>> origin/main
    } catch (error) {
      this.initialized = false;
      console.error('Failed to initialize TTS:', error);
      throw error;
    }
  }

  /**
   * Get the initialized status
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the sample rate
   */
  public getSampleRate(): number {
    return this.sampleRate;
  }

  /**
   * Get the number of available speakers
   */
  public getNumSpeakers(): number {
    return this.numSpeakers;
  }

  /**
   * Generate speech from text
   * @param text Text to synthesize
   * @param options Options for speech generation
   * @returns Promise resolving with generation result
   */
  public async generateSpeech(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    if (!this.initialized) {
      throw new Error('TTS must be initialized first');
    }

    try {
      // Call the native API with minimized expectation of return values
      const result = await this.api.generateTts({
        text,
        speakerId: options.speakerId ?? 0,
        speakingRate: options.speakingRate ?? 1.0,
        playAudio: options.playAudio ?? false,
        fileNamePrefix: options.fileNamePrefix,
        lengthScale: options.lengthScale,
        noiseScale: options.noiseScale,
        noiseScaleW: options.noiseScaleW,
      });

      return result;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Stop ongoing speech generation
   */
  public async stopSpeech(): Promise<{
    stopped: boolean;
    message?: string;
  }> {
    try {
      console.log('TtsService: Stopping speech generation...');
      const result = await this.api.stopTts();
      console.log('TtsService: Stop speech result:', result);

      // Ensure the return value has the expected structure
      const defaultMessage = result.stopped
        ? 'Stopped successfully'
        : 'Failed to stop speech generation';

      return {
        stopped: result.stopped === true,
        message: result.message || defaultMessage,
      };
    } catch (error) {
      console.error('TtsService: Error stopping speech:', error);
      return {
        stopped: false,
        message: `Error stopping speech: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Release TTS resources
   */
  public async release(): Promise<{ released: boolean }> {
    const result = await this.api.releaseTts();
    if (result.released) {
      this.initialized = false;
      this.sampleRate = 0;
      this.numSpeakers = 0;
    }
    return result;
  }
}
