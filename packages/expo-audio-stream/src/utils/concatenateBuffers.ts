/**
 * Concatenates an array of ArrayBuffers into a single ArrayBuffer.
 *
 * @param buffers - An array of ArrayBuffers to be concatenated.
 * @returns A single ArrayBuffer containing the concatenated data.
 */
export const concatenateBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
    // Filter out any undefined or null buffers
    const validBuffers = buffers.filter((buffer) => buffer)
    const totalLength = validBuffers.reduce(
        (sum, buffer) => sum + buffer.byteLength,
        0
    )
    // Create a new Uint8Array to hold the concatenated result
    const result = new Uint8Array(totalLength)
    // Offset to keep track of the current position in the result array
    let offset = 0

    for (const buffer of validBuffers) {
        result.set(new Uint8Array(buffer), offset)
        offset += buffer.byteLength
    }
    return result.buffer
}
