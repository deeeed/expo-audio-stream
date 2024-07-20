import Constants from 'expo-constants'

const baseUrl =
    Constants.expoConfig?.experiments?.baseUrl?.replace(/\/$/, '') ?? ''

export const config = {
    baseUrl,
    audioWorkletUrl: `${baseUrl}/audioworklet.js`,
    featuresExtratorUrl: `${baseUrl}/audio-features-extractor.js`,
}
