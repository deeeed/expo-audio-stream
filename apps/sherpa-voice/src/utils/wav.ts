import { readFileAsArrayBuffer } from './fileUtils'

export interface DecodedWavSamples {
    sampleRate: number
    samples: number[]
}

export function decodeMonoPcm16Wav(buffer: ArrayBuffer): DecodedWavSamples {
    const bytes = new Uint8Array(buffer)
    const view = new DataView(buffer)

    if (
        bytes.length < 44 ||
        String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF' ||
        String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== 'WAVE'
    ) {
        throw new Error('Unsupported WAV file: missing RIFF/WAVE header')
    }

    let offset = 12
    let channels = 0
    let bitsPerSample = 0
    let sampleRate = 0
    let dataOffset = -1
    let dataSize = 0

    while (offset + 8 <= bytes.length) {
        const chunkId = String.fromCharCode(
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3]
        )
        const chunkSize = view.getUint32(offset + 4, true)
        const chunkDataOffset = offset + 8

        if (chunkId === 'fmt ') {
            const audioFormat = view.getUint16(chunkDataOffset, true)
            channels = view.getUint16(chunkDataOffset + 2, true)
            sampleRate = view.getUint32(chunkDataOffset + 4, true)
            bitsPerSample = view.getUint16(chunkDataOffset + 14, true)

            if (audioFormat !== 1) {
                throw new Error(`Unsupported WAV encoding: PCM expected, got ${audioFormat}`)
            }
        } else if (chunkId === 'data') {
            dataOffset = chunkDataOffset
            dataSize = chunkSize
            break
        }

        offset = chunkDataOffset + chunkSize + (chunkSize % 2)
    }

    if (dataOffset < 0 || dataSize <= 0) {
        throw new Error('Unsupported WAV file: missing data chunk')
    }
    if (channels !== 1) {
        throw new Error(`Unsupported WAV file: mono expected, got ${channels} channels`)
    }
    if (bitsPerSample !== 16) {
        throw new Error(
            `Unsupported WAV file: 16-bit PCM expected, got ${bitsPerSample}-bit`
        )
    }
    if (!sampleRate) {
        throw new Error('Unsupported WAV file: missing sample rate')
    }

    const pcmBytes = new Uint8Array(buffer, dataOffset, dataSize)
    const pcm = new Int16Array(
        pcmBytes.buffer,
        pcmBytes.byteOffset,
        Math.floor(pcmBytes.byteLength / 2)
    )
    const samples = new Array<number>(pcm.length)
    for (let index = 0; index < pcm.length; index += 1) {
        samples[index] = pcm[index] / 32768
    }

    return {
        sampleRate,
        samples,
    }
}

export async function readMonoPcm16Wav(uri: string): Promise<DecodedWavSamples> {
    const buffer = await readFileAsArrayBuffer(uri)
    return decodeMonoPcm16Wav(buffer)
}
