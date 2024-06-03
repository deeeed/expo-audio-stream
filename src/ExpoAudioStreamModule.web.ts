import debug from "debug";
import { EventEmitter } from "expo-modules-core";

import {
  AudioEventPayload,
  AudioStreamResult,
  RecordingConfig,
  StartAudioStreamResult,
} from "./ExpoAudioStream.types";
import { WebRecorder } from "./WebRecorder";
import { quickUUID } from "./utils";

const log = debug("expo-audio-stream:useAudioRecording");
class ExpoAudioStreamWeb extends EventEmitter {
  customRecorder: WebRecorder | null;
  audioChunks: Blob[];
  isRecording: boolean;
  isPaused: boolean;
  recordingStartTime: number;
  pausedTime: number;
  currentDurationMs: number;
  currentSize: number;
  currentInterval: number;
  lastEmittedSize: number;
  lastEmittedTime: number;
  streamUuid: string | null;
  extension: "webm" | "wav" = "wav"; // Default extension is 'webm'
  recordingConfig?: RecordingConfig;

  constructor() {
    const mockNativeModule = {
      addListener: (eventName: string) => {
        // Not used on web
      },
      removeListeners: (count: number) => {
        // Not used on web
      },
    };
    super(mockNativeModule); // Pass the mock native module to the parent class

    this.customRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.recordingStartTime = 0;
    this.pausedTime = 0;
    this.currentDurationMs = 0;
    this.currentSize = 0;
    this.currentInterval = 1000; // Default interval in ms
    this.lastEmittedSize = 0;
    this.lastEmittedTime = 0;
    this.streamUuid = null; // Initialize UUID on first recording start
  }

  // Utility to handle user media stream
  async getMediaStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error("Failed to get media stream:", error);
      throw error;
    }
  }

  // Start recording with options
  async startRecording(recordingConfig: RecordingConfig = {}) {
    if (this.isRecording) {
      throw new Error("Recording is already in progress");
    }

    const audioContext = new (window.AudioContext ||
      // @ts-ignore - Allow webkitAudioContext for Safari
      window.webkitAudioContext)();
    const stream = await this.getMediaStream();

    const source = audioContext.createMediaStreamSource(stream);

    this.customRecorder = new WebRecorder(
      audioContext,
      source,
      recordingConfig,
      (data, position) => {
        this.audioChunks.push(data);
        this.currentSize += data.size;
        this.emitAudioEvent({ data, position });
        this.lastEmittedTime = Date.now();
        this.lastEmittedSize = this.currentSize;
      }
    );
    await this.customRecorder.init();
    this.customRecorder.start();

    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.pausedTime = 0;
    this.lastEmittedSize = 0;
    this.lastEmittedTime = 0;
    this.streamUuid = quickUUID(); // Generate a UUID for the new recording session
    const fileUri = `${this.streamUuid}.${this.extension}`;
    const streamConfig: StartAudioStreamResult = {
      fileUri,
      mimeType: `audio/${this.extension}`,
    };
    return streamConfig;
  }

  emitAudioEvent({ data, position }: { data: Blob; position: number }) {
    const fileUri = `${this.streamUuid}.${this.extension}`;
    const audioEventPayload: AudioEventPayload = {
      fileUri,
      mimeType: `audio/${this.extension}`,
      lastEmittedSize: this.lastEmittedSize, // Since this might be continuously streaming, adjust accordingly
      deltaSize: data.size,
      position,
      totalSize: this.currentSize,
      buffer: data,
      streamUuid: this.streamUuid ?? "", // Generate or manage UUID for stream identification
    };

    this.emit("AudioData", audioEventPayload);
  }

  // Stop recording
  async stopRecording(): Promise<AudioStreamResult | null> {
    if (this.customRecorder) {
      this.customRecorder.stop();
    }
    this.isRecording = false;
    this.currentDurationMs = Date.now() - this.recordingStartTime;
    const result: AudioStreamResult = {
      fileUri: `${this.streamUuid}.${this.extension}`,
      duration: this.currentDurationMs,
      size: this.currentSize,
      mimeType: `audio/${this.extension}`,
    };

    return result;
  }

  // Pause recording
  async pauseRecording() {
    if (!this.isRecording || this.isPaused) {
      throw new Error("Recording is not active or already paused");
    }

    if (this.customRecorder) {
      this.customRecorder.stop();
    }
    this.isPaused = true;
    this.pausedTime = Date.now();
  }

  // Resume recording
  async resumeRecording() {
    if (!this.isPaused) {
      throw new Error("Recording is not paused");
    }

    if (this.customRecorder) {
      this.customRecorder.resume();
    }
    this.isPaused = false;
    this.recordingStartTime += Date.now() - this.pausedTime;
  }

  // Get current status
  status() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: Date.now() - this.recordingStartTime,
      size: this.currentSize,
      interval: this.currentInterval,
    };
  }
}

export default new ExpoAudioStreamWeb();
