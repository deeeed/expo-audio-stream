class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.recordedBuffers = []; // Float32Array
        this.newRecBuffer = []; // Float32Array
        this.resampledBuffer = []; // Float32Array
        this.exportIntervalSamples = 0;
        this.samplesSinceLastExport = 0;
        this.recordSampleRate = 44100; // To be overwritten
        this.exportSampleRate = 44100; // To be overwritten
        this.numberOfChannels = 1; // Default to 1 channel (mono)
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
                if (event.data.numberOfChannels) {
                    this.numberOfChannels = event.data.numberOfChannels;
                }
                if (event.data.bitDepth) {
                    this.bitDepth = event.data.bitDepth;
                }
                console.debug(`RecorderProcessor -- Initializing with recordSampleRate: ${this.recordSampleRate}, exportSampleRate: ${this.exportSampleRate}, exportIntervalSamples: ${this.exportIntervalSamples}`);
                break;
            case 'stop':
                this.isRecording = false;
                this.getAllRecordedData()
                    .then((fullRecordedData) => {
                        this.port.postMessage({
                        command: "recordedData",
                        recordedData: fullRecordedData,
                        });
                        return fullRecordedData;
                    })
                    .catch((error) => {
                        console.error("Error extracting recorded data:", error);
                    });
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
        const bytesPerSample = this.bitDepth / 8;
        const blockAlign = this.numberOfChannels * bytesPerSample;
        const byteRate = this.exportSampleRate * blockAlign;
        const buffer = new ArrayBuffer((includeHeader ? 44 : 0) + sampleCount * bytesPerSample);
        const view = new DataView(buffer);

        if (includeHeader) {
            this.writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + sampleCount * bytesPerSample, true); // File size - 8 bytes
            this.writeString(view, 8, 'WAVE');
            this.writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true); // PCM format
            view.setUint16(20, this.bitDepth === 32 ? 3 : 1, true); // Format code 3 for float, 1 for PCM
            view.setUint16(22, this.numberOfChannels, true); // Channels
            view.setUint32(24, this.exportSampleRate, true); // Sample rate
            view.setUint32(28, byteRate, true); // Byte rate
            view.setUint16(32, blockAlign, true); // Block align
            view.setUint16(34, this.bitDepth, true); // Bits per sample
            this.writeString(view, 36, 'data');
            view.setUint32(40, sampleCount * bytesPerSample, true); // Data chunk size
        }

        console.debug('Writing PCM samples to DataView. Offset:', includeHeader ? 44 : 0, 'Samples length:', sampleCount);

        if(this.bitDepth === 16) {
            console.debug('Encoding as 16-bit PCM');
            this.floatTo16BitPCM(view, includeHeader ? 44 : 0, samples);
        } else {
            console.debug('Encoding as 32-bit float PCM');
            this.floatTo32BitPCM(view, includeHeader ? 44 : 0, samples);
        }

        console.debug('Encoded WAV DataView:', view);
        console.debug('Encoded WAV length:', view.byteLength);

        return view;
    }


    resample(samples, targetSampleRate) {
        if(this.recordSampleRate === targetSampleRate) {
            return samples;
        }
        const resampledBuffer = new Float32Array(samples.length * targetSampleRate / this.recordSampleRate);
        const ratio = this.recordSampleRate / targetSampleRate;
        let offset = 0;
        for (let i = 0; i < resampledBuffer.length; i++) {
            const nextOffset = Math.floor((i + 1) * ratio);
            let accum = 0;
            let count = 0;
            for (let j = offset; j < nextOffset && j < samples.length; j++) {
                accum += samples[j];
                count++;
            }
            resampledBuffer[i] = accum / count;
            offset = nextOffset;
        }
        return resampledBuffer;
    }

    async resampleBuffer(buffer, targetSampleRate) {
        if (typeof OfflineAudioContext === 'undefined') {
            console.warn('OfflineAudioContext is not supported in this environment -- fallback to manual resampling');
            return this.resample(buffer, targetSampleRate);
        }

        if(this.recordSampleRate === targetSampleRate) {
            return buffer;
        }
        const offlineContext = new OfflineAudioContext(numberOfChannels, buffer.length, this.recordSampleRate);
        const sourceBuffer = offlineContext.createBuffer(this.numberOfChannels, buffer.length, this.recordSampleRate);
        sourceBuffer.copyToChannel(buffer, 0);

        const bufferSource = offlineContext.createBufferSource();
        bufferSource.buffer = sourceBuffer;
        bufferSource.connect(offlineContext.destination);
        bufferSource.start();

        const renderedBuffer = await offlineContext.startRendering();

        const resampledBuffer = new Float32Array(renderedBuffer.length);
        renderedBuffer.copyFromChannel(resampledBuffer, 0);

        return resampledBuffer;
    }


    async exportNewData() {
        // Calculate the total length of the new recorded buffers
        const length = this.newRecBuffer.reduce((acc, buffer) => acc + buffer.length, 0);

        // Merge all new recorded buffers into a single buffer
        const mergedBuffer = this.mergeBuffers(this.newRecBuffer, length);

        const resampledBuffer = await this.resampleBuffer(mergedBuffer, this.exportSampleRate);

        // Encode the merged buffer into a WAV format
        const encodedWav = this.encodeWAV(resampledBuffer, false);

        // Clear the new recorded buffers after they have been processed
        this.newRecBuffer.length = 0;

        // Post the message to the main thread
        // The first argument is the message data, containing the encoded WAV buffer
        // The second argument is the transfer list, which transfers ownership of the ArrayBuffer
        // to the main thread, avoiding the need to copy the buffer and improving performance
        this.port.postMessage({ recordedData: encodedWav.buffer, sampleRate: this.recordSampleRate }, [encodedWav.buffer]);
        // this.port.postMessage({ recordedData: mergedBuffer, sampleRate: this.recordSampleRate }, [mergedBuffer]);
    }

    async getAllRecordedData() {
        console.debug(`getAllRecordedData - sampleRate: ${this.recordSampleRate}`);

        const length = this.recordedBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
        const mergedBuffer = this.mergeBuffers(this.recordedBuffers, length);

        console.debug(`mergedBuffer.byteLength: ${mergedBuffer.byteLength}`);
        console.debug(`recordSampleRate: ${this.recordSampleRate}`);
        console.debug(`channels: ${this.numberOfChannels}`);
        console.debug(`bitDepth: ${this.bitDepth}`);

        // Calculate the duration based on the sample count and sample rate
        const sampleCount = mergedBuffer.length;
        const mergedBufferDuration = sampleCount / this.recordSampleRate;
        console.debug(`mergedBuffer Duration: ${mergedBufferDuration} seconds`);

        // TODO: Resample the merged buffer to the export sample rate
        // const resampledBuffer = this.resample(mergedBuffer, this.exportSampleRate);
        const resampledBuffer = await this.resampleBuffer(mergedBuffer, this.exportSampleRate);

        // compare lengths
        console.debug(`resampledBuffer.length: ${resampledBuffer.length} vs mergedBuffer.length: ${mergedBuffer.length}`);
        console.debug(`saved ${mergedBuffer.length - resampledBuffer.length} samples`);
        const encodedWav = this.encodeWAV(resampledBuffer, true);

        console.debug(`encodedWav.byteLength: ${encodedWav.byteLength}`);

        // Calculate and log the duration for encodedWav.buffer based on sample count
        const encodedWavBufferDuration = sampleCount / this.recordSampleRate;
        console.debug(`encodedWav.buffer Duration: ${encodedWavBufferDuration} seconds`);

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
