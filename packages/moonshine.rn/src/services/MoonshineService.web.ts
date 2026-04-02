import { Platform } from 'react-native';
import type {
  MoonshineAssetModelConfig,
  MoonshineCreateIntentRecognizerConfig,
  MoonshineInitializeResult,
  MoonshineLoadConfigBase,
  MoonshineMemoryModelConfig,
  MoonshineModelConfig,
  MoonshinePlatformStatus,
  MoonshineProcessUtteranceResult,
  MoonshineTranscriptEvent,
  MoonshineTranscriptionResult,
  MoonshineTranscribeOptions,
} from '../types/interfaces';
import {
  normalizeMoonshineWebModelArch,
  resolveMoonshineWebModelBasePath,
  getMoonshineWebRuntimeVersion,
} from '../web/config';
import { MoonshineWebModel } from '../web/MoonshineWebModel';

type MoonshineListener = (event: MoonshineTranscriptEvent) => void;

type WebTranscriberState = {
  activeStreamHandles: Set<string>;
  config: MoonshineLoadConfigBase;
  defaultStreamId: string;
  id: string;
  model: MoonshineWebModel;
  modelBasePath: string;
  nextStreamId: number;
  streams: Map<string, WebStreamState>;
};

type WebStreamState = {
  currentLineId: string | null;
  currentLineText: string;
  inFlight: boolean;
  isStarted: boolean;
  lastCompletedAtMs: number;
  lastEmittedText: string;
  lastRequestedAtMs: number;
  lastTranscribedDurationMs: number;
  lineCounter: number;
  lookBehindSamples: number[];
  pendingFinalize: boolean;
  pendingRun: boolean;
  processedDurationMs: number;
  sampleRate: number | null;
  segmentSamples: number[];
  segmentStartedAtMs: number | null;
  silenceDurationMs: number;
  startedEventEmitted: boolean;
  streamId: string;
  transcriberId: string;
};

function unsupportedOnWeb(operation: string): never {
  throw new Error(
    `Moonshine ${operation} is not implemented on web yet. The current package-owned web backend supports transcription but not web intent recognition or in-memory model loading.`
  );
}

function createResult(
  transcriberId: string,
  text: string,
  latencyMs?: number
): MoonshineTranscriptionResult {
  const normalizedText = text.trim();
  return {
    text: normalizedText,
    lines: normalizedText
      ? [
          {
            completedAtMs: Date.now(),
            isFinal: true,
            lastTranscriptionLatencyMs: latencyMs,
            lineId: `${transcriberId}:line:1`,
            text: normalizedText,
          },
        ]
      : [],
  };
}

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_UPDATE_INTERVAL_MS = 250;
const DEFAULT_VAD_THRESHOLD = 0.008;
const DEFAULT_END_SILENCE_MS = 500;
const DEFAULT_LOOK_BEHIND_SAMPLES = 1600;
const DEFAULT_MAX_SEGMENT_DURATION_MS = 15000;
const MIN_TRANSCRIBE_SAMPLES = 1600;

function createStreamState(
  transcriberId: string,
  streamId: string
): WebStreamState {
  return {
    currentLineId: null,
    currentLineText: '',
    inFlight: false,
    isStarted: false,
    lastCompletedAtMs: 0,
    lastEmittedText: '',
    lastRequestedAtMs: 0,
    lastTranscribedDurationMs: 0,
    lineCounter: 0,
    lookBehindSamples: [],
    pendingFinalize: false,
    pendingRun: false,
    processedDurationMs: 0,
    sampleRate: null,
    segmentSamples: [],
    segmentStartedAtMs: null,
    silenceDurationMs: 0,
    startedEventEmitted: false,
    streamId,
    transcriberId,
  };
}

function normalizeTranscriptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function computeRms(samples: number[]): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (const sample of samples) {
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples.length);
}

function trimToLastSamples(samples: number[], maxLength: number): number[] {
  if (maxLength <= 0 || samples.length <= maxLength) {
    return samples;
  }
  return samples.slice(samples.length - maxLength);
}

