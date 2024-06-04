import { useRef } from "react";

import { RecordingConfig } from "./ExpoAudioStream.types";
import {
  InlineProcessorScrippt,
  SimpleInlineProcessorScript,
} from "./inlineAudioWebWorker";
import { EmitAudioEventFunction } from "./ExpoAudioStreamModule.web";

const mergeBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  const totalLength = buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;
  buffers.forEach(buffer => {
      mergedArray.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
  });
  return mergedArray.buffer;
};

interface AudioWorkletEvent {
  data: {
      command: string;
      recordedData?: ArrayBuffer;
      sampleRate?: number;
  };
}

const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const buffer = new ArrayBuffer(44 + samples.length * 4); // 44 bytes for WAV header, 4 bytes per 32-bit float sample
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 4, true); // File size - 8 bytes
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 3, true); // Format code 3 for 32-bit float
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * 4, true); // Byte rate
  view.setUint16(32, 4, true); // Block align (4 bytes per sample for 32-bit float)
  view.setUint16(34, 32, true); // Bits per sample (32-bit float)
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 4, true); // Data chunk size

  // Write samples
  for (let i = 0; i < samples.length; i++) {
      view.setFloat32(44 + i * 4, samples[i], true);
  }

  return buffer;
};


export class WebRecorder {
  private audioContext: AudioContext;
  private audioWorkletNode!: AudioWorkletNode;
  private source: MediaStreamAudioSourceNode;
  private emitAudioEventCallback: EmitAudioEventFunction;
  private config: RecordingConfig;
  private position: number; // Track the cumulative position
  private channels: number; // Number of audio channels
  private bitDepth: number; // Bit depth of the audio
  private buffers: ArrayBuffer[]; // Array to store the buffers


  constructor(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    recordingConfig: RecordingConfig,
    emitAudioEventCallback: EmitAudioEventFunction,
  ) {
    this.audioContext = audioContext;
    this.source = source;
    this.emitAudioEventCallback = emitAudioEventCallback;
    this.config = recordingConfig;
    this.position = 0;
    this.channels = source.mediaStream.getAudioTracks()[0].getSettings().channelCount || 1; // Default to 1 if not available
    this.bitDepth = 16; // Assume 16-bit depth as standard
    this.buffers = []; // Initialize the buffers array
  }

  async init() {
    const blob = new Blob([InlineProcessorScrippt], {
      type: "application/javascript",
    });
    const url = URL.createObjectURL(blob);

    // await this.audioContext.audioWorklet.addModule(url);
    await this.audioContext.audioWorklet.addModule("/demo.js");

    this.audioWorkletNode = new AudioWorkletNode(
      this.audioContext,
      "recorder-processor",
    );
    
    this.audioWorkletNode.port.onmessage = (event: AudioWorkletEvent) => {
      const command = event.data.command;
      console.log(`received event`, event.data, command);
      console.log(`received event`, event.data, command);
      if (command === "recordedData") {
        const recordedData = event.data.recordedData as ArrayBuffer;
        // Compute duration of the recorded data
        const duration = recordedData.byteLength / (this.audioContext.sampleRate * (this.bitDepth / this.channels));
        console.log(`Received recorded data -- Duration: ${duration} vs ${recordedData.byteLength / this.audioContext.sampleRate} seconds`);
        // this.playRecordedData(recordedData);

        // Compare recordedData with the transmitted data
        // print length for comparison
        console.log(`recordedData.length=${recordedData.byteLength} vs transmittedData.length=${this.buffers[0].byteLength}`);

        const mergedBuffers = mergeBuffers(this.buffers);
        console.log(`mergedBuffers.length=${mergedBuffers.byteLength}`);

        // compare mergedBuffers with recordedData
        console.log(`mergedBuffers.length=${mergedBuffers.byteLength} vs recordedData.length=${recordedData.byteLength}`);
        this.playRecordedData(recordedData);
        // this.playRecordedData(mergedBuffers);
        this.checkAudioContextFormat();
        // this.playBlobRecordedData(mergedBuffers);
        return;
      }

      // Handle the audio blob (e.g., send it to the server or process it further)
      console.log("Received audio blob from processor", event);
      const encodedWav = event.data.recordedData as ArrayBuffer;
      this.buffers.push(encodedWav); // Store the buffer
      const sampleRate = event.data.sampleRate ?? this.audioContext.sampleRate;
      const otherSampleRate = this.audioContext.sampleRate;
      const duration = encodedWav.byteLength / sampleRate; // Calculate duration of the current buffer
      const otherDuration = encodedWav.byteLength / (otherSampleRate * (this.bitDepth / this.channels)); // Calculate duration of the current buffer
      console.log(
        `sampleRate=${sampleRate} Duration: ${duration} -- otherSampleRate=${otherSampleRate} Other duration: ${otherDuration}`,
      );
      this.emitAudioEventCallback({data: encodedWav, position: this.position});
      this.position += duration; // Update position
    };
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);

