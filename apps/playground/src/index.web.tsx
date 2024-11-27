import '@expo/metro-runtime'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'
import { version as SkiaVersion } from 'canvaskit-wasm/package.json'
import { registerRootComponent } from 'expo'
import { renderRootComponent } from 'expo-router/build/renderRootComponent'
import { Platform } from 'react-native'

import { AppRoot } from './AppRoot'

// FIXME: should be removed once react-native-reanimated is fixed https://github.com/software-mansion/react-native-reanimated/issues/6740
if (Platform.OS === 'web') {
    global._WORKLET = false
    // @ts-expect-error
    global._log = console.log
    // @ts-expect-error
    global._getAnimationTimestamp = () => performance.now()
}

if (Platform.OS === 'web') {
    LoadSkiaWeb({
        locateFile: (path) => {
            const url = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${SkiaVersion}/bin/full/${path}`
            console.log(`__DEV__=${__DEV__} Loading Skia: ${url}`)
            return url
        },
    })
        .then(async () => {
            renderRootComponent(AppRoot)
            return true
        })
        .catch((error) => {
            console.error('Failed to load Skia', error)
        })
} else {
    registerRootComponent(AppRoot)
}
