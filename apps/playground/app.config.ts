// Keeo this on top
import 'ts-node/register'

// Deps
import { ConfigContext, ExpoConfig } from '@expo/config'
import { config as dotenvConfig } from 'dotenv-flow'
import Joi from 'joi'
import { version as packageVersion } from './package.json'

dotenvConfig({
    silent: true,
    node_env: process.env.APP_VARIANT || "production", // This will use APP_VARIANT for env file selection
}) // Load variables from .env* files

// Define a schema for the environment variables
const envSchema = Joi.object({
    EAS_PROJECT_ID: Joi.string().required(),
    NPM_AUTH_TOKEN: Joi.string().optional(),
    APPLE_TEAM_ID: Joi.string().optional(),
    APP_VARIANT: Joi.string()
        .valid('development', 'staging', 'production')
        .default('production')
        .required(),
}).unknown() // Allow other environment variables

// Validate and get environment variables
const { error, value: env } = envSchema.validate(process.env, {
    abortEarly: true,
    debug: true,
    presence: 'required', // This ensures defaults are applied
    stripUnknown: false,
})

if (error) {
    console.error('Environment validation error:', error.message)
    throw error
}

// Add type assertion to ensure APP_VARIANT is typed correctly
const validatedEnv = env as typeof env & {
    APP_VARIANT: 'development' | 'staging' | 'production'
}

// Add a helper function for logging
function logConfig(config: Record<string, unknown>, prefix = '') {
    console.log('\n🔧 Environment Configuration:')
    console.log('-----------------------------')
    Object.entries(config).forEach(([key, value]) => {
        if (value !== undefined) {
            console.log(`${prefix}${key}: ${value}`)
        }
    })
    console.log('-----------------------------\n')
}

const getAppIdentifier = (base: string, variant: string): string => {
    if (variant === 'production') return base
    return `${base}.${variant}`
}

const APP_IDENTIFIER = getAppIdentifier('net.siteed.audioplayground', validatedEnv.APP_VARIANT)

// Log the important configuration values
logConfig({
    'App Variant': validatedEnv.APP_VARIANT,
    'App Identifier': APP_IDENTIFIER,
    'App Version': packageVersion,
    'EAS Project ID': validatedEnv.EAS_PROJECT_ID,
    'Apple Team ID': validatedEnv.APPLE_TEAM_ID || 'Not set',
    'Environment': process.env.NODE_ENV || 'development',
})

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
    ...config,
    name:
        validatedEnv.APP_VARIANT === 'production'
            ? 'AudioPlayground'
            : `AudioDevPlayground`,
    slug: 'audioplayground',
    version: packageVersion,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'audioplayground',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor:
            validatedEnv.APP_VARIANT === 'production' ? '#98c1d9' : '#ffffff',
    },
    assetBundlePatterns: ['**/*', 'assets/audio_samples/*', 'public/audioStorage.worker.js'],
    ios: {
        newArchEnabled: true,
        supportsTablet: true,
        bundleIdentifier: APP_IDENTIFIER,
        appleTeamId: validatedEnv.APPLE_TEAM_ID,
        infoPlist: {
            "ITSAppUsesNonExemptEncryption": false,
        },
    },
    android: {
        newArchEnabled: false,
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor:
                validatedEnv.APP_VARIANT === 'production' ? '#98c1d9' : '#ffffff',
        },
        package: APP_IDENTIFIER,
    },
    web: {
        favicon: './assets/favicon.png',
        bundler: 'metro',
    },
    experiments: {
        baseUrl:
            validatedEnv.APP_VARIANT === 'production'
                ? '/expo-audio-stream/playground/'
                : '',
    },
    updates: {
        url: 'https://u.expo.dev/' + validatedEnv.EAS_PROJECT_ID,
    },
    runtimeVersion: '0.7.0',
    owner: 'deeeed',
    plugins: [
        [
            'expo-font',
            {
                fonts: ['./assets/Roboto/Roboto-Regular.ttf'],
            },
        ],
        [
            '../../packages/expo-audio-stream/app.plugin.js',
            {
                enablePhoneStateHandling: true,
                enableNotifications: true,
                enableBackgroundAudio: true,
                iosBackgroundModes: {
                    useAudio: true,
                    useProcessing: true,
                    useVoIP: false,
                    useLocation: false,
                    useExternalAccessory: false
                },
                iosConfig: {
                    allowBackgroundAudioControls: true,
                    backgroundProcessingTitle: "Audio Processing",
                    microphoneUsageDescription: "AudioPlayground needs microphone access to record your voice and audio for creating audio samples.",
                    notificationUsageDescription: "Allow notifications to control audio recording from the notification center"
                }
            },
        ],
        [
            'expo-build-properties',
            {
                ios: {
                    infoPlist: {
                        ITSAppUsesNonExemptEncryption: false
                    }
                },
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
            projectId: validatedEnv.EAS_PROJECT_ID,
        },
    },
}

}
