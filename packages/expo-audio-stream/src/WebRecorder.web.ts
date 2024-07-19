// src/WebRecorder.ts
import { AudioAnalysisData } from "./AudioAnalysis/AudioAnalysis.types";
import { RecordingConfig } from "./ExpoAudioStream.types";
import {
  EmitAudioAnalysisFunction,
  EmitAudioEventFunction,
} from "./ExpoAudioStream.web";
import { getLogger } from "./logger";
import { encodingToBitDepth } from "./utils/encodingToBitDepth";
import { InlineFeaturesExtractor } from "./workers/InlineFeaturesExtractor.web";
import { InlineAudioWebWorker } from "./workers/inlineAudioWebWorker.web";

interface AudioWorkletEvent {
  data: {
    command: string;
    recordedData?: ArrayBuffer;
    sampleRate?: number;
  };
}

interface AudioFeaturesEvent {
  data: {
    command: string;
    result: AudioAnalysisData;
  };
}

const DEFAULT_WEB_BITDEPTH = 32;
const DEFAULT_WEB_POINTS_PER_SECOND = 10;
const DEFAULT_WEB_INTERVAL = 500;
const DEFAULT_WEB_NUMBER_OF_CHANNELS = 1;

const TAG = "WebRecorder";
const logger = getLogger(TAG);

export class WebRecorder {
  private audioContext: AudioContext;
  private audioWorkletNode!: AudioWorkletNode;
  private featureExtractorWorker?: Worker;
  private source: MediaStreamAudioSourceNode;
  private audioWorkletUrl: string;
  private emitAudioEventCallback: EmitAudioEventFunction;
  private emitAudioAnalysisCallback: EmitAudioAnalysisFunction;
  private config: RecordingConfig;
  private position: number; // Track the cumulative position
  private numberOfChannels: number; // Number of audio channels
  private bitDepth: number; // Bit depth of the audio
  private exportBitDepth: number; // Bit depth of the audio
  private buffers: ArrayBuffer[]; // Array to store the buffers
  private audioAnalysisData: AudioAnalysisData; // Keep updating the full audio analysis data with latest events

  constructor({
    audioContext,
    source,
    recordingConfig,
    featuresExtratorUrl,
    audioWorkletUrl,
    emitAudioEventCallback,
    emitAudioAnalysisCallback,
  }: {
    audioContext: AudioContext;
    source: MediaStreamAudioSourceNode;
    recordingConfig: RecordingConfig;
    featuresExtratorUrl: string;
    audioWorkletUrl: string;
    emitAudioEventCallback: EmitAudioEventFunction;
    emitAudioAnalysisCallback: EmitAudioAnalysisFunction;
  }) {
    this.audioContext = audioContext;
    this.source = source;
    this.audioWorkletUrl = audioWorkletUrl;
    this.emitAudioEventCallback = emitAudioEventCallback;
    this.emitAudioAnalysisCallback = emitAudioAnalysisCallback;
    this.config = recordingConfig;
    this.position = 0;
    this.buffers = []; // Initialize the buffers array

    const audioContextFormat = this.checkAudioContextFormat({
      sampleRate: this.audioContext.sampleRate,
    });
    logger.debug("Initialized WebRecorder with config:", {
      sampleRate: audioContextFormat.sampleRate,
      bitDepth: audioContextFormat.bitDepth,
      numberOfChannels: audioContextFormat.numberOfChannels,
    });

    this.bitDepth = audioContextFormat.bitDepth;
    this.numberOfChannels =
      audioContextFormat.numberOfChannels || DEFAULT_WEB_NUMBER_OF_CHANNELS; // Default to 1 if not available
    this.exportBitDepth =
      encodingToBitDepth({
        encoding: recordingConfig.encoding ?? "pcm_32bit",
      }) ||
      audioContextFormat.bitDepth ||
      DEFAULT_WEB_BITDEPTH;

    this.audioAnalysisData = {
      amplitudeRange: { min: 0, max: 0 },
      dataPoints: [],
      durationMs: 0,
      samples: 0,
      bitDepth: this.bitDepth,
      numberOfChannels: this.numberOfChannels,
      sampleRate: this.config.sampleRate || this.audioContext.sampleRate,
      pointsPerSecond:
        this.config.pointsPerSecond || DEFAULT_WEB_POINTS_PER_SECOND,
      speakerChanges: [],
    };

    if (recordingConfig.enableProcessing) {
      this.initFeatureExtractorWorker();
    }
  }

