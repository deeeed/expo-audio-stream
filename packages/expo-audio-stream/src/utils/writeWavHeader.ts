// packages/expo-audio-stream/src/utils/writeWavHeader.ts

/**
 * Options for creating a WAV header.
 */
export interface WavHeaderOptions {
    /** Optional buffer containing audio data. If provided, it will be combined with the header. */
    buffer?: ArrayBuffer
    /** The sample rate of the audio in Hz (e.g., 44100). */
    sampleRate: number
    /** The number of audio channels (e.g., 1 for mono, 2 for stereo). */
    numChannels: number
    /** The bit depth of the audio (e.g., 16, 24, or 32). */
    bitDepth: number
}

/**
 * Writes or updates a WAV (RIFF) header based on the provided options.
 *
 * This function can be used in three ways:
 * 1. To create a standalone WAV header (when no buffer is provided).
 * 2. To create a WAV header and combine it with existing audio data (when a buffer without a header is provided).
 * 3. To update an existing WAV header in the provided buffer.
 *
 * For streaming audio where the final size is unknown, this function sets the size fields
 * to the maximum 32-bit value (0xFFFFFFFF). These can be updated later using the
 * `updateWavHeaderSize` function once the final size is known.
 *
 * @param options - The options for creating or updating the WAV header.
 * @returns An ArrayBuffer containing the WAV header, or the header combined with the provided audio data.
 *
 * @throws {Error} Throws an error if the provided options are invalid or if the buffer is too small.
 *
 * @example
 * // Create a standalone WAV header
 * const header = writeWavHeader({
 *   sampleRate: 44100,
 *   numChannels: 2,
 *   bitDepth: 16
 * });
 *
 * @example
 * // Create a WAV header and combine it with audio data
 * const completeWav = writeWavHeader({
 *   buffer: audioData,
 *   sampleRate: 44100,
 *   numChannels: 2,
 *   bitDepth: 16
 * });
 */
export const writeWavHeader = ({
    buffer,
    sampleRate,
    numChannels,
    bitDepth,
}: WavHeaderOptions): ArrayBuffer => {
    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign

    // Function to write a string to the DataView
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
        }
    }

    // Function to write or update the header
    const writeHeader = (view: DataView, dataSize: number = 0xffffffff) => {
        writeString(view, 0, 'RIFF') // ChunkID
        view.setUint32(4, 36 + dataSize, true) // ChunkSize
        writeString(view, 8, 'WAVE') // Format
        writeString(view, 12, 'fmt ') // Subchunk1ID
        view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
        view.setUint16(20, bitDepth === 32 ? 3 : 1, true) // AudioFormat (3 for float, 1 for PCM)
        view.setUint16(22, numChannels, true) // NumChannels
        view.setUint32(24, sampleRate, true) // SampleRate
        view.setUint32(28, byteRate, true) // ByteRate
        view.setUint16(32, blockAlign, true) // BlockAlign
        view.setUint16(34, bitDepth, true) // BitsPerSample
        writeString(view, 36, 'data') // Subchunk2ID
        view.setUint32(40, dataSize, true) // Subchunk2Size
    }

    if (buffer) {
        if (buffer.byteLength < 44) {
            throw new Error('Buffer is too small to contain a valid WAV header')
        }

        const view = new DataView(buffer)

        // Check if the buffer already has a WAV header by looking for "RIFF" at the start
        const existingHeader = view.getUint32(0, false) === 0x52494646 // "RIFF" in ASCII

        if (existingHeader) {
            // Update the existing header
            writeHeader(view, buffer.byteLength - 44)
            return buffer
        } else {
            // Combine the new header with the existing buffer
            const newBuffer = new ArrayBuffer(44 + buffer.byteLength)
            const newView = new DataView(newBuffer)
            writeHeader(newView, buffer.byteLength)
            new Uint8Array(newBuffer).set(new Uint8Array(buffer), 44)
            return newBuffer
        }
    } else {
        // Create a standalone header
        const headerBuffer = new ArrayBuffer(44)
        const view = new DataView(headerBuffer)
        writeHeader(view)
        return headerBuffer
    }
}
