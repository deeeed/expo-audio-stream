export const WAV_HEADER_SIZE = 44
export const convertPCMToFloat32 = ({
    bitDepth,
    buffer,
    skipWavHeader = false,
}: {
    buffer: ArrayBuffer
    bitDepth: number
    skipWavHeader?: boolean
}): { pcmValues: Float32Array; min: number; max: number } => {
    const dataView = new DataView(buffer)
    const headerOffset = skipWavHeader ? WAV_HEADER_SIZE : 0
    const dataLength = buffer.byteLength - headerOffset
    const sampleLength = dataLength / (bitDepth / 8)
    const float32Array = new Float32Array(sampleLength)
    let min = Infinity
    let max = -Infinity

    for (let i = 0; i < sampleLength; i++) {
        let value = 0
        const offset = headerOffset + i * (bitDepth / 8)
        switch (bitDepth) {
            case 8:
                value = dataView.getUint8(offset) / 128
                break
            case 16:
                value = dataView.getInt16(offset, true) / 32768
                break
            case 24:
                value =
                    (dataView.getUint8(offset) +
                        (dataView.getUint8(offset + 1) << 8) +
                        (dataView.getUint8(offset + 2) << 16)) /
                    8388608
                break
            case 32:
                value = dataView.getFloat32(offset, true)
                break
            default:
                throw new Error(`Unsupported bit depth: ${bitDepth}`)
        }
        if (value < min) min = value
        if (value > max) max = value
        float32Array[i] = value
    }

    return { pcmValues: float32Array, min, max }
}
