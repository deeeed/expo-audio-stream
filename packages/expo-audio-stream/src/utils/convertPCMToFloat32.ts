import { Platform } from 'react-native'

import { ConsoleLike } from '../ExpoAudioStream.types'
import { getWavFileInfo, WavFileInfo } from './getWavFileInfo'

export const WAV_HEADER_SIZE = 44

const convertSample = (
    dataView: DataView,
    offset: number,
    bitDepth: number
): number => {
    switch (bitDepth) {
        case 8:
            return (dataView.getUint8(offset) - 128) / 128
        case 16:
            return dataView.getInt16(offset, true) / 32768
        case 24:
            return (
                ((dataView.getUint8(offset) |
                    (dataView.getUint8(offset + 1) << 8) |
                    (dataView.getUint8(offset + 2) << 16)) /
                    8388608) *
                    2 -
                1
            )
        case 32:
            return dataView.getFloat32(offset, true)
        default:
            throw new Error(`Unsupported bit depth: ${bitDepth}`)
    }
}

const convertSampleNative = (
    array: Uint8Array,
    startIndex: number,
    bitDepth: number
): number => {
    switch (bitDepth) {
        case 8:
            return (array[startIndex] - 128) / 128
        case 16: {
            // Handle 16-bit PCM using Uint8Array directly
            const low = array[startIndex]
            const high = array[startIndex + 1]
            const value = (high << 8) | low
            // Convert to signed 16-bit
            return (value > 32767 ? value - 65536 : value) / 32768
        }
        case 24: {
            const byte1 = array[startIndex]
            const byte2 = array[startIndex + 1]
            const byte3 = array[startIndex + 2]
            const value = (byte3 << 16) | (byte2 << 8) | byte1
            return (
                ((value > 8388607 ? value - 16777216 : value) / 8388608) * 2 - 1
            )
        }
        case 32: {
            // Assuming 32-bit float
            const view = new DataView(array.buffer, startIndex, 4)
            return view.getFloat32(0, true)
        }
        default:
            throw new Error(`Unsupported bit depth: ${bitDepth}`)
    }
}

export const convertPCMToFloat32 = async ({
    bitDepth,
    buffer,
    skipWavHeader = false,
    logger,
}: {
    buffer: ArrayBuffer
    bitDepth: number
    skipWavHeader?: boolean
    logger?: ConsoleLike
}): Promise<{ pcmValues: Float32Array; min: number; max: number }> => {
    try {
        logger?.debug(
            `Converting PCM to Float32: bitDepth: ${bitDepth}, buffer.byteLength: ${buffer.byteLength}`
        )

        let headerOffset = 0
        if (!skipWavHeader) {
            const wavFileInfo: WavFileInfo = await getWavFileInfo(buffer)
            headerOffset = wavFileInfo.dataChunkOffset
            logger?.debug(`Using WAV header offset: ${headerOffset}`)
        }

        // Convert ArrayBuffer to Uint8Array for more efficient native handling
        const uint8Array = new Uint8Array(buffer)
        const dataLength = buffer.byteLength - headerOffset
        const bytesPerSample = bitDepth / 8
        const sampleLength = Math.floor(dataLength / bytesPerSample)

        // Create result array using SharedArrayBuffer for better memory handling
        let float32Array: Float32Array
        try {
            // Try using SharedArrayBuffer first
            const sharedBuffer = new SharedArrayBuffer(sampleLength * 4)
            float32Array = new Float32Array(sharedBuffer)
        } catch (e) {
            // Fallback to regular ArrayBuffer if SharedArrayBuffer is not available
            float32Array = new Float32Array(sampleLength)
        }

        let min = Infinity
        let max = -Infinity

        // Process in smaller chunks
        const CHUNK_SIZE = Platform.OS === 'web' ? sampleLength : 4000 // Smaller chunks for native
        const numChunks = Math.ceil(sampleLength / CHUNK_SIZE)

        for (let chunk = 0; chunk < numChunks; chunk++) {
            const startSample = chunk * CHUNK_SIZE
            const endSample = Math.min((chunk + 1) * CHUNK_SIZE, sampleLength)

            // Process chunk
            for (let i = startSample; i < endSample; i++) {
                const startIndex = headerOffset + i * bytesPerSample
                if (startIndex + bytesPerSample <= uint8Array.length) {
                    const value =
                        Platform.OS === 'web'
                            ? convertSample(
                                  new DataView(buffer),
                                  startIndex,
                                  bitDepth
                              )
                            : convertSampleNative(
                                  uint8Array,
                                  startIndex,
                                  bitDepth
                              )

                    if (isFinite(value)) {
                        float32Array[i] = value
                        min = Math.min(min, value)
                        max = Math.max(max, value)
                    }
                }
            }

            // Allow garbage collection between chunks on native
            if (Platform.OS !== 'web' && chunk < numChunks - 1) {
                await new Promise((resolve) => setTimeout(resolve, 0))
            }
        }

        logger?.debug(
            `Conversion complete. Length: ${float32Array.length}, Range: [${min}, ${max}]`
        )

        // Only log a small sample of values to avoid memory issues
        if (logger?.debug) {
            const sampleValues = Array.from(float32Array.slice(0, 5))
            logger.debug('Sample values:', sampleValues)
        }

        return {
            pcmValues: float32Array,
            min,
            max,
        }
    } catch (error: unknown) {
        logger?.error(`Error converting PCM to Float32`, error)
        throw error
    }
}
