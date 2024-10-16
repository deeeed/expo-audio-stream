import '@expo/metro-runtime'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'
import { setLoggerConfig, getLogger } from '@siteed/react-native-logger'
import { version as SkiaVersion } from 'canvaskit-wasm/package.json'
import { App } from 'expo-router/build/qualified-entry'
import { renderRootComponent } from 'expo-router/build/renderRootComponent'
import { Platform } from 'react-native'

setLoggerConfig({
    namespaces: '*',
    disableExtraParamsInConsole: Platform.OS !== 'web',
})

const logger = getLogger('index.web.tsx')

LoadSkiaWeb({
    locateFile: (path) => {
        const url = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${SkiaVersion}/bin/full/${path}`
        logger.log(`__DEV__=${__DEV__} Loading Skia: ${url}`)
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
