import { NativeModules, Platform } from 'react-native';

interface SherpaOnnxInterface {
  // TTS methods
  initTts: (config: any) => Promise<any>;
  generateTts: (config: {
    text: string;
    speakerId?: number;
    speakingRate?: number;
    playAudio?: boolean;
    fileNamePrefix?: string | null;
    lengthScale?: number | null;
    noiseScale?: number | null;
    noiseScaleW?: number | null;
  }) => Promise<any>;
  stopTts: () => Promise<any>;
  releaseTts: () => Promise<any>;
  // ASR methods
  initAsr: (config: any) => Promise<any>;
  recognizeFromSamples: (sampleRate: number, samples: number[]) => Promise<any>;
  recognizeFromFile: (filePath: string) => Promise<any>;
  releaseAsr: () => Promise<any>;
  // Audio tagging methods
  initAudioTagging: (config: any) => Promise<any>;
  processAudioSamples: (sampleRate: number, samples: number[]) => Promise<any>;
  computeAudioTagging: () => Promise<any>;
  processAndComputeAudioTagging: (filePath: string) => Promise<any>;
  processAndComputeAudioSamples: (
    sampleRate: number,
    samples: number[]
  ) => Promise<any>;
  processAudioFile: (filePath: string) => Promise<any>;
  releaseAudioTagging: () => Promise<any>;
  // Speaker ID methods
  initSpeakerId: (config: any) => Promise<any>;
  processSpeakerIdSamples: (
    sampleRate: number,
    samples: number[]
  ) => Promise<any>;
  computeSpeakerEmbedding: () => Promise<any>;
  registerSpeaker: (name: string, embedding: number[]) => Promise<any>;
  removeSpeaker: (name: string) => Promise<any>;
  getSpeakers: () => Promise<any>;
  identifySpeaker: (embedding: number[], threshold: number) => Promise<any>;
  verifySpeaker: (
    name: string,
    embedding: number[],
    threshold: number
  ) => Promise<any>;
  processSpeakerIdFile: (filePath: string) => Promise<any>;
  releaseSpeakerId: () => Promise<any>;
  // Utility methods
  extractTarBz2: (sourcePath: string, targetDir: string) => Promise<any>;
  validateLibraryLoaded: () => Promise<any>;
}

const LINKING_ERROR =
  `The package '@siteed/sherpa-onnx.rn' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const NativeSherpaOnnx: SherpaOnnxInterface = NativeModules.SherpaOnnx
  ? NativeModules.SherpaOnnx
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export default NativeSherpaOnnx;
