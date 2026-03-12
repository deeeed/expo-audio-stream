module.exports = function (self) {
    'use strict'
    console.log('Worker script loaded')
    self.onmessage = function (event) {
        'use strict'
        let recordSampleRate,
            exportInterval = null,
            newRecBuffer = [];

        self.addEventListener('message', function (e) {
            console.log('Worker received message:', event.data)
            switch (e.data.command) {
                case 'init':
                    if (!recordSampleRate) {
                        // Ensure init logic is only executed once
                        init(event.data.config)
                    }
                    break
                case 'record':
                    record(e.data.buffer)
                    break
                case 'export':
                    exportBuffer(e.data.sampleRate)
                    break
                case 'clear':
                    clear()
                    break
            }
        })

        function init(config) {
            console.debug('Initializing worker with config', config)
            recordSampleRate = config.sampleRate
            startExportInterval(config.interval, config.sampleRate) // Start exporting automatically
        }

        function record(inputBuffer) {
            newRecBuffer.push(inputBuffer[0])
        }

        function exportBuffer(exportSampleRate) {
            const bufferLength = newRecBuffer.reduce((len, buf) => len + buf.length, 0)
            const mergedBuffers = mergeBuffers(newRecBuffer, bufferLength)
            const downsampledBuffer = downsampleBuffer(
                mergedBuffers,
                exportSampleRate
            )
            const encodedWav = encodeWAV(downsampledBuffer)
            const audioBlob = new Blob([encodedWav], {
                type: 'application/octet-stream',
            })
            postMessage(audioBlob)
            newRecBuffer = [] // Clear the new data buffer after export
        }

        function clear() {
            newRecBuffer = []
            if (exportInterval) {
                clearInterval(exportInterval)
                exportInterval = null
            }
        }

        function startExportInterval(interval, sampleRate) {
            console.debug('Starting export interval with interval', interval)
            if (exportInterval) {
                clearInterval(exportInterval)
            }
            exportInterval = setInterval(
                () => exportBuffer(sampleRate),
                interval
            )
        }

        function downsampleBuffer(buffer, exportSampleRate) {
            if (exportSampleRate === recordSampleRate) {
                return buffer
            }
            const sampleRateRatio = recordSampleRate / exportSampleRate
            const newLength = Math.round(buffer.length / sampleRateRatio)
            const result = new Float32Array(newLength)
            let offsetResult = 0
            let offsetBuffer = 0
            while (offsetResult < result.length) {
                const nextOffsetBuffer = Math.round(
                    (offsetResult + 1) * sampleRateRatio
                )
                let accum = 0,
                    count = 0
                for (
                    let i = offsetBuffer;
                    i < nextOffsetBuffer && i < buffer.length;
                    i++
                ) {
                    accum += buffer[i]
                    count++
                }
                result[offsetResult] = accum / count
                offsetResult++
                offsetBuffer = nextOffsetBuffer
            }
            return result
        }

        function mergeBuffers(bufferArray, recLength) {
            const result = new Float32Array(recLength)
            let offset = 0
            for (const buffer of bufferArray) {
                result.set(buffer, offset)
                offset += buffer.length
            }
            return result
        }

        function floatTo16BitPCM(output, offset, input) {
            for (let i = 0; i < input.length; i++, offset += 2) {
                const s = Math.max(-1, Math.min(1, input[i]))
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
            }
        }

        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i))
            }
        }

        function encodeWAV(samples) {
            const buffer = new ArrayBuffer(44 + samples.length * 2)
            const view = new DataView(buffer)

            writeString(view, 0, 'RIFF')
            view.setUint32(4, 32 + samples.length * 2, true)
            writeString(view, 8, 'WAVE')
            writeString(view, 12, 'fmt ')
            view.setUint32(16, 16, true)
            view.setUint16(20, 1, true)
            view.setUint16(22, 1, true)
            view.setUint32(24, recordSampleRate, true)
            view.setUint32(28, recordSampleRate * 2, true)
            view.setUint16(32, 2, true)
            view.setUint16(34, 16, true)
            writeString(view, 36, 'data')
            view.setUint32(40, samples.length * 2, true)
            floatTo16BitPCM(view, 44, samples)

            return view
        }
    }
}
