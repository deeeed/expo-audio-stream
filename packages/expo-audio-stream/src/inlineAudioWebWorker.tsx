export const SimpleInlineProcessorScript = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
      super();
      this.recordedBuffers = []; // Float32Array
      this.newRecBuffer = []; // Float32Array
      this.exportIntervalSamples = 0;
      this.samplesSinceLastExport = 0;
      this.recordSampleRate = 44100; // To be overwritten
      this.exportSampleRate = 44100; // To be overwritten
      this.channels = 1; // Default to 1 channel (mono)
      this.bitDepth = 32; // Default to 32-bit depth
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
              const fullRecordedData = this.getAllRecordedData();
              this.port.postMessage({ command: 'recordedData', recordedData: fullRecordedData });
              break;
      }
  }

  process(inputs, outputs, parameters) {
      if (!this.isRecording) return true;
      const input = inputs[0];
      if (input.length > 0) {
          const newBuffer = new Float32Array(input[0]);
          this.newRecBuffer.push(newBuffer);
          this.recordedBuffers.push(newBuffer);
          this.samplesSinceLastExport += newBuffer.length;

          if (this.samplesSinceLastExport >= this.exportIntervalSamples) {
              this.exportNewData();
              this.samplesSinceLastExport = 0;
          }
      }
      return true;
  }

  mergeBuffers(bufferArray, recLength) {
      const result = new Float32Array(recLength);
      let offset = 0;
      for (let i = 0; i < bufferArray.length; i++) {
          result.set(bufferArray[i], offset);
          offset += bufferArray[i].length;
      }
      return result;
  }

  floatTo16BitPCM(output, offset, input) {
      for (let i = 0; i < input.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, input[i]));
          output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      console.debug('Float to 16-bit PCM conversion complete. Output byte length:', offset);
  }

  floatTo32BitPCM(output, offset, input) {
      for (let i = 0; i < input.length; i++, offset += 4) {
          output.setFloat32(offset, input[i], true);
      }
      console.debug('Float to 32-bit PCM (no conversion) complete. Output byte length:', offset);
  }

  writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  }

  encodeWAV(samples, includeHeader = true) {
      const sampleCount = samples.length;
      const buffer = new ArrayBuffer((includeHeader ? 44 : 0) + sampleCount * 4);
      const view = new DataView(buffer);

      if (includeHeader) {
          this.writeString(view, 0, 'RIFF');
          view.setUint32(4, 36 + sampleCount * 4, true); // File size - 8 bytes
          this.writeString(view, 8, 'WAVE');
          this.writeString(view, 12, 'fmt ');
          view.setUint32(16, 16, true); // PCM format
          view.setUint16(20, 3, true); // Format code 3 for float
          view.setUint16(22, 1, true); // Mono channel
          view.setUint32(24, this.recordSampleRate, true); // Sample rate
          view.setUint32(28, this.recordSampleRate * 4, true); // Byte rate
          view.setUint16(32, 4, true); // Block align (4 bytes for 32-bit float)
          view.setUint16(34, 32, true); // Bits per sample (32-bit float)
          this.writeString(view, 36, 'data');
          view.setUint32(40, sampleCount * 4, true); // Data chunk size
      }

      console.debug('Writing PCM samples to DataView. Offset:', includeHeader ? 44 : 0, 'Samples length:', sampleCount);
      this.floatTo32BitPCM(view, includeHeader ? 44 : 0, samples);
      // this.floatTo16BitPCM(view, includeHeader ? 44 : 0, samples);

      console.debug('Encoded WAV DataView:', view);
      console.debug('Encoded WAV length:', view.byteLength);

      return view;
  }


  exportNewData() {
      // Calculate the total length of the new recorded buffers
      const length = this.newRecBuffer.reduce((acc, buffer) => acc + buffer.length, 0);

      // Merge all new recorded buffers into a single buffer
      const mergedBuffer = this.mergeBuffers(this.newRecBuffer, length);

      // Encode the merged buffer into a WAV format
      const encodedWav = this.encodeWAV(mergedBuffer, false);

      // Clear the new recorded buffers after they have been processed
      this.newRecBuffer.length = 0;

      // Post the message to the main thread
      // The first argument is the message data, containing the encoded WAV buffer
      // The second argument is the transfer list, which transfers ownership of the ArrayBuffer
      // to the main thread, avoiding the need to copy the buffer and improving performance
      this.port.postMessage({ recordedData: encodedWav.buffer }, [encodedWav.buffer]);
  }

  getAllRecordedData() {
      const length = this.recordedBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
      const mergedBuffer = this.mergeBuffers(this.recordedBuffers, length);


      // Calculate the duration based on the sample count and sample rate
      const sampleCount = mergedBuffer.length;
      const mergedBufferDuration = sampleCount / this.recordSampleRate;

      const encodedWav = this.encodeWAV(mergedBuffer, true);

      // Calculate and log the duration for encodedWav.buffer based on sample count
      const encodedWavBufferDuration = sampleCount / this.recordSampleRate;

      this.recordedBuffers.length = 0; // Clear the buffers after extraction

      // Returning both for testing, comment one of the returns based on your test
      console.debug('mergedBuffer:', mergedBuffer);
      console.debug('encodedWav.buffer:', encodedWav.buffer);

      // Uncomment the appropriate return for testing
      // return mergedBuffer; // This works when played
      return encodedWav.buffer; // This doesn't work when played
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
`;

// Because we use expo and needs to include the worker script in the shared library, better inline it in the module.
export const InlineProcessorScrippt = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recLength = 0;
    this.recBuffer = [];
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
        break;
      case 'getRecordedData':
        const recordedData = this.getRecordedData();
        this.port.postMessage({ command: 'recordedData', recordedData });
        break;
    }
  }

  process(inputs) {
    if (!this.isRecording) {
      return true; // Exit early if not recording
    }

    if (inputs.length === 0 || inputs[0].length === 0) {
      console.warn('RecorderProcessor -- No input received.');
      return true; // Exit early if no input
    }

    const buffer = inputs[0];
    if (!buffer) {
      console.error('Input buffer is null.');
      return true; // Exit early if buffer is null
    }

    try {
      this.record(buffer);

      // this.samplesSinceLastExport += buffer.length;
      // if (this.samplesSinceLastExport >= this.exportIntervalSamples) {
      //   this.exportBuffer();
      //   this.samplesSinceLastExport = 0;
      // }
    } catch (error) {
      console.error('Error during processing:', error);
    }
    return true;
  }

  record(inputBuffer) {
    this.recBuffer.push(inputBuffer);
    this.newRecBuffer.push(inputBuffer);
    this.recLength += inputBuffer.length;
  }

  exportBuffer() {
    const mergedBuffers = this.mergeBuffers(this.newRecBuffer, this.newRecBuffer.reduce((len, buf) => len + buf.length, 0));
    console.log('Merged buffer length:', mergedBuffers.length); // Debug log

    const downsampledBuffer = this.downsampleBuffer(mergedBuffers, this.exportSampleRate);
    console.log('Downsampled buffer length:', downsampledBuffer.length); // Debug log

    const encodedWav = downsampledBuffer;
    // const encodedWav = this.encodeWAV(downsampledBuffer);
    // console.log('Encoded WAV length:', encodedWav.byteLength); // Debug log

    this.port.postMessage({ encodedWav, sampleRate: this.exportSampleRate });
    this.newRecBuffer = []; // Clear the new data buffer after export
    this.headerSent = true; // Indicate that the header has been sent
  }

  downsampleBuffer(buffer, exportSampleRate) {
    console.log('Original buffer length:', buffer.length); // Debug log
    console.log('Record sample rate:', this.recordSampleRate); // Debug log
    console.log('Export sample rate:', exportSampleRate); // Debug log
    if (exportSampleRate === this.recordSampleRate) {
      return buffer;
    }

    const sampleRateRatio = this.recordSampleRate / exportSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    console.log('Sample rate ratio:', sampleRateRatio); // Debug log
    console.log('New length after downsampling:', newLength); // Debug log
    
    if (newLength <= 0) {
      console.error('New length is zero or negative, returning empty buffer.'); // Debug log
      return new Float32Array(0);
    }
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  mergeBuffers(bufferArray, recLength) {
    const result = new Float32Array(recLength);
    let offset = 0;
    for (let i = 0; i < bufferArray.length; i++) {
      result.set(bufferArray[i], offset);
      offset += bufferArray[i].length;
    }
    return result;
  }

  floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  getRecordedData() {
    const length = this.recBuffer.reduce((acc, buffer) => acc + buffer.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (const buffer of this.recBuffer) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    this.recBuffer.length = 0; // Clear the buffers after extraction

    return result;
  }

  encodeWAV(samples) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 32 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    this.floatTo16BitPCM(view, 44, samples);
    return view;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
`;
