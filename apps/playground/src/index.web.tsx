import '@expo/metro-runtime'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'
import { version as SkiaVersion } from 'canvaskit-wasm/package.json'
import { App } from 'expo-router/build/qualified-entry'
import { renderRootComponent } from 'expo-router/build/renderRootComponent'

import { isWeb } from './utils/utils'

if (isWeb) {
    localStorage.debug = 'expo-audio-stream::*'
}

LoadSkiaWeb({
    locateFile: (path) => {
        console.log(`__DEV__=${__DEV__} Loading Skia: ${path}`)
        const url = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${SkiaVersion}/bin/full/${path}`
        console.log(`__DEV__=${__DEV__} Loading Skia: ${url}`)
        return url
    },
})
    .then(async () => {
        renderRootComponent(App)
        return true
    })
    .catch((error) => {
        console.error('Failed to load Skia', error)
    })
