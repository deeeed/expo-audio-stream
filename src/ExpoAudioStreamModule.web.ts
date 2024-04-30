import debug from "debug";
import { EventEmitter } from "expo-modules-core";

import {
  AudioEventPayload,
  AudioStreamResult,
  RecordingConfig,
  StartAudioStreamResult,
} from "./ExpoAudioStream.types";

const log = debug("expo-audio-stream:useAudioRecording");
class ExpoAudioStreamWeb extends EventEmitter {
  mediaRecorder: MediaRecorder | null;
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

    this.mediaRecorder = null;
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
  async startRecording(options: RecordingConfig = {}) {
    if (this.isRecording) {
      throw new Error("Recording is already in progress");
    }

    const stream = await this.getMediaStream();
    this.mediaRecorder = new MediaRecorder(stream);
    this.setupRecordingListeners();
    this.mediaRecorder.start(options.interval || this.currentInterval);
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.pausedTime = 0;
    this.lastEmittedSize = 0;
    this.lastEmittedTime = 0;
    this.streamUuid = this.generateUUID(); // Generate a UUID for the new recording session
    const fileUri = `${this.streamUuid}.webm`;
    const streamConfig: StartAudioStreamResult = {
      fileUri,
      mimeType: "audio/webm",
    };
    return streamConfig;
  }

  // Setup listeners for the MediaRecorder
  setupRecordingListeners() {
    if (!this.mediaRecorder) {
      throw new Error("No active media recorder");
    }
    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
      this.currentSize += event.data.size; // Update the size of the recording

      this.emitAudioEvent({ data: event.data, position: this.lastEmittedTime });
      this.lastEmittedTime = event.timeStamp;
      this.lastEmittedSize = this.currentSize;
    };

    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      log("Recording stopped", this.audioChunks);
    };

    this.mediaRecorder.onpause = () => {
      this.isPaused = true;
    };

    this.mediaRecorder.onresume = () => {
      this.isPaused = false;
      this.recordingStartTime += Date.now() - this.pausedTime; // Adjust start time after resuming
    };
  }

  emitAudioEvent({ data, position }: { data: Blob; position: number }) {
    const fileUri = `${this.streamUuid}.webm`;
    const audioEventPayload: AudioEventPayload = {
      fileUri,
      mimeType: "audio/webm",
      lastEmittedSize: this.lastEmittedSize, // Since this might be continuously streaming, adjust accordingly
      deltaSize: data.size,
      position,
      totalSize: this.currentSize,
      buffer: data,
      streamUuid: this.streamUuid ?? "", // Generate or manage UUID for stream identification
    };

    this.emit("AudioData", audioEventPayload);
  }

  // Helper method to generate a UUID
  generateUUID() {
    // Implementation of UUID generation (use a library or custom method)
    return "xxxx-xxxx-xxxx-xxxx".replace(/[x]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Stop recording
  async stopRecording(): Promise<AudioStreamResult | null> {
    this.mediaRecorder?.stop();
    this.isRecording = false;
    this.currentDurationMs = Date.now() - this.recordingStartTime;
    const result: AudioStreamResult = {
      fileUri: `${this.streamUuid}.webm`,
      duration: this.currentDurationMs,
      size: this.currentSize,
      mimeType: "audio/webm",
    };

    return result;
  }

  // Pause recording
  async pauseRecording() {
    if (!this.mediaRecorder) {
      throw new Error("No active media recorder");
    }

    if (this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      this.pausedTime = Date.now();
    } else {
      throw new Error("Recording is not active or already paused");
    }
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

  listAudioFiles() {
    // Not applicable on web
  }

  clearAudioFiles() {
    // Not applicable on web
  }
}

export default new ExpoAudioStreamWeb();
