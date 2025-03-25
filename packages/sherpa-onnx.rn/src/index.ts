import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { AsrService } from './services/AsrService';
import { TtsService } from './services/TtsService';
import { AudioTaggingService } from './services/AudioTaggingService';

// Export the services
export const TTS = TtsService;
export const ASR = AsrService;
export const AudioTagging = AudioTaggingService;

// Export the Sherpa Onnx object with static methods
export const SherpaOnnx = {
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,
  initTts: SherpaOnnxAPI.initTts,
  generateTts: SherpaOnnxAPI.generateTts,
  stopTts: SherpaOnnxAPI.stopTts,
  releaseTts: SherpaOnnxAPI.releaseTts,
  initAsr: SherpaOnnxAPI.initAsr,
  recognizeFromSamples: SherpaOnnxAPI.recognizeFromSamples,
  recognizeFromFile: SherpaOnnxAPI.recognizeFromFile,
  releaseAsr: SherpaOnnxAPI.releaseAsr,
  initAudioTagging: SherpaOnnxAPI.initAudioTagging,
  processAndComputeAudioTagging: SherpaOnnxAPI.processAndComputeAudioTagging,
  processAndComputeAudioSamples: SherpaOnnxAPI.processAndComputeAudioSamples,
  releaseAudioTagging: SherpaOnnxAPI.releaseAudioTagging,
  TTS,
  ASR,
  AudioTagging,
};

// Export types
export * from './types/interfaces';