  async init() {
    try {
      if (!this.audioWorkletUrl) {
        const blob = new Blob([InlineAudioWebWorker], {
          type: "application/javascript",
        });
        const url = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(url);
      } else {
        await this.audioContext.audioWorklet.addModule(this.audioWorkletUrl);
      }
      this.audioWorkletNode = new AudioWorkletNode(
        this.audioContext,
        "recorder-processor",
      );

      this.audioWorkletNode.port.onmessage = async (
        event: AudioWorkletEvent,
      ) => {
        const command = event.data.command;
        if (command !== "newData") {
          return;
        }
        // Handle the audio blob (e.g., send it to the server or process it further)
        logger.debug("Received audio blob from processor", event);
        const pcmBuffer = event.data.recordedData;

        if (!pcmBuffer) {
          return;
        }

        this.buffers.push(pcmBuffer); // Store the buffer
        const sampleRate =
          event.data.sampleRate ?? this.audioContext.sampleRate;
        const otherSampleRate = this.audioContext.sampleRate;

        // Pass the intermediary buffer to the feature extractor worker
        const pcmBufferCopy = pcmBuffer.slice(0);
        const channelData = new Float32Array(pcmBufferCopy);

        const duration = channelData.length / sampleRate; // Calculate duration of the current buffer
        const otherDuration =
          pcmBuffer.byteLength /
          (otherSampleRate * (this.exportBitDepth / this.numberOfChannels)); // Calculate duration of the current buffer
        logger.debug(
          `sampleRate=${sampleRate} Duration: ${duration} -- otherSampleRate=${otherSampleRate} Other duration: ${otherDuration}`,
        );

        this.emitAudioEventCallback({
          data: pcmBuffer,
          position: this.position,
        });
        this.position += duration; // Update position

        this.featureExtractorWorker?.postMessage(
          {
            command: "process",
            channelData,
            sampleRate: this.audioContext.sampleRate,
            pointsPerSecond:
              this.config.pointsPerSecond || DEFAULT_WEB_POINTS_PER_SECOND,
            algorithm: this.config.algorithm || "rms",
            bitDepth: this.bitDepth,
            fullAudioDurationMs: this.position * 1000,
            numberOfChannels: this.numberOfChannels,
            features: this.config.features,
          },
          [],
        );
      };

      logger.debug(
        `WebRecorder initialized -- recordSampleRate=${this.audioContext.sampleRate}`,
        this.config,
      );
      this.audioWorkletNode.port.postMessage({
        command: "init",
        recordSampleRate: this.audioContext.sampleRate, // Pass the original sample rate
        exportSampleRate:
          this.config.sampleRate ?? this.audioContext.sampleRate,
        bitDepth: this.bitDepth,
        exportBitDepth: this.exportBitDepth,
        channels: this.numberOfChannels,
        interval: this.config.interval ?? DEFAULT_WEB_INTERVAL,
      });

      // Connect the source to the AudioWorkletNode and start recording
      this.source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error(`[${TAG}] Failed to initialize WebRecorder`, error);
    }
  }

  initFeatureExtractorWorker(featuresExtratorUrl?: string) {
    try {
      if (featuresExtratorUrl) {
        // Initialize the feature extractor worker
        //TODO: create audio feature extractor from a Blob instead of url since we cannot include the url directly in the library
        // We keep the url during dev and use the blob in production.
        this.featureExtractorWorker = new Worker(
          new URL(featuresExtratorUrl, window.location.href),
        );
        this.featureExtractorWorker.onmessage =
          this.handleFeatureExtractorMessage.bind(this);
        this.featureExtractorWorker.onerror = this.handleWorkerError.bind(this);
      } else {
        // Fallback to the inline worker if the URL is not provided
        this.initFallbackWorker();
      }
    } catch (error) {
      console.error(
        `[${TAG}] Failed to initialize feature extractor worker`,
        error,
      );
      this.initFallbackWorker();
    }
  }

  initFallbackWorker() {
    try {
      const blob = new Blob([InlineFeaturesExtractor], {
        type: "application/javascript",
      });
      const url = URL.createObjectURL(blob);
      this.featureExtractorWorker = new Worker(url);
      this.featureExtractorWorker.onmessage =
        this.handleFeatureExtractorMessage.bind(this);
      this.featureExtractorWorker.onerror = (error) => {
        console.error(`[${TAG}] Default Inline worker failed`, error);
      };
      logger.log("Inline worker initialized successfully");
    } catch (error) {
      console.error(
        `[${TAG}] Failed to initialize Inline Feature Extractor worker`,
        error,
      );
    }
  }

  handleWorkerError(error: ErrorEvent) {
    console.error(`[${TAG}] Feature extractor worker error:`, error);
  }

