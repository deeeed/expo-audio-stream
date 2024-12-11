// Keeo this on top
import 'ts-node/register' // Add this to import TypeScript files

// Deps
import { ExpoConfig } from '@expo/config'

const isDev = process.env.NODE_ENV === 'development'

const config: ExpoConfig = {
    name: 'audio-playground',
    slug: 'audio-playground',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'net.siteed.audiostream.audioplayground',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*', 'assets/audio_samples/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'net.siteed.audiostream.audioplayground',
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff',
        },
        package: 'net.siteed.audiostream.audioplayground',
    },
    web: {
        favicon: './assets/favicon.png',
        bundler: 'metro',
    },
    experiments: {
        baseUrl: isDev ? '' : '/expo-audio-stream/playground/',
    },
    newArchEnabled: true,
    plugins: [
        [
            '../../packages/expo-audio-stream/app.plugin.js',
            {
                apiKey: 'custom_secret_api',
            },
        ],
        [
            'expo-font',
            {
                fonts: ['./assets/Roboto/Roboto-Regular.ttf'],
            },
        ],
        [
            'expo-build-properties',
            {
                ios: {},
                android: {},
            },
        ],
        ['./plugins/withCustomGradleConfig', {}],
        'expo-localization',
        // [
        //     'expo-asset',
        //     {
        //         assets: ['./public/audio_samples/recorder_hello_world.wav'],
        //     },
        // ],
        'expo-router',
    ],
}

export default config