export class MoonshineTranscriber {
  public constructor(
    private readonly service: MoonshineService,
    public readonly transcriberId: string
  ) {}

  public addAudio(
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    return this.service.addAudioForTranscriber(
      this.transcriberId,
      samples,
      sampleRate
    );
  }

  public addAudioToStream(
    streamId: string,
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    return this.service.addAudioToStreamForTranscriber(
      this.transcriberId,
      streamId,
      samples,
      sampleRate
    );
  }

  public addListener(listener: MoonshineListener): () => void {
    return this.service.addListener((event) => {
      if (event.transcriberId === this.transcriberId) {
        listener(event);
      }
    });
  }

  public async createStream(): Promise<string> {
    return this.service.createStreamForTranscriber(this.transcriberId);
  }

  public release(): Promise<{ released: boolean }> {
    return this.service.releaseTranscriber(this.transcriberId);
  }

  public removeStream(_streamId: string): Promise<{ success: boolean }> {
    return this.service.removeStreamForTranscriber(this.transcriberId, _streamId);
  }

  public start(): Promise<{ success: boolean }> {
    return this.service.startTranscriber(this.transcriberId);
  }

  public startStream(streamId: string): Promise<{ success: boolean }> {
    return this.service.startStreamForTranscriber(this.transcriberId, streamId);
  }

  public stop(): Promise<{ success: boolean }> {
    return this.service.stopTranscriber(this.transcriberId);
  }

  public stopStream(streamId: string): Promise<{ success: boolean }> {
    return this.service.stopStreamForTranscriber(this.transcriberId, streamId);
  }

  public transcribeFromSamples(
    sampleRate: number,
    samples: number[],
    options?: MoonshineTranscribeOptions
  ): Promise<MoonshineTranscriptionResult> {
    return this.service.transcribeFromSamplesForTranscriber(
      this.transcriberId,
      sampleRate,
      samples,
      options
    );
  }

  public transcribeWithoutStreaming(
    sampleRate: number,
    samples: number[]
  ): Promise<MoonshineTranscriptionResult> {
    return this.service.transcribeWithoutStreamingForTranscriber(
      this.transcriberId,
      sampleRate,
      samples
    );
  }
}

export class MoonshineIntentRecognizer {
  public constructor(public readonly intentRecognizerId: string) {}

  public clearIntents(): Promise<{ success: boolean }> {
    return unsupportedOnWeb('clearIntents()');
  }

  public getIntentCount(): Promise<number> {
    return unsupportedOnWeb('getIntentCount()');
  }

  public getIntentThreshold(): Promise<number> {
    return unsupportedOnWeb('getIntentThreshold()');
  }

  public processUtterance(
    _utterance: string
  ): Promise<MoonshineProcessUtteranceResult> {
    return unsupportedOnWeb('processUtterance()');
  }

  public registerIntent(_triggerPhrase: string): Promise<{ success: boolean }> {
    return unsupportedOnWeb('registerIntent()');
  }

  public release(): Promise<{ success: boolean }> {
    return unsupportedOnWeb('releaseIntentRecognizer()');
  }

  public setIntentThreshold(_threshold: number): Promise<{ success: boolean }> {
    return unsupportedOnWeb('setIntentThreshold()');
  }

  public unregisterIntent(
    _triggerPhrase: string
  ): Promise<{ success: boolean }> {
    return unsupportedOnWeb('unregisterIntent()');
  }
}

export class MoonshineService {
  private defaultTranscriber: MoonshineTranscriber | null = null;
  private listeners = new Set<MoonshineListener>();
  private modelCache = new Map<string, MoonshineWebModel>();
  private nextTranscriberId = 1;
  private readonly transcribers = new Map<string, WebTranscriberState>();

  public addAudio(
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().addAudio(samples, sampleRate);
  }

  public addAudioForTranscriber(
    transcriberId: string,
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    return this.addAudioToStreamState(
      state,
      this.getStreamState(state, state.defaultStreamId),
      samples,
      sampleRate
    );
  }

