class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recLength = 0;
    this.recordedBuffers = [];
    this.headerSent = false;
    this.newRecBuffer = [];
    this.exportIntervalSamples = 0;
    this.samplesSinceLastExport = 0;
    this.recordSampleRate = 44100; // To be overwrited
    this.exportSampleRate = 44100; // To be overwrited
    this.isRecording = true;
    this.port.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    switch (event.data.command) {
      case 'init':
        this.recordSampleRate = event.data.recordSampleRate;
        this.exportSampleRate = event.data.exportSampleRate || event.data.recordSampleRate;
        this.exportIntervalSamples = this.recordSampleRate * (event.data.interval / 1000);
        break;
      case 'stop':
        this.isRecording = false;
        const recordedData = this.getRecordedData();
        this.port.postMessage({ command: 'recordedData', recordedData });
        break;
      // case 'getRecordedData':
      //   const recordedData = this.getRecordedData();
      //   this.port.postMessage({ command: 'recordedData', recordedData });
      //   break;
    }
    // if (event.data.command === 'stop') {
    //   this.isRecording = false;
    //   const recordedData = this.getRecordedData();
    //   this.port.postMessage({ command: 'recordedData', recordedData });
    // }
  }

  process(inputs, outputs, parameters) {
    if (!this.isRecording) return true;
    console.log('RecorderProcessor -- Processing audio data.', inputs, outputs, parameters);

    const input = inputs[0];
    if (input.length > 0) {
      this.recordedBuffers.push(new Float32Array(input[0]));
    }
    return true;
  }

  getRecordedData() {
    const length = this.recordedBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (const buffer of this.recordedBuffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    this.recordedBuffers.length = 0; // Clear the buffers after extraction

    return result;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);