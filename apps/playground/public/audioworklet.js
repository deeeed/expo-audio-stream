// playground/public/audioworklet.js
const DEFAULT_BIT_DEPTH = 32
const DEFAULT_SAMPLE_RATE = 44100

class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.recordedBuffers = [] // Float32Array
        this.newRecBuffer = [] // Float32Array
        this.resampledBuffer = [] // Float32Array
        this.exportIntervalSamples = 0
        this.samplesSinceLastExport = 0
        this.recordSampleRate = DEFAULT_SAMPLE_RATE // To be overwritten
        this.exportSampleRate = DEFAULT_SAMPLE_RATE // To be overwritten
        this.recordBitDepth = DEFAULT_BIT_DEPTH // Default to 32-bit depth
        this.exportBitDepth = DEFAULT_BIT_DEPTH // To be overwritten
        this.numberOfChannels = 1 // Default to 1 channel (mono)
        this.isRecording = true
        this.port.onmessage = this.handleMessage.bind(this)
    }

    handleMessage(event) {
        switch (event.data.command) {
            case 'init':
                this.recordSampleRate = event.data.recordSampleRate
                this.exportSampleRate =
                    event.data.exportSampleRate || event.data.recordSampleRate
                this.exportIntervalSamples =
                    this.recordSampleRate * (event.data.interval / 1000)
                if (event.data.numberOfChannels) {
                    this.numberOfChannels = event.data.numberOfChannels
                }
                if (event.data.recordBitDepth) {
                    this.recordBitDepth = event.data.recordBitDepth
                }
                this.exportBitDepth =
                    event.data.exportBitDepth ||
                    this.recordBitDepth ||
                    DEFAULT_BIT_DEPTH
                console.debug(
                    `RecorderProcessor -- Initializing with recordSampleRate: ${this.recordSampleRate}, exportSampleRate: ${this.exportSampleRate}, exportIntervalSamples: ${this.exportIntervalSamples}`
                )
                break
            case 'stop':
                this.isRecording = false
                this.getAllRecordedData()
                    .then((fullRecordedData) => {
                        this.port.postMessage({
                            command: 'recordedData',
                            recordedData: fullRecordedData,
                            bitDepth: this.exportBitDepth,
                            sampleRate: this.exportSampleRate,
                        })
                        return fullRecordedData
                    })
                    .catch((error) => {
                        console.error(
                            'RecorderProcessor Error extracting recorded data:',
                            error
                        )
                    })
                break
        }
    }

    process(inputs, _outputs, _parameters) {
        if (!this.isRecording) return true
        const input = inputs[0]
        if (input.length > 0) {
            const newBuffer = new Float32Array(input[0])
            this.newRecBuffer.push(newBuffer)
            this.recordedBuffers.push(newBuffer)
            this.samplesSinceLastExport += newBuffer.length

            if (this.samplesSinceLastExport >= this.exportIntervalSamples) {
                this.exportNewData()
                this.samplesSinceLastExport = 0
            }
        }
        return true
    }

    mergeBuffers(bufferArray, recLength) {
        const result = new Float32Array(recLength)
        let offset = 0
        for (let i = 0; i < bufferArray.length; i++) {
            result.set(bufferArray[i], offset)
            offset += bufferArray[i].length
        }
        return result
    }

    floatTo16BitPCM(input) {
        const output = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]))
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        console.debug(
            'RecorderProcessor Float to 16-bit PCM conversion complete. Output byte length:',
            output.byteLength
        )
        return output
    }

    floatTo32BitPCM(input) {
        const output = new Int32Array(input.length)
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]))
            output[i] = s < 0 ? s * 0x80000000 : s * 0x7fffffff
        }
        console.debug(
            'RecorderProcessor Float to 32-bit PCM conversion complete. Output byte length:',
            output.byteLength
        )
        return output
    }

    resample(samples, targetSampleRate) {
        if (this.recordSampleRate === targetSampleRate) {
            return samples
        }
        const resampledBuffer = new Float32Array(
            (samples.length * targetSampleRate) / this.recordSampleRate
        )
        const ratio = this.recordSampleRate / targetSampleRate
        let offset = 0
        for (let i = 0; i < resampledBuffer.length; i++) {
            const nextOffset = Math.floor((i + 1) * ratio)
            let accum = 0
            let count = 0
            for (let j = offset; j < nextOffset && j < samples.length; j++) {
                accum += samples[j]
                count++
            }
            resampledBuffer[i] = accum / count
            offset = nextOffset
        }
        return resampledBuffer
    }

    async resampleBuffer(buffer, targetSampleRate) {
        if (typeof OfflineAudioContext === 'undefined') {
            return this.resample(buffer, targetSampleRate)
        }

        if (this.recordSampleRate === targetSampleRate) {
            return buffer
        }
        const offlineContext = new OfflineAudioContext(
            this.numberOfChannels,
            buffer.length,
            this.recordSampleRate
        )
        const sourceBuffer = offlineContext.createBuffer(
            this.numberOfChannels,
            buffer.length,
            this.recordSampleRate
        )
        sourceBuffer.copyToChannel(buffer, 0)

        const bufferSource = offlineContext.createBufferSource()
        bufferSource.buffer = sourceBuffer
        bufferSource.connect(offlineContext.destination)
        bufferSource.start()

        const renderedBuffer = await offlineContext.startRendering()

        const resampledBuffer = new Float32Array(renderedBuffer.length)
        renderedBuffer.copyFromChannel(resampledBuffer, 0)

        return resampledBuffer
    }

    async exportNewData() {
        // Calculate the total length of the new recorded buffers
        const length = this.newRecBuffer.reduce(
            (acc, buffer) => acc + buffer.length,
            0
        )

        // Merge all new recorded buffers into a single buffer
        const mergedBuffer = this.mergeBuffers(this.newRecBuffer, length)

        const resampledBuffer = await this.resampleBuffer(
            mergedBuffer,
            this.exportSampleRate
        )

        let finalBuffer = resampledBuffer // Float32Array
        if (this.recordBitDepth !== this.exportBitDepth) {
            if (this.exportBitDepth === 16) {
                finalBuffer = this.floatTo16BitPCM(resampledBuffer)
            } else if (this.exportBitDepth === 32) {
                finalBuffer = this.floatTo32BitPCM(resampledBuffer)
            }
        }

        console.debug(
            `RecorderProcessor - Original buffer length: ${mergedBuffer.byteLength}`
        )
        console.debug(
            `RecorderProcessor - Resampled buffer length: ${resampledBuffer.byteLength}`
        )
        console.debug(
            `RecorderProcessor - Final buffer length (after conversion): ${finalBuffer.byteLength}`
        )

        const originalSize = mergedBuffer.byteLength
        const resampledSize = resampledBuffer.byteLength
        const finalSize = finalBuffer.byteLength

        console.debug(
            `RecorderProcessor - Resampled buffer size ratio: ${(resampledSize / originalSize).toFixed(2)}`
        )
        console.debug(
            `RecorderProcessor - Final buffer size ratio: ${(finalSize / originalSize).toFixed(2)}`
        )

        // Clear the new recorded buffers after they have been processed
        this.newRecBuffer.length = 0

        // Post the message to the main thread
        // The first argument is the message data, containing the encoded WAV buffer
        // The second argument is the transfer list, which transfers ownership of the ArrayBuffer
        // to the main thread, avoiding the need to copy the buffer and improving performance
        // this.port.postMessage({ recordedData: encodedWav.buffer, sampleRate: this.recordSampleRate }, [encodedWav.buffer]);
        this.port.postMessage({
            command: 'newData',
            recordedData: finalBuffer.buffer,
            sampleRate: this.exportSampleRate,
            bitDepth: this.exportBitDepth,
        })
    }

    async getAllRecordedData() {
        console.debug(
            `RecorderProcessor - getAllRecordedData - sampleRate: ${this.recordSampleRate}`
        )

        const length = this.recordedBuffers.reduce(
            (acc, buffer) => acc + buffer.length,
            0
        )
        const mergedBuffer = this.mergeBuffers(this.recordedBuffers, length)
        const resampledBuffer = await this.resampleBuffer(
            mergedBuffer,
            this.exportSampleRate
        )
        // Convert to the desired bit depth if necessary
        let finalBuffer = resampledBuffer
        if (this.recordBitDepth !== this.exportBitDepth) {
            if (this.exportBitDepth === 16) {
                finalBuffer = this.floatTo16BitPCM(resampledBuffer)
            } else if (this.exportBitDepth === 32) {
                finalBuffer = this.floatTo32BitPCM(resampledBuffer)
            }
        }

        console.debug(
            `RecorderProcessor - Original buffer length: ${mergedBuffer.byteLength}`
        )
        console.debug(
            `RecorderProcessor - Resampled buffer length: ${resampledBuffer.byteLength}`
        )
        console.debug(
            `RecorderProcessor - Final buffer length (after conversion): ${finalBuffer.byteLength}`
        )

        const originalSize = mergedBuffer.byteLength
        const resampledSize = resampledBuffer.byteLength
        const finalSize = finalBuffer.byteLength

        console.debug(
            `RecorderProcessor - Resampled buffer size ratio: ${(resampledSize / originalSize).toFixed(2)}`
        )
        console.debug(
            `RecorderProcessor - Final buffer size ratio: ${(finalSize / originalSize).toFixed(2)}`
        )

        this.recordedBuffers.length = 0 // Clear the buffers after extraction

        return finalBuffer.buffer
    }
}

registerProcessor('recorder-processor', RecorderProcessor)