  public addAudioToStream(
    streamId: string,
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().addAudioToStream(
      streamId,
      samples,
      sampleRate
    );
  }

  public addAudioToStreamForTranscriber(
    transcriberId: string,
    streamId: string,
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    return this.addAudioToStreamState(
      state,
      this.getStreamState(state, streamId),
      samples,
      sampleRate
    );
  }

  public addListener(listener: MoonshineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clearIntents(
    _intentRecognizerId: string
  ): Promise<{ success: boolean }> {
    return unsupportedOnWeb('clearIntents()');
  }

  public async createIntentRecognizer(
    _config: MoonshineCreateIntentRecognizerConfig
  ): Promise<MoonshineIntentRecognizer> {
    return unsupportedOnWeb('createIntentRecognizer()');
  }

  public async createStream(): Promise<string> {
    return this.ensureDefaultTranscriber().createStream();
  }

  public async createStreamForTranscriber(
    transcriberId: string
  ): Promise<string> {
    const state = this.getTranscriberState(transcriberId);
    const streamId = `${transcriberId}:stream:${state.nextStreamId++}`;
    state.streams.set(streamId, createStreamState(transcriberId, streamId));
    state.activeStreamHandles.add(streamId);
    return streamId;
  }

  public async createTranscriberFromAssets(
    config: MoonshineAssetModelConfig
  ): Promise<MoonshineTranscriber> {
    return this.createTranscriberFromResult(
      await this.createWebTranscriber(config, config.assetPath)
    );
  }

  public async createTranscriberFromFiles(
    config: MoonshineModelConfig
  ): Promise<MoonshineTranscriber> {
    return this.createTranscriberFromResult(
      await this.createWebTranscriber(config, config.modelPath)
    );
  }

  public async createTranscriberFromMemory(
    _config: MoonshineMemoryModelConfig
  ): Promise<MoonshineTranscriber> {
    return unsupportedOnWeb('createTranscriberFromMemory()');
  }

  public async errorToString(code: number): Promise<string> {
    return `Moonshine web error ${code}`;
  }

  public async getIntentCount(_intentRecognizerId: string): Promise<number> {
    return unsupportedOnWeb('getIntentCount()');
  }

  public async getIntentThreshold(
    _intentRecognizerId: string
  ): Promise<number> {
    return unsupportedOnWeb('getIntentThreshold()');
  }

  public getPlatformStatus(): MoonshinePlatformStatus {
    return {
      available: true,
      platform: Platform.OS as 'web',
    };
  }

  public async getVersion(): Promise<number> {
    return getMoonshineWebRuntimeVersion();
  }

  public isAvailable(): boolean {
    return true;
  }

  public async initialize(
    config: MoonshineModelConfig
  ): Promise<MoonshineInitializeResult> {
    return this.loadFromFiles(config);
  }

  public async loadFromAssets(
    config: MoonshineAssetModelConfig
  ): Promise<MoonshineInitializeResult> {
    return this.loadDefaultTranscriberFromResult(
      await this.createWebTranscriber(config, config.assetPath)
    );
  }

  public async loadFromFiles(
    config: MoonshineModelConfig
  ): Promise<MoonshineInitializeResult> {
    return this.loadDefaultTranscriberFromResult(
      await this.createWebTranscriber(config, config.modelPath)
    );
  }

  public async loadFromMemory(
    _config: MoonshineMemoryModelConfig
  ): Promise<MoonshineInitializeResult> {
    return unsupportedOnWeb('loadFromMemory()');
  }

  public async release(): Promise<{ released: boolean }> {
    const transcriberId = this.defaultTranscriber?.transcriberId;
    this.defaultTranscriber = null;
    if (!transcriberId) {
      return { released: true };
    }
    return this.releaseTranscriber(transcriberId);
  }

  public async releaseTranscriber(
    transcriberId: string
  ): Promise<{ released: boolean }> {
    const state = this.transcribers.get(transcriberId);
    if (state) {
      for (const stream of state.streams.values()) {
        stream.isStarted = false;
        stream.pendingFinalize = false;
        stream.pendingRun = false;
      }
      this.transcribers.delete(transcriberId);
    }
    if (this.defaultTranscriber?.transcriberId === transcriberId) {
      this.defaultTranscriber = null;
    }
    return { released: true };
  }

  public releaseIntentRecognizer(
    _intentRecognizerId: string
  ): Promise<{ success: boolean }> {
    return unsupportedOnWeb('releaseIntentRecognizer()');
  }

  public removeAllListeners(): void {
    this.listeners.clear();
  }

  public async removeStream(streamId: string): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().removeStream(streamId);
  }

