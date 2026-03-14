// Bundler (Metro/Webpack) will automatically resolve to crc32.web.ts or crc32.native.ts.

import { Platform } from 'react-native'

// Define the interface first
export interface CRC32 {
    (data: string | Uint8Array): number
    buf(data: Uint8Array): number
}

// --- Web CRC32 Calculation Logic ---
let webCrcTable: Uint32Array | undefined
function computeWebCrc32(data: string | Uint8Array): number {
    // Lazily compute the table only on web when first needed
    if (!webCrcTable) {
        webCrcTable = (() => {
            const table = new Uint32Array(256)
            for (let i = 0; i < 256; ++i) {
                let crc = i
                for (let j = 0; j < 8; ++j) {
                    crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
                }
                table[i] = crc
            }
            return table
        })()
    }

    let crc = -1 // Initialize with 0xFFFFFFFF
    if (typeof data === 'string') {
        const strBytes = new TextEncoder().encode(data)
        for (let i = 0; i < strBytes.length; ++i) {
            crc = (crc >>> 8) ^ webCrcTable[(crc ^ strBytes[i]) & 0xff]
        }
    } else if (data instanceof Uint8Array) {
        for (let i = 0; i < data.length; ++i) {
            crc = (crc >>> 8) ^ webCrcTable[(crc ^ data[i]) & 0xff]
        }
    } else {
        throw new Error('Unsupported data type for CRC32 calculation.')
    }

    return (crc ^ -1) >>> 0 // Final XOR and ensure unsigned 32-bit
}
// --- End Web CRC32 Calculation Logic ---

let crc32Implementation: CRC32

if (Platform.OS === 'web') {
    // Assign the web implementation
    crc32Implementation = Object.assign(computeWebCrc32, {
        buf: (data: Uint8Array): number => computeWebCrc32(data),
    })
} else {
    // No-op implementation for native platforms
    crc32Implementation = Object.assign(() => 0, { buf: () => 0 })
}

export default crc32Implementation
