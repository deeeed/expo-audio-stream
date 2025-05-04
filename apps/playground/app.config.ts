// Keeo this on top
import 'ts-node/register'

// Deps
import { ConfigContext, ExpoConfig } from '@expo/config'
import { config as dotenvConfig } from 'dotenv-flow'
import Joi from 'joi'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { version as packageVersion } from './package.json'

dotenvConfig({
    silent: true,
    node_env: process.env.APP_VARIANT || "production", // This will use APP_VARIANT for env file selection
}) // Load variables from .env* files

// Define a schema for the environment variables
const envSchema = Joi.object({
    EAS_PROJECT_ID: Joi.string().required(),
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

try {
  const ortPackageJsonPath = join(__dirname, 'node_modules/onnxruntime-web/package.json')
  const canvasKitPackageJsonPath = join(__dirname, 'node_modules/canvaskit-wasm/package.json')

  const ortPackageJson = JSON.parse(readFileSync(ortPackageJsonPath, 'utf-8'))
  const canvasKitPackageJson = JSON.parse(readFileSync(canvasKitPackageJsonPath, 'utf-8'))

  validatedEnv.ORT_VERSION = ortPackageJson.version
  validatedEnv.CANVASKIT_VERSION = canvasKitPackageJson.version

} catch (readError) {
  console.error('Error reading package.json for version injection:', readError)
  validatedEnv.ORT_VERSION = undefined
  validatedEnv.CANVASKIT_VERSION = undefined
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
    'ORT Version (Injected)': validatedEnv.ORT_VERSION || 'Not Found',
    'CanvasKit Version (Injected)': validatedEnv.CANVASKIT_VERSION || 'Not Found',
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
    assetBundlePatterns: ['**/*', 'assets/audio_samples/*', 'public/audioStorage.worker.js', 'assets/silero_vad.onnx'],
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
        enabled: true,
        checkAutomatically: "ON_LOAD",
        useEmbeddedUpdate: true
    },
    runtimeVersion: '1.2.0',
    owner: 'deeeed',
    plugins: [
        [
            'expo-font',
            {
                fonts: ['./assets/Roboto/Roboto-Regular.ttf'],
            },
        ],
        [
            '../../packages/expo-audio-studio/app.plugin.cjs',
            // '@siteed/expo-audio-studio',
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
                    allowBackgroundAudioControls: false,
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
                    deploymentTarget: "15.1",
                    infoPlist: {
                        ITSAppUsesNonExemptEncryption: false,
                        LSApplicationCategoryType: "public.app-category.utilities"
                    }
                },
                android: {},
            },
        ],
        'onnxruntime-react-native',
        ['./plugins/withCustomGradleConfig.cjs', {}],
        ['./plugins/withLibcppFix.cjs', {}],
        [
            'react-native-edge-to-edge',
            {
                enableEdgeToEdge: true,
            },
        ],
        [
            '@config-plugins/detox',
            {
              skipProguard: false,
              subdomains: process.env.EAS_BUILD_PROFILE === "development"
              ? "*"
              : [
                '10.0.2.2',
                'localhost',
                '192.168.50.10',
                '192.168.50.11',
                '192.168.11.1',
                '192.168.1.39',
              ],
            },
        ],
        "expo-background-task",
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
            channelName: validatedEnv.APP_VARIANT,
        },
        APP_VARIANT: validatedEnv.APP_VARIANT,
        ORT_VERSION: validatedEnv.ORT_VERSION,
        CANVASKIT_VERSION: validatedEnv.CANVASKIT_VERSION,
    },
}

}