    console.log(
      `WebRecorder initialized -- recordSampleRate=${this.audioContext.sampleRate}`,
    this.config);
    this.audioWorkletNode.port.postMessage({
      command: "init",
      recordSampleRate: this.audioContext.sampleRate, // Pass the original sample rate
      exportSampleRate: this.config.sampleRate ?? this.audioContext.sampleRate,
      interval: this.config.interval ?? 500,
    });
  }

  start() {
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
  }

  stop() {
    if (this.audioWorkletNode) {
      this.source.disconnect(this.audioWorkletNode);
      this.audioWorkletNode.disconnect(this.audioContext.destination);
      this.audioWorkletNode.port.postMessage({ command: "stop" });
    }

    // Stop all media stream tracks to stop the browser recording
    this.stopMediaStreamTracks();
  }

  pause() {
    this.source.disconnect(this.audioWorkletNode); // Disconnect the source from the AudioWorkletNode
    this.audioWorkletNode.disconnect(this.audioContext.destination); // Disconnect the AudioWorkletNode from the destination
    this.audioWorkletNode.port.postMessage({ command: "pause" });
  }

  stopAndPlay() {
    this.stop();
    this.audioWorkletNode.port.postMessage({ command: "getRecordedData" });
  }

  stopMediaStreamTracks() {
    // Stop all audio tracks to stop the recording icon
    const tracks = this.source.mediaStream.getTracks();
    tracks.forEach((track) => track.stop());
  }

  playRecordedData(recordedData: ArrayBuffer) {
    const audioData = new Float32Array(recordedData);
    const audioBuffer = this.audioContext.createBuffer(
      1, // Mono channel
      audioData.length,
      this.audioContext.sampleRate
    );
    audioBuffer.copyToChannel(audioData, 0);

    const bufferSource = this.audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(this.audioContext.destination);
    bufferSource.start();
    console.log("Playing recorded data", recordedData);
  }

  private checkAudioContextFormat () {
    // Create a silent AudioBuffer
    const sampleRate =this.audioContext.sampleRate;
    const frameCount = sampleRate * 1.0; // 1 second buffer
    const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);

    // Check the format
    const channelData = audioBuffer.getChannelData(0);
    const bitDepth = channelData.BYTES_PER_ELEMENT * 8; // 4 bytes per element means 32-bit

    console.log(`AudioContext default sample rate: ${sampleRate}`);
    console.log(`AudioBuffer sample rate: ${audioBuffer.sampleRate}`);
    console.log(`AudioBuffer length: ${audioBuffer.length}`);
    console.log(`AudioBuffer number of channels: ${audioBuffer.numberOfChannels}`);
    console.log(`AudioBuffer bit depth: ${bitDepth} bits`);
  };

  private playBlobRecordedData(buffer: ArrayBuffer) {
    console.log(`before encodeWAV buffer.length=${buffer.byteLength}`, buffer);
    const wavBuffer = encodeWAV(new Float32Array(buffer), this.audioContext.sampleRate);
    console.log(`after encodeWAV wavBuffer.length=${wavBuffer.byteLength}`, wavBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().then(() => {
        console.log('Audio is playing');
    }).catch((error) => {
        console.error('Error playing audio:', error);
    });
    // const blob = new Blob([buffer], { type: 'audio/wav' });
    //     const url = URL.createObjectURL(blob);
    //     const audio = new Audio(url);
    //     audio.play().then(() => {
    //         console.log('Audio is playing');
    //     }).catch((error) => {
    //         console.error('Error playing audio:', error);
    //     });
}

  resume() {
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
    this.audioWorkletNode.port.postMessage({ command: "resume" });
  }
}