  handleFeatureExtractorMessage(event: AudioFeaturesEvent) {
    if (event.data.command === "features") {
      const segmentResult = event.data.result;

      // Merge the segment result with the full audio analysis data
      this.audioAnalysisData.dataPoints.push(...segmentResult.dataPoints);
      this.audioAnalysisData.speakerChanges?.push(
        ...(segmentResult.speakerChanges ?? []),
      );
      this.audioAnalysisData.durationMs = segmentResult.durationMs;
      if (segmentResult.amplitudeRange) {
        this.audioAnalysisData.amplitudeRange = {
          min: Math.min(
            this.audioAnalysisData.amplitudeRange.min,
            segmentResult.amplitudeRange.min,
          ),
          max: Math.max(
            this.audioAnalysisData.amplitudeRange.max,
            segmentResult.amplitudeRange.max,
          ),
        };
      }
      // Handle the extracted features (e.g., emit an event or log them)
      logger.debug("features event segmentResult", segmentResult);
      logger.debug("features event audioAnalysisData", this.audioAnalysisData);
      this.emitAudioAnalysisCallback(segmentResult);
    }
  }

  start() {
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
  }

  stop(): Promise<ArrayBuffer[]> {
    return new Promise((resolve, reject) => {
      try {
        if (this.audioWorkletNode) {
          // this.source.disconnect(this.audioWorkletNode);
          // this.audioWorkletNode.disconnect(this.audioContext.destination);
          this.audioWorkletNode.port.postMessage({ command: "stop" });

          // Set a timeout to reject the promise if no message is received within 5 seconds
          const timeout = setTimeout(() => {
            this.audioWorkletNode.port.removeEventListener(
              "message",
              onMessage,
            );
            reject(
              new Error("Timeout error, audioWorkletNode didn't complete."),
            );
          }, 5000);

          // Listen for the recordedData message to confirm stopping
          const onMessage = async (event: AudioWorkletEvent) => {
            const command = event.data.command;
            if (command === "recordedData") {
              clearTimeout(timeout); // Clear the timeout

              const rawPCMDataFull = event.data.recordedData?.slice(
                0,
              ) as ArrayBuffer;

              // Compute duration of the recorded data
              const duration =
                rawPCMDataFull.byteLength /
                (this.audioContext.sampleRate *
                  (this.exportBitDepth / this.numberOfChannels));
              logger.debug(
                `Received recorded data -- Duration: ${duration} vs ${rawPCMDataFull.byteLength / this.audioContext.sampleRate} seconds`,
              );
              logger.debug(
                `recordedData.length=${rawPCMDataFull.byteLength} vs transmittedData.length=${this.buffers[0].byteLength}`,
              );

              // Remove the event listener after receiving the final data
              this.audioWorkletNode.port.removeEventListener(
                "message",
                onMessage,
              );
              resolve(this.buffers); // Resolve the promise with the collected buffers
            }
          };
          this.audioWorkletNode.port.addEventListener("message", onMessage);
        }

        // Stop all media stream tracks to stop the browser recording
        this.stopMediaStreamTracks();
      } catch (error) {
        reject(error);
      }
    });
  }

  pause() {
    this.source.disconnect(this.audioWorkletNode); // Disconnect the source from the AudioWorkletNode
    this.audioWorkletNode.disconnect(this.audioContext.destination); // Disconnect the AudioWorkletNode from the destination
    this.audioWorkletNode.port.postMessage({ command: "pause" });
  }

  stopMediaStreamTracks() {
    // Stop all audio tracks to stop the recording icon
    const tracks = this.source.mediaStream.getTracks();
    tracks.forEach((track) => track.stop());
  }

  async playRecordedData({
    recordedData,
  }: {
    recordedData: ArrayBuffer;
    mimeType?: string;
  }) {
    try {
      const blob = new Blob([recordedData]);
      const url = URL.createObjectURL(blob);
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();

      // Decode the audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create a buffer source node and play the audio
      const bufferSource = this.audioContext.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(this.audioContext.destination);
      bufferSource.start();
      logger.debug("Playing recorded data", recordedData);
    } catch (error) {
      console.error(`[${TAG}] Failed to play recorded data:`, error);
    }
  }

  private checkAudioContextFormat({ sampleRate }: { sampleRate: number }) {
    // Create a silent AudioBuffer
    const frameCount = sampleRate * 1.0; // 1 second buffer
    const audioBuffer = this.audioContext.createBuffer(
      1,
      frameCount,
      sampleRate,
    );

    // Check the format
    const channelData = audioBuffer.getChannelData(0);
    const bitDepth = channelData.BYTES_PER_ELEMENT * 8; // 4 bytes per element means 32-bit

    return {
      sampleRate: audioBuffer.sampleRate,
      bitDepth,
      numberOfChannels: audioBuffer.numberOfChannels,
    };
  }

  resume() {
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
    this.audioWorkletNode.port.postMessage({ command: "resume" });
  }
}
