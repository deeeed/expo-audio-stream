import type {
  TtsModelConfig,
  TtsInitResult,
  TtsGenerateResult,
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
  ValidateResult,
} from './types/interfaces';

declare const NativeSherpaOnnx: {
  // Library validation
  validateLibraryLoaded(): Promise<ValidateResult>;

  // TTS methods
  initTts(config: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(
    text: string,
    speakerId: number,
    speakingRate: number,
    playAudio: boolean
  ): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;

  // STT methods
  initStt(config: SttModelConfig): Promise<SttInitResult>;
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SttRecognizeResult>;
  recognizeFromFile(filePath: string): Promise<SttRecognizeResult>;
  releaseStt(): Promise<{ released: boolean }>;

  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    extractedFiles?: string[];
    error?: string;
  }>;
};

export default NativeSherpaOnnx;
