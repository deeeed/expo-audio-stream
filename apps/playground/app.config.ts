// Keeo this on top
import 'ts-node/register' // Add this to import TypeScript files

// Deps
import { ExpoConfig } from '@expo/config'
import { config as dotenvConfig } from 'dotenv-flow'
import Joi from 'joi'

dotenvConfig() // Load variables from .env* file

// Define a schema for the environment variables
const envSchema = Joi.object({
    EAS_PROJECT_ID: Joi.string().required(),
    NPM_AUTH_TOKEN: Joi.string().optional(),
}).unknown() // Allow other environment variables

// Validate the environment variables
const { error } = envSchema.validate(process.env)

// If validation fails, throw an error
if (error) {
    throw new Error(`Environment validation error: ${error.message}`)
}

const IS_DEV =
    process.env.APP_VARIANT === 'development' ||
    process.env.NODE_ENV === 'development'

const config: ExpoConfig = {
    name: IS_DEV ? 'AudioPlayground (Dev)' : 'AudioPlayground',
    slug: 'audio-playground',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'net.siteed.audiostream.audioplayground',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: IS_DEV ? '#ffffff' : '#98c1d9',
    },
    assetBundlePatterns: ['**/*', 'assets/audio_samples/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'net.siteed.audiostream.audioplayground',
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: IS_DEV ? '#ffffff' : '#98c1d9',
        },
        package: 'net.siteed.audiostream.audioplayground',
    },
    web: {
        favicon: './assets/favicon.png',
        bundler: 'metro',
    },
    experiments: {
        baseUrl: IS_DEV ? '' : '/expo-audio-stream/playground/',
    },
    updates: {
        url: 'https://u.expo.dev/cf0b88bd-5c8f-4c08-acaa-a433582f33c6',
    },
    runtimeVersion: '1.0.0',
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
    extra: {
        eas: {
            projectId: process.env.EAS_PROJECT_ID,
        },
    },
}

export default config
