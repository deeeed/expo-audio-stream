import { ExtractAudioDataOptions } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'

export const extractAudioData = async (props: ExtractAudioDataOptions) => {
    return await ExpoAudioStreamModule.extractAudioData(props)
}
