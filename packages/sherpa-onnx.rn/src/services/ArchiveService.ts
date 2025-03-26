import * as FileSystem from 'expo-file-system';
import { ModelType } from '../types/interfaces';
import NativeSherpaOnnx from '../NativeSherpaOnnx';

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
  private static instance: ArchiveService;
  private baseDir: string;

  private constructor() {
    this.baseDir = `${FileSystem.documentDirectory}sherpa-onnx/`;
  }

  public static getInstance(): ArchiveService {
    if (!ArchiveService.instance) {
      ArchiveService.instance = new ArchiveService();
    }
    return ArchiveService.instance;
  }

  // Static methods that delegate to instance methods
  public static async ensureBaseDir(): Promise<void> {
    return ArchiveService.getInstance().ensureBaseDir();
  }

  public static async getModelPath(
    modelType: ModelType,
    modelName: string
  ): Promise<string> {
    return ArchiveService.getInstance().getModelPath(modelType, modelName);
  }

  public static async isModelDownloaded(
    modelType: ModelType,
    modelName: string
  ): Promise<boolean> {
    return ArchiveService.getInstance().isModelDownloaded(modelType, modelName);
  }

  public static async downloadModel(
    modelType: ModelType,
    modelName: string,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return ArchiveService.getInstance().downloadModel(modelType, modelName, url, onProgress);
  }

  public static async deleteModel(
    modelType: ModelType,
    modelName: string
  ): Promise<void> {
    return ArchiveService.getInstance().deleteModel(modelType, modelName);
  }

  public static async getModelSize(
    modelType: ModelType,
    modelName: string
  ): Promise<number> {
    return ArchiveService.getInstance().getModelSize(modelType, modelName);
  }

  /**
   * Extract a tar.bz2 file to a target directory
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory to extract to
   * @returns Promise with extraction result
   */
  public static async extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<ExtractionResult> {
    try {
      return await NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir);
    } catch (error) {
      console.error('Error extracting tar.bz2:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Instance methods
  private async ensureBaseDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.baseDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.baseDir, {
        intermediates: true,
      });
    }
  }

  private async getModelPath(
    modelType: ModelType,
    modelName: string
  ): Promise<string> {
    await this.ensureBaseDir();
    return `${this.baseDir}${modelType}/${modelName}`;
  }

  private async isModelDownloaded(
    modelType: ModelType,
    modelName: string
  ): Promise<boolean> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelInfo = await FileSystem.getInfoAsync(modelPath);
    return modelInfo.exists;
  }

  private async downloadModel(
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

  private async deleteModel(
    modelType: ModelType,
    modelName: string
  ): Promise<void> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelInfo = await FileSystem.getInfoAsync(modelPath);
    if (modelInfo.exists) {
      await FileSystem.deleteAsync(modelPath);
    }
  }

  private async getModelSize(
    modelType: ModelType,
    modelName: string
  ): Promise<number> {
    const modelPath = await this.getModelPath(modelType, modelName);
    const modelInfo = await FileSystem.getInfoAsync(modelPath);
    return modelInfo.exists ? modelInfo.size || 0 : 0;
  }
}
