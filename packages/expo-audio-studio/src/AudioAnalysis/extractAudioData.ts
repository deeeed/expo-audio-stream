import { isWeb } from '../constants'
import { ExtractAudioDataOptions } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'

export const extractAudioData = async (props: ExtractAudioDataOptions) => {
    if (isWeb) {
        // Web implementation handles logger natively in ExpoAudioStreamModule.ts
        return await ExpoAudioStreamModule.extractAudioData(props)
    }
    // Native: only pass serializable fields — logger causes crash on Android
    const { logger: _logger, ...nativeOptions } = props
    return await ExpoAudioStreamModule.extractAudioData(nativeOptions)
}
