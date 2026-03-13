import { Platform } from 'react-native'
import type { ModelDownloadProgress } from '@siteed/sherpa-onnx.rn'
import { WEB_FEATURES, type WebFeatureKey } from '../config/webFeatures'

/**
 * Returns a progress handler for web model downloads, or undefined on native.
 * Eliminates the repeated Platform.OS === 'web' ? (info) => { ... } : undefined pattern.
 */
export function makeWebProgressHandler(
    setStatusMessage: (msg: string) => void
): ((info: ModelDownloadProgress) => void) | undefined {
    if (Platform.OS !== 'web') return undefined
    return (info) => {
        const mb = (info.loaded / 1048576).toFixed(1)
        const totalMb = (info.total / 1048576).toFixed(1)
        setStatusMessage(
            `Downloading ${info.filename}: ${mb}/${totalMb} MB (${info.percent}%)`
        )
    }
}

/**
 * Returns the CDN base URL for a web feature, or undefined on native.
 */
export function getWebModelBaseUrl(
    feature: WebFeatureKey
): string | undefined {
    if (Platform.OS !== 'web') return undefined
    return WEB_FEATURES[feature]?.modelBaseUrl
}
