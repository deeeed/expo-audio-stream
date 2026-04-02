export type MoonshineModelArch =
  | 'tiny'
  | 'base'
  | 'tiny-streaming'
  | 'base-streaming'
  | 'small-streaming'
  | 'medium-streaming';

export type MoonshineEmbeddingModelArch = 'gemma-300m';

export type MoonshineTranscriptEventType =
  | 'lineStarted'
  | 'lineUpdated'
  | 'lineTextChanged'
  | 'lineCompleted'
  | 'error';

export interface MoonshineModelOptions {
  identifySpeakers?: boolean;
  logApiCalls?: boolean;
  logOrtRuns?: boolean;
  logOutputText?: boolean;
  maxTokensPerSecond?: number;
  saveInputWavPath?: string;
  speakerIdClusterThreshold?: number;
  vadHopSize?: number;
  vadLookBehindSampleCount?: number;
  vadMaxSegmentDurationMs?: number;
  vadThreshold?: number;
  vadWindowDurationMs?: number;
  wordTimestamps?: boolean;
}

export interface MoonshineTranscriberOption {
  name: string;
  value: boolean | number | string;
}

export interface MoonshineLoadConfigBase {
  includeAudioData?: boolean;
  language?: string;
  modelArch: MoonshineModelArch | number;
  options?: MoonshineModelOptions;
  transcriberOptions?: MoonshineTranscriberOption[];
  updateIntervalMs?: number;
}

export interface MoonshineModelConfig extends MoonshineLoadConfigBase {
  modelPath: string;
}

export interface MoonshineAssetModelConfig extends MoonshineLoadConfigBase {
  assetPath: string;
}

export interface MoonshineMemoryModelConfig extends MoonshineLoadConfigBase {
  modelData: [number[], number[], number[]];
}

export interface MoonshineInitializeResult {
  success: boolean;
  error?: string;
  transcriberId?: string;
}

export interface MoonshineCreateIntentRecognizerConfig {
  modelPath: string;
  modelArch?: MoonshineEmbeddingModelArch | number;
  modelVariant?: string;
  threshold?: number;
}

export interface MoonshineIntentMatch {
  similarity: number;
  triggerPhrase: string;
  utterance: string;
}

export interface MoonshineIntentRecognizerResult {
  intentRecognizerId: string;
  success: boolean;
}

export interface MoonshineProcessUtteranceResult {
  matched: boolean;
  match?: MoonshineIntentMatch;
  success: boolean;
}

export interface MoonshineLineWordTiming {
  confidence?: number;
  endTimeMs?: number;
  startTimeMs?: number;
  word: string;
}

export interface MoonshineTranscriptLine {
  audioData?: number[];
  lineId: string;
  text: string;
  isFinal: boolean;
  hasSpeakerId?: boolean;
  isNew?: boolean;
  isUpdated?: boolean;
  startedAtMs?: number;
  completedAtMs?: number;
  durationMs?: number;
  hasTextChanged?: boolean;
  lastTranscriptionLatencyMs?: number;
  speakerId?: string;
  speakerIndex?: number;
  words?: MoonshineLineWordTiming[];
}

export interface MoonshineTranscriptEvent {
  type: MoonshineTranscriptEventType;
  error?: string;
  line?: MoonshineTranscriptLine;
  streamId: string;
  transcriberId: string;
}

export interface MoonshineTranscriptionResult {
  lines: MoonshineTranscriptLine[];
  text: string;
}

export interface MoonshineTranscribeOptions {
  chunkDurationMs?: number;
}

export interface MoonshinePlatformStatus {
  available: boolean;
  platform: 'android' | 'ios' | 'web';
  reason?: string;
}
