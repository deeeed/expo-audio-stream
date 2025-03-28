import { Platform } from 'react-native'

interface CRC32 {
    (data: string | Uint8Array): number;
    buf(data: Uint8Array): number;
}

let crc32Implementation: CRC32

if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    crc32Implementation = require('crc-32')
} else {
    // No-op implementation for native platforms
    crc32Implementation = Object.assign(
        () => 0,
        { buf: () => 0 }
    )
}

export default crc32Implementation
