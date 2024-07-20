import { BitDepth, EncodingType } from '../ExpoAudioStream.types'

export const encodingToBitDepth = ({
    encoding,
}: {
    encoding: EncodingType
}): BitDepth => {
    switch (encoding) {
        case 'pcm_32bit':
            return 32
        case 'pcm_16bit':
            return 16
        case 'pcm_8bit':
            return 8
        default:
            throw new Error(`Unsupported encoding type: ${encoding}`)
    }
}
