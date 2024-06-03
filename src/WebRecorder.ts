import { RecordingConfig } from "./ExpoAudioStream.types";
import { InlineProcessorScrippt } from "./inlineAudioWebWorker";

export class WebRecorder {
  private audioContext: AudioContext;
  private audioWorkletNode!: AudioWorkletNode;
  private recording: boolean;
  private source: MediaStreamAudioSourceNode;
  private emitAudioEventCallback: (data: Blob, position: number) => void;
  private config: RecordingConfig;
  private position: number; // Track the cumulative position

  constructor(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    recordingConfig: RecordingConfig,
    emitAudioEventCallback: (data: Blob, position: number) => void,
  ) {
    this.audioContext = audioContext;
    this.source = source;
    this.recording = false;
    this.emitAudioEventCallback = emitAudioEventCallback;
    this.config = recordingConfig;
    this.position = 0;
  }

  async init() {
    const blob = new Blob([InlineProcessorScrippt], {
      type: "application/javascript",
    });
    const url = URL.createObjectURL(blob);

    await this.audioContext.audioWorklet.addModule(url);

    this.audioWorkletNode = new AudioWorkletNode(
      this.audioContext,
      "recorder-processor",
    );
    this.audioWorkletNode.port.onmessage = (event) => {
      if (this.recording) {
        // Handle the audio blob (e.g., send it to the server or process it further)
        console.log("Received audio blob from processor", event);
        const encodedWav = event.data.encodedWav;
        const sampleRate =
          event.data.sampleRate ?? this.audioContext.sampleRate;
        const otherSampleRate = this.audioContext.sampleRate;
        const duration = encodedWav.byteLength / (sampleRate * 2 * 2); // Calculate duration of the current buffer
        const otherDuration = encodedWav.byteLength / (otherSampleRate * 2 * 2); // Calculate duration of the current buffer
        console.log(
          `sampleRate=${sampleRate} Duration: ${duration} -- otherSampleRate=${otherSampleRate} Other duration: ${otherDuration}`,
        );
        const blob = new Blob([encodedWav], { type: "audio/wav" });
        this.emitAudioEventCallback(blob, this.position);
        this.position += duration; // Update position
      } else {
        console.warn(`NOT RECORDING -- received event -- `, event);
      }
    };
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);

    console.log(
      `WebRecorder initialized -- recordSampleRate=${this.audioContext.sampleRate}`,
    );
    this.audioWorkletNode.port.postMessage({
      command: "init",
      recordSampleRate: this.audioContext.sampleRate, // Pass the original sample rate
      exportSampleRate: this.config.sampleRate ?? this.audioContext.sampleRate,
      interval: this.config.interval ?? 500,
    });
  }

  start() {
    this.recording = true;
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
  }

  stop() {
    this.recording = false;
    this.source.disconnect(this.audioWorkletNode); // Disconnect the source from the AudioWorkletNode
    this.audioWorkletNode.disconnect(this.audioContext.destination); // Disconnect the AudioWorkletNode from the destination
    this.audioWorkletNode.port.postMessage({ command: "stop" });
  }

  pause() {
    this.recording = false;
    this.source.disconnect(this.audioWorkletNode); // Disconnect the source from the AudioWorkletNode
    this.audioWorkletNode.disconnect(this.audioContext.destination); // Disconnect the AudioWorkletNode from the destination
    this.audioWorkletNode.port.postMessage({ command: "pause" });
  }

  resume() {
    this.recording = true;
    this.source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
    this.audioWorkletNode.port.postMessage({ command: "resume" });
  }
}
