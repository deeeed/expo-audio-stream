import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

import {
    ExpoAudioStreamWeb,
    ExpoAudioStreamWebProps,
} from './ExpoAudioStream.web'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExpoAudioStreamModule: any

if (Platform.OS === 'web') {
    let instance: ExpoAudioStreamWeb | null = null

    ExpoAudioStreamModule = ((webProps: ExpoAudioStreamWebProps) => {
        if (!instance) {
            instance = new ExpoAudioStreamWeb(webProps)
        }
        return instance
    })
} else {
    ExpoAudioStreamModule = requireNativeModule('ExpoAudioStream')
}

export default ExpoAudioStreamModule
