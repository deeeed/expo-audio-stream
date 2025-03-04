import ExpoAudioStreamModule from '../ExpoAudioStreamModule'

export interface ExtractWaveformProps {
    fileUri: string
    numberOfSamples: number
    offset?: number
    length?: number
}
export const extractWaveform = async ({
    fileUri,
    numberOfSamples,
    offset = 0,
    length,
}: ExtractWaveformProps): Promise<unknown> => {
    const res = await ExpoAudioStreamModule.extractAudioAnalysis({
        fileUri,
        numberOfSamples,
        offset,
        length,
    })
    return res
}