  public removeStreamForTranscriber(
    transcriberId: string,
    streamId: string
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    if (streamId === state.defaultStreamId) {
      throw new Error('Moonshine web cannot remove the default stream');
    }
    const stream = this.getStreamState(state, streamId);
    stream.isStarted = false;
    state.streams.delete(streamId);
    state.activeStreamHandles.delete(streamId);
    return Promise.resolve({ success: true });
  }

  public processUtterance(
    _intentRecognizerId: string,
    _utterance: string
  ): Promise<MoonshineProcessUtteranceResult> {
    return unsupportedOnWeb('processUtterance()');
  }

  public registerIntent(
    _intentRecognizerId: string,
    _triggerPhrase: string
  ): Promise<{ success: boolean }> {
    return unsupportedOnWeb('registerIntent()');
  }

  public setIntentThreshold(
    _intentRecognizerId: string,
    _threshold: number
  ): Promise<{ success: boolean }> {
    return unsupportedOnWeb('setIntentThreshold()');
  }

  public async start(): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().start();
  }

  public startTranscriber(
    transcriberId: string
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    const stream = this.getStreamState(state, state.defaultStreamId);
    stream.isStarted = true;
    return Promise.resolve({ success: true });
  }

  public async startStream(streamId: string): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().startStream(streamId);
  }

  public startStreamForTranscriber(
    transcriberId: string,
    streamId: string
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    const stream = this.getStreamState(state, streamId);
    stream.isStarted = true;
    return Promise.resolve({ success: true });
  }

  public async stop(): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().stop();
  }

  public stopTranscriber(
    transcriberId: string
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    return this.stopStreamInternal(state, state.defaultStreamId);
  }

  public async stopStream(streamId: string): Promise<{ success: boolean }> {
    return this.ensureDefaultTranscriber().stopStream(streamId);
  }

  public stopStreamForTranscriber(
    transcriberId: string,
    streamId: string
  ): Promise<{ success: boolean }> {
    const state = this.getTranscriberState(transcriberId);
    return this.stopStreamInternal(state, streamId);
  }

  public async transcribeFromSamples(
    sampleRate: number,
    samples: number[],
    options?: MoonshineTranscribeOptions
  ): Promise<MoonshineTranscriptionResult> {
    return this.ensureDefaultTranscriber().transcribeFromSamples(
      sampleRate,
      samples,
      options
    );
  }

  public async transcribeFromSamplesForTranscriber(
    transcriberId: string,
    sampleRate: number,
    samples: number[],
    _options?: MoonshineTranscribeOptions
  ): Promise<MoonshineTranscriptionResult> {
    return this.runTranscription(transcriberId, sampleRate, samples);
  }

  public async transcribeWithoutStreaming(
    sampleRate: number,
    samples: number[]
  ): Promise<MoonshineTranscriptionResult> {
    return this.ensureDefaultTranscriber().transcribeWithoutStreaming(
      sampleRate,
      samples
    );
  }

  public async transcribeWithoutStreamingForTranscriber(
    transcriberId: string,
    sampleRate: number,
    samples: number[]
  ): Promise<MoonshineTranscriptionResult> {
    return this.runTranscription(transcriberId, sampleRate, samples);
  }

  public unregisterIntent(
    _intentRecognizerId: string,
    _triggerPhrase: string
  ): Promise<{ success: boolean }> {
    return unsupportedOnWeb('unregisterIntent()');
  }

  private createTranscriberFromResult(
    result: MoonshineInitializeResult
  ): MoonshineTranscriber {
    if (!result.success || !result.transcriberId) {
      throw new Error(result.error || 'Failed to create Moonshine transcriber');
    }
    return new MoonshineTranscriber(this, result.transcriberId);
  }

  private async createWebTranscriber(
    config: MoonshineLoadConfigBase,
    candidatePath: string | undefined
  ): Promise<MoonshineInitializeResult> {
    try {
      const normalizedArch = normalizeMoonshineWebModelArch(config.modelArch);
      const modelBasePath = resolveMoonshineWebModelBasePath(
        candidatePath,
        normalizedArch
      );
      const stateId = `web-transcriber-${this.nextTranscriberId++}`;
      const cacheKey = `${normalizedArch}::${modelBasePath}`;
      let model = this.modelCache.get(cacheKey);
      if (!model) {
        model = new MoonshineWebModel(normalizedArch, modelBasePath);
        this.modelCache.set(cacheKey, model);
      }
      await model.load();
      const defaultStreamId = `${stateId}:default`;
      this.transcribers.set(stateId, {
        activeStreamHandles: new Set([defaultStreamId]),
        config,
        defaultStreamId,
        id: stateId,
        model,
        modelBasePath,
        nextStreamId: 1,
        streams: new Map([
          [defaultStreamId, createStreamState(stateId, defaultStreamId)],
        ]),
      });
      return {
        success: true,
        transcriberId: stateId,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        success: false,
      };
    }
  }

  private emit(event: MoonshineTranscriptEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private ensureDefaultTranscriber(): MoonshineTranscriber {
    if (!this.defaultTranscriber) {
      throw new Error(
        'Moonshine default transcriber is not initialized. Call loadFromFiles() or loadFromAssets() first.'
      );
    }
    return this.defaultTranscriber;
  }

  private getTranscriberState(transcriberId: string): WebTranscriberState {
    const state = this.transcribers.get(transcriberId);
    if (!state) {
      throw new Error(`Moonshine web transcriber "${transcriberId}" does not exist`);
    }
    return state;
  }

  private loadDefaultTranscriberFromResult(
    result: MoonshineInitializeResult
  ): MoonshineInitializeResult {
    this.defaultTranscriber =
      result.success && result.transcriberId
        ? new MoonshineTranscriber(this, result.transcriberId)
        : null;
    return result;
  }

  private async runTranscription(
    transcriberId: string,
    sampleRate: number,
    samples: number[]
  ): Promise<MoonshineTranscriptionResult> {
    if (sampleRate !== DEFAULT_SAMPLE_RATE) {
      throw new Error(
        `Moonshine web currently expects ${DEFAULT_SAMPLE_RATE}Hz mono PCM. Received sample rate: ${sampleRate}`
      );
    }

    const state = this.getTranscriberState(transcriberId);
    const text = await state.model.transcribe(Float32Array.from(samples));
    const result = createResult(transcriberId, text, state.model.getLatency());

    if (result.lines[0]) {
      this.emit({
        line: result.lines[0],
        streamId: `${transcriberId}:default`,
        transcriberId,
        type: 'lineCompleted',
      });
    }

    return result;
  }

  private getStreamState(
    transcriber: WebTranscriberState,
    streamId: string
  ): WebStreamState {
    const stream = transcriber.streams.get(streamId);
    if (!stream || !transcriber.activeStreamHandles.has(streamId)) {
      throw new Error(
        `Moonshine web stream "${streamId}" does not exist for transcriber "${transcriber.id}"`
      );
    }
    return stream;
  }

  private async addAudioToStreamState(
    transcriber: WebTranscriberState,
    stream: WebStreamState,
    samples: number[],
    sampleRate: number
  ): Promise<{ success: boolean }> {
    if (!stream.isStarted) {
      throw new Error(
        `Moonshine web stream "${stream.streamId}" is not started. Call start() first.`
      );
    }
    if (sampleRate !== DEFAULT_SAMPLE_RATE) {
      throw new Error(
        `Moonshine web currently expects ${DEFAULT_SAMPLE_RATE}Hz mono PCM. Received sample rate: ${sampleRate}`
      );
    }
    if (samples.length === 0) {
      return { success: true };
    }

    stream.sampleRate = sampleRate;
    const chunkDurationMs = (samples.length / sampleRate) * 1000;
    const rms = computeRms(samples);
    const options = transcriber.config.options;
    const vadThreshold = options?.vadThreshold ?? DEFAULT_VAD_THRESHOLD;
    const endSilenceMs = DEFAULT_END_SILENCE_MS;
    const lookBehindSampleCount = Math.max(
      0,
      options?.vadLookBehindSampleCount ?? DEFAULT_LOOK_BEHIND_SAMPLES
    );
    const maxSegmentDurationMs = Math.max(
      1000,
      options?.vadMaxSegmentDurationMs ?? DEFAULT_MAX_SEGMENT_DURATION_MS
    );
    const isSpeechChunk =
      rms >= vadThreshold || (stream.currentLineId != null && rms >= vadThreshold * 0.5);
    const previousLookBehind = stream.lookBehindSamples;

    if (isSpeechChunk) {
      if (!stream.currentLineId) {
        stream.lineCounter += 1;
        stream.currentLineId = `${stream.streamId}:line:${stream.lineCounter}`;
        stream.currentLineText = '';
        stream.lastEmittedText = '';
        stream.startedEventEmitted = false;
        stream.segmentStartedAtMs = Math.max(
          0,
          stream.processedDurationMs -
            (previousLookBehind.length / sampleRate) * 1000
        );
        stream.segmentSamples = [...previousLookBehind, ...samples];
      } else {
        stream.segmentSamples.push(...samples);
      }
      stream.silenceDurationMs = 0;
      const updateIntervalMs =
        transcriber.config.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS;
      if (
        stream.pendingFinalize ||
        stream.processedDurationMs - stream.lastRequestedAtMs >= updateIntervalMs
      ) {
        stream.pendingRun = true;
        stream.lastRequestedAtMs = stream.processedDurationMs;
      }
    } else if (stream.currentLineId) {
      stream.segmentSamples.push(...samples);
      stream.silenceDurationMs += chunkDurationMs;
      if (stream.silenceDurationMs >= endSilenceMs) {
        stream.pendingFinalize = true;
        stream.pendingRun = true;
        stream.lastRequestedAtMs = stream.processedDurationMs;
      }
    }

    stream.lookBehindSamples = trimToLastSamples(
      [...previousLookBehind, ...samples],
      lookBehindSampleCount
    );

    stream.processedDurationMs += chunkDurationMs;

    if (
      stream.currentLineId &&
      stream.segmentStartedAtMs != null &&
      stream.processedDurationMs - stream.segmentStartedAtMs >= maxSegmentDurationMs
    ) {
      stream.pendingFinalize = true;
    }

    this.scheduleStreamTranscription(transcriber, stream);
    return { success: true };
  }

  private scheduleStreamTranscription(
    transcriber: WebTranscriberState,
    stream: WebStreamState
  ): void {
    if (stream.inFlight || !stream.currentLineId) {
      return;
    }
    stream.inFlight = true;
    void this.runQueuedStreamTranscription(transcriber, stream).finally(() => {
      stream.inFlight = false;
      if (stream.pendingRun || stream.pendingFinalize) {
        this.scheduleStreamTranscription(transcriber, stream);
      }
    });
  }

  private async runQueuedStreamTranscription(
    transcriber: WebTranscriberState,
    stream: WebStreamState
  ): Promise<void> {
    while (
      transcriber.activeStreamHandles.has(stream.streamId) &&
      stream.currentLineId &&
      (stream.pendingRun || stream.pendingFinalize)
    ) {
      stream.pendingRun = false;
      const lineId = stream.currentLineId;
      const sampleRate = stream.sampleRate ?? DEFAULT_SAMPLE_RATE;
      const durationMs = (stream.segmentSamples.length / sampleRate) * 1000;
      if (stream.segmentSamples.length < MIN_TRANSCRIBE_SAMPLES) {
        if (stream.pendingFinalize) {
          this.resetCurrentLine(stream);
        }
        continue;
      }

      const shouldFinalize = stream.pendingFinalize;
      stream.pendingFinalize = false;
      const snapshotSamples = Float32Array.from(stream.segmentSamples);
      const startedAtMs = stream.segmentStartedAtMs ?? Math.max(0, stream.processedDurationMs - durationMs);

      try {
        const text = normalizeTranscriptText(
          await transcriber.model.transcribe(snapshotSamples)
        );
        if (stream.currentLineId !== lineId) {
          continue;
        }

        const latencyMs = transcriber.model.getLatency();
        const completedAtMs = Math.max(
          startedAtMs,
          startedAtMs + durationMs
        );
        const baseLine = {
          audioData:
            shouldFinalize && transcriber.config.includeAudioData
              ? Array.from(snapshotSamples)
              : undefined,
          completedAtMs: shouldFinalize ? completedAtMs : undefined,
          durationMs,
          isFinal: shouldFinalize,
          lastTranscriptionLatencyMs: latencyMs,
          lineId,
          startedAtMs,
          text,
        };

        if (text) {
          if (!stream.startedEventEmitted) {
            stream.startedEventEmitted = true;
            this.emit({
              line: {
                ...baseLine,
                isFinal: false,
                isNew: true,
              },
              streamId: stream.streamId,
              transcriberId: transcriber.id,
              type: 'lineStarted',
            });
          } else {
            this.emit({
              line: {
                ...baseLine,
                hasTextChanged: text !== stream.lastEmittedText,
                isFinal: false,
                isUpdated: true,
              },
              streamId: stream.streamId,
              transcriberId: transcriber.id,
              type: 'lineUpdated',
            });
          }

          if (text !== stream.lastEmittedText) {
            this.emit({
              line: {
                ...baseLine,
                hasTextChanged: true,
                isFinal: false,
                isUpdated: stream.startedEventEmitted,
              },
              streamId: stream.streamId,
              transcriberId: transcriber.id,
              type: 'lineTextChanged',
            });
          }

          stream.currentLineText = text;
          stream.lastEmittedText = text;
          stream.lastTranscribedDurationMs = durationMs;
        }

        if (shouldFinalize) {
          if (text) {
            this.emit({
              line: {
                ...baseLine,
                completedAtMs,
                isFinal: true,
              },
              streamId: stream.streamId,
              transcriberId: transcriber.id,
              type: 'lineCompleted',
            });
          }
          stream.lastCompletedAtMs = completedAtMs;
          this.resetCurrentLine(stream);
        }
      } catch (error) {
        this.emit({
          error: error instanceof Error ? error.message : String(error),
          streamId: stream.streamId,
          transcriberId: transcriber.id,
          type: 'error',
        });
        if (shouldFinalize) {
          this.resetCurrentLine(stream);
        }
      }
    }
  }

  private resetCurrentLine(stream: WebStreamState): void {
    stream.currentLineId = null;
    stream.currentLineText = '';
    stream.lastEmittedText = '';
    stream.lastRequestedAtMs = 0;
    stream.segmentSamples = [];
    stream.segmentStartedAtMs = null;
    stream.silenceDurationMs = 0;
    stream.startedEventEmitted = false;
    stream.pendingFinalize = false;
    stream.pendingRun = false;
    stream.lastTranscribedDurationMs = 0;
  }

  private async stopStreamInternal(
    transcriber: WebTranscriberState,
    streamId: string
  ): Promise<{ success: boolean }> {
    const stream = this.getStreamState(transcriber, streamId);
    stream.isStarted = false;
    if (stream.currentLineId && stream.segmentSamples.length > 0) {
      stream.pendingRun = true;
      stream.pendingFinalize = true;
      this.scheduleStreamTranscription(transcriber, stream);
      while (stream.inFlight || stream.pendingRun || stream.pendingFinalize) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    return { success: true };
  }
}
