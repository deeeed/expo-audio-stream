import { ExtractAudioDataOptions } from '../AudioStudio.types'
import AudioStudioModule from '../AudioStudioModule'
import { isWeb } from '../constants'
import { cleanNativeOptions } from '../utils/cleanNativeOptions'

export const extractAudioData = async (props: ExtractAudioDataOptions) => {
    if (isWeb) {
        // Web implementation handles logger natively in AudioStudioModule.ts
        return await AudioStudioModule.extractAudioData(props)
    }
    // Native: only pass serializable fields — logger causes crash on Android
    const { logger: _logger, ...nativeOptions } = props
    // Clean undefined values to avoid Android Kotlin bridge crash
    return await AudioStudioModule.extractAudioData(
        cleanNativeOptions(nativeOptions)
    )
}
