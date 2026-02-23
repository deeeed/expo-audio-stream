import { ExtractAudioDataOptions } from '../ExpoAudioStream.types'
import ExpoAudioStreamModule from '../ExpoAudioStreamModule'
import { isWeb } from '../constants'
import { cleanNativeOptions } from '../utils/cleanNativeOptions'

export const extractAudioData = async (props: ExtractAudioDataOptions) => {
    if (isWeb) {
        // Web implementation handles logger natively in ExpoAudioStreamModule.ts
        return await ExpoAudioStreamModule.extractAudioData(props)
    }
    // Native: only pass serializable fields — logger causes crash on Android
    const { logger: _logger, ...nativeOptions } = props
    // Clean undefined values to avoid Android Kotlin bridge crash
    return await ExpoAudioStreamModule.extractAudioData(
        cleanNativeOptions(nativeOptions)
    )
}
