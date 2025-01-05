// Keeo this on top
import 'ts-node/register' // Add this to import TypeScript files

// Deps
import { ConfigContext, ExpoConfig } from '@expo/config'
import { config as dotenvConfig } from 'dotenv-flow'
import Joi from 'joi'

dotenvConfig({ silent: true }) // Load variables from .env* file

// Define a schema for the environment variables
const envSchema = Joi.object({
    EAS_PROJECT_ID: Joi.string().required(),
    NPM_AUTH_TOKEN: Joi.string().optional(),
    APPLE_TEAM_ID: Joi.string().optional(),
    APP_VARIANT: Joi.string()
        .valid('development', 'staging', 'production')
        .default('development'),
}).unknown() // Allow other environment variables

// Validate and get environment variables
const { value: env } = envSchema.validate(process.env)

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

const APP_IDENTIFIER = getAppIdentifier('net.siteed.audioplayground', env.APP_VARIANT)

// Log the important configuration values
logConfig({
    'App Variant': env.APP_VARIANT,
    'App Identifier': APP_IDENTIFIER,
    'EAS Project ID': env.EAS_PROJECT_ID,
    'Apple Team ID': env.APPLE_TEAM_ID || 'Not set',
    'Environment': process.env.NODE_ENV || 'development',
})

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
    ...config,
    name:
        env.APP_VARIANT === 'production'
            ? 'AudioPlayground'
            : `AudioPlayground (${env.APP_VARIANT})`,
    slug: 'audioplayground',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'audioplayground',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor:
            env.APP_VARIANT === 'production' ? '#98c1d9' : '#ffffff',
    },
    assetBundlePatterns: ['**/*', 'assets/audio_samples/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: APP_IDENTIFIER,
        appleTeamId: env.APPLE_TEAM_ID,
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor:
                env.APP_VARIANT === 'production' ? '#98c1d9' : '#ffffff',
        },
        package: APP_IDENTIFIER,
    },
    web: {
        favicon: './assets/favicon.png',
        bundler: 'metro',
    },
    experiments: {
        baseUrl:
            env.APP_VARIANT === 'production'
                ? '/expo-audio-stream/playground/'
                : '',
    },
    updates: {
        url: 'https://u.expo.dev/' + env.EAS_PROJECT_ID,
    },
    runtimeVersion: '1.0.0',
    newArchEnabled: false,
    owner: 'deeeed',
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
            projectId: env.EAS_PROJECT_ID,
        },
    },
}

}
