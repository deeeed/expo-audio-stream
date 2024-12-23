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
    APPLE_TEAM_ID: Joi.string().optional(),
    APP_VARIANT: Joi.string()
        .valid('development', 'staging', 'production')
        .default('development'),
    APP_ID_BASE: Joi.string().default('net.siteed.audioplayground'),
}).unknown() // Allow other environment variables

// Validate and get environment variables
const { value: env } = envSchema.validate(process.env)

const getAppIdentifier = (base: string, variant: string): string => {
    if (variant === 'production') return base
    return `${base}.${variant}`
}

const APP_IDENTIFIER = getAppIdentifier(env.APP_ID_BASE, env.APP_VARIANT)

const config: ExpoConfig = {
    name:
        env.APP_VARIANT === 'production'
            ? 'AudioPlayground'
            : `AudioPlayground (${env.APP_VARIANT})`,
    slug: 'audio-playground',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: APP_IDENTIFIER,
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
            projectId: env.EAS_PROJECT_ID,
        },
    },
}

export default config
