declare module 'crc-32' {
    interface CRC32 {
        (data: string | Uint8Array): number
        buf(data: Uint8Array): number
    }

    const crc32: CRC32
    export default crc32
}
