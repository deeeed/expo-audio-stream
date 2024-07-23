import { getLogger } from "@siteed/react-native-logger";
import { getWavFileInfo, WavFileInfo } from "./getWavFileInfo";

export const WAV_HEADER_SIZE = 44

const logger = getLogger('convertPCMToFloat32');

const convertSample = (dataView: DataView, offset: number, bitDepth: number): number => {
    switch (bitDepth) {
        case 8:
            return (dataView.getUint8(offset) - 128) / 128;
        case 16:
            return dataView.getInt16(offset, true) / 32768;
        case 24:
            return (
                (dataView.getUint8(offset) |
                    (dataView.getUint8(offset + 1) << 8) |
                    (dataView.getUint8(offset + 2) << 16)) / 8388608
            ) * 2 - 1;
        case 32:
            return dataView.getFloat32(offset, true);
        default:
            throw new Error(`Unsupported bit depth: ${bitDepth}`);
    }
};

export const convertPCMToFloat32 = async ({
    bitDepth,
    buffer,
    skipWavHeader = false,
}: {
    buffer: ArrayBuffer
    bitDepth: number
    skipWavHeader?: boolean
}): Promise<{ pcmValues: Float32Array; min: number; max: number }> => {
    try {
        const wavFileInfo: WavFileInfo = await getWavFileInfo(buffer);
        const dataView = new DataView(buffer);
        const headerOffset = skipWavHeader ? wavFileInfo.dataChunkOffset : 0;

        const dataLength = buffer.byteLength - headerOffset;
        const sampleLength = dataLength / (bitDepth / 8);
        const float32Array = new Float32Array(sampleLength);
        let min = Infinity;
        let max = -Infinity;

        for (let i = 0; i < sampleLength; i++) {
            const offset = headerOffset + i * (bitDepth / 8);
            const value = convertSample(dataView, offset, bitDepth);

            if (value < min) min = value;
            if (value > max) max = value;

            float32Array[i] = value;
        }

        return { pcmValues: float32Array, min, max };
    } catch (error) {
        logger.error(`Error converting PCM to Float32: ${error.message}`, error);
        return { pcmValues: new Float32Array(), min: 0, max: 0 };
    }
}
