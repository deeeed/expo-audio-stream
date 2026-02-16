import * as FileSystem from 'expo-file-system/legacy';
import type { ApiInterface } from '../types/api';

/**
 * Type of model supported by Sherpa-onnx
 */
type ModelType =
  | 'asr'
  | 'tts'
  | 'vad'
  | 'kws'
  | 'speaker-id'
  | 'language-id'
  | 'audio-tagging'
  | 'punctuation';
interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

interface ExtractionResult {
  success: boolean;
  message?: string;
  extractedFiles?: string[];
}

export class ArchiveService {
  private baseDir: string;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.baseDir = `${FileSystem.documentDirectory}sherpa-onnx/`;
    this.api = api;
  }

  /**
   * Ensure the base directory exists
   */
  public async ensureBaseDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.baseDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.baseDir, {
        intermediates: true,
      });
    }
  }

  /**
   * Get the path for a model
   * @param modelType Type of the model
   * @param modelName Name of the model
   * @returns Promise resolving to the model path
   */
  public async getModelPath(
    modelType: ModelType,
    modelName: string
  ): Promise<string> {
    await this.ensureBaseDir();
    return `${this.baseDir}${modelType}/${modelName}`;
  }

  /**
   * Check if a model is downloaded
   * @param modelType Type of the model
   * @param modelName Name of the model
   * @returns Promise resolving to whether the model is downloaded
   */
  public async isModelDownloaded(
    modelType: ModelType,
    modelName: string
  ): Promise<boolean> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelInfo = await FileSystem.getInfoAsync(modelPath);
    return modelInfo.exists;
  }

  /**
   * Download a model
   * @param modelType Type of the model
   * @param modelName Name of the model
   * @param url URL to download from
   * @param onProgress Optional progress callback
   * @returns Promise resolving to the model path
   */
  public async downloadModel(
    modelType: ModelType,
    modelName: string,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));

    await this.ensureBaseDir();
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelDir, {
        intermediates: true,
      });
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      modelPath,
      {},
      (downloadProgress: DownloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(progress);
      }
    );

    await downloadResumable.downloadAsync();
    return modelPath;
  }

  /**
   * Delete a model
   * @param modelType Type of the model
   * @param modelName Name of the model
   * @returns Promise resolving when deletion is complete
   */
  public async deleteModel(
    modelType: ModelType,
    modelName: string
  ): Promise<void> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelInfo = await FileSystem.getInfoAsync(modelPath);
    if (modelInfo.exists) {
      await FileSystem.deleteAsync(modelPath);
    }
  }

  /**
   * Get the size of a model
   * @param modelType Type of the model
   * @param modelName Name of the model
   * @returns Promise resolving to the model size in bytes
   */
  public async getModelSize(
    modelType: ModelType,
    modelName: string
  ): Promise<number> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelInfo = await FileSystem.getInfoAsync(modelPath);
    return modelInfo.exists ? modelInfo.size || 0 : 0;
  }

  /**
   * Extract a tar.bz2 file to a target directory
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory to extract to
   * @returns Promise with extraction result
   */
  public async extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<ExtractionResult> {
    try {
      return await this.api.extractTarBz2(sourcePath, targetDir);
    } catch (error) {
      console.error('Error extracting tar.bz2:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
