// packages/expo-audio-stream/src/workers/inlineAudioWebWorker.web.tsx
export const InlineAudioWebWorker = `
const DEFAULT_BIT_DEPTH = 32
const DEFAULT_SAMPLE_RATE = 44100

class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.currentChunk = [] // Float32Array
        this.samplesSinceLastExport = 0
        this.recordSampleRate = DEFAULT_SAMPLE_RATE
        this.exportSampleRate = DEFAULT_SAMPLE_RATE
        this.recordBitDepth = DEFAULT_BIT_DEPTH
        this.exportBitDepth = DEFAULT_BIT_DEPTH
        this.numberOfChannels = 1
        this.isRecording = true
        this.port.onmessage = this.handleMessage.bind(this)
        this.enableLogging = false
        this.exportIntervalSamples = 0
        this.currentPosition = 0 // Track current position in seconds
    }

    handleMessage(event) {
        switch (event.data.command) {
            case 'init':
                this.enableLogging = event.data.enableLogging || false
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
                    event.data.exportBitDepth || this.recordBitDepth
                
                // Handle position parameter for device switching
                if (typeof event.data.position === 'number' && event.data.position > 0) {
                    this.currentPosition = event.data.position
                    if (this.enableLogging) {
                        console.log('AudioWorklet initialized with position:', this.currentPosition)
                    }
                }
                break

            case 'stop':
                this.isRecording = false
                if (this.currentChunk.length > 0) {
                    this.processChunk()
                }
                break
                
            case 'pause':
                // Just a placeholder for pause handling
                break
                
            case 'resume':
                // Just a placeholder for resume handling
                break
        }
    }

    process(inputs, _outputs, _parameters) {
        if (!this.isRecording) return true
        const input = inputs[0]
        if (input.length > 0) {
            const newBuffer = new Float32Array(input[0])
            this.currentChunk.push(newBuffer)
            this.samplesSinceLastExport += newBuffer.length

            if (this.samplesSinceLastExport >= this.exportIntervalSamples) {
                this.processChunk()
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

    // Keep basic resampling for sample rate conversion
    resample(samples, targetSampleRate) {
        if (this.recordSampleRate === targetSampleRate) {
            return samples
        }
        const resampledBuffer = new Float32Array(
            Math.ceil(
                (samples.length * targetSampleRate) / this.recordSampleRate
            )
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
            resampledBuffer[i] = count > 0 ? accum / count : 0
            offset = nextOffset
        }
        return resampledBuffer
    }

    // Keep bit depth conversion if needed
    convertBitDepth(input, targetBitDepth) {
        if (targetBitDepth === 32) {
            const output = new Int32Array(input.length)
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]))
                output[i] = s < 0 ? s * 0x80000000 : s * 0x7fffffff
            }
            return output
        } else if (targetBitDepth === 16) {
            const output = new Int16Array(input.length)
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]))
                output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
            }
            return output
        }
        return input
    }

    processChunk() {
        if (this.currentChunk.length === 0) return

        // Merge buffers
        const chunkLength = this.currentChunk.reduce(
            (acc, buf) => acc + buf.length,
            0
        )
        const mergedChunk = this.mergeBuffers(this.currentChunk, chunkLength)

        // Resample if needed
        const resampledChunk = this.resample(mergedChunk, this.exportSampleRate)

        // Convert bit depth if needed
        const finalBuffer =
            this.recordBitDepth !== this.exportBitDepth
                ? this.convertBitDepth(resampledChunk, this.exportBitDepth)
                : resampledChunk

        // Calculate the duration in seconds
        const chunkDuration = finalBuffer.length / this.exportSampleRate
        
        // Send processed chunk with the current position
        this.port.postMessage({
            command: 'newData',
            recordedData: finalBuffer,
            sampleRate: this.exportSampleRate,
            bitDepth: this.exportBitDepth,
            numberOfChannels: this.numberOfChannels,
            position: this.currentPosition,
        })
        
        // Update the position
        this.currentPosition += chunkDuration

        // Clear the current chunk
        this.currentChunk = []
    }
}

registerProcessor('recorder-processor', RecorderProcessor)
`
