import 'ts-node/register';

// Deps
import { ConfigContext, ExpoConfig } from '@expo/config';
import { config as dotenvConfig } from 'dotenv-flow';
import Joi from 'joi';
import { version as packageVersion } from './package.json';

dotenvConfig({
    silent: true,
    node_env: process.env.APP_VARIANT || "production",
});

// Define a schema for the environment variables
const envSchema = Joi.object({
    EAS_PROJECT_ID: Joi.string().optional().default(''),
    APPLE_TEAM_ID: Joi.string().optional(),
    APP_VARIANT: Joi.string()
        .valid('development', 'production')
        .default('production'),
}).unknown();

// Validate and get environment variables
const { error, value: env } = envSchema.validate(process.env, {
    abortEarly: true,
    stripUnknown: false,
});

if (error) {
    console.error('Environment validation error:', error.message);
    throw error;
}

const validatedEnv = env as typeof env & {
    APP_VARIANT: 'development' | 'production'
};

// Add a helper function for logging
function logConfig(config: Record<string, unknown>, prefix = '') {
    console.log('\n🔧 Configuration:');
    console.log('-----------------------------');
    Object.entries(config).forEach(([key, value]) => {
        if (value !== undefined) {
            console.log(`${prefix}${key}: ${value}`);
        }
    });
    console.log('-----------------------------\n');
}

const getAppIdentifier = (base: string, variant: string): string => {
    if (variant === 'production') return base;
    return `${base}.${variant}`;
};

const APP_IDENTIFIER = getAppIdentifier('net.siteed.sherpavoice', validatedEnv.APP_VARIANT);

logConfig({
    'App Variant': validatedEnv.APP_VARIANT,
    'App Identifier': APP_IDENTIFIER,
    'App Version': packageVersion,
    'EAS Project ID': validatedEnv.EAS_PROJECT_ID,
    'Environment': process.env.NODE_ENV || 'development',
});

const IS_PRODUCTION = validatedEnv.APP_VARIANT === 'production';

export default ({ config }: ConfigContext): ExpoConfig => {
    return {
        ...config,
        name: IS_PRODUCTION ? 'Sherpa Voice' : 'SherpaVoiceDev',
        slug: "sherpa-voice",
        version: packageVersion,
        orientation: "portrait",
        icon: IS_PRODUCTION ? "./assets/icon.png" : "./assets/icon-dev.png",
        userInterfaceStyle: "light",
        scheme: "sherpa-voice",
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: IS_PRODUCTION ? '#1a73e8' : '#ffffff',
        },
        assetBundlePatterns: [
            "**/*"
        ],
        ios: {
            supportsTablet: true,
            bundleIdentifier: APP_IDENTIFIER,
            appleTeamId: validatedEnv.APPLE_TEAM_ID,
            infoPlist: {
                "UIBackgroundModes": ["audio"],
                "ITSAppUsesNonExemptEncryption": false,
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: IS_PRODUCTION ? "./assets/adaptive-icon.png" : "./assets/adaptive-icon-dev.png",
                backgroundColor: IS_PRODUCTION ? '#1a73e8' : '#ffffff',
            },
            package: APP_IDENTIFIER,
        },
        developmentClient: {
            silentLaunch: true,
        },
        web: {
            favicon: "./assets/favicon.png",
            bundler: 'metro',
        },
        experiments: {
            baseUrl:
                IS_PRODUCTION
                    ? '/expo-audio-stream/sherpa-voice/'
                    : '',
        },
        runtimeVersion: '1.0.1',
        ...(validatedEnv.EAS_PROJECT_ID ? {
            updates: {
                url: 'https://u.expo.dev/' + validatedEnv.EAS_PROJECT_ID,
                enabled: true,
                checkAutomatically: "ON_LOAD",
                useEmbeddedUpdate: true,
            },
        } : {}),
        owner: 'deeeed',
        plugins: [
            ["./plugins/withMetroPort.cjs", { port: 7500 }],
            "./plugins/withCustomGradleConfig.cjs",
            "expo-router",
            [
                "expo-audio",
                {
                    "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
                }
            ],
            ["@config-plugins/detox", { skipProguard: false, subdomains: IS_PRODUCTION ? ["10.0.2.2", "localhost"] : "*" }] as const,
            [
                "expo-build-properties",
                {
                    "ios": {
                        "deploymentTarget": "15.1"
                    },
                    "android": {
                        "extraProguardRules": "-keep class com.facebook.hermes.unicode.** { *; }",
                        "extraMavenRepos": [],
                        "useLegacyPackaging": false,
                        "gradleProperties": {
                            "org.gradle.jvmargs": "-Xmx4096m -XX:MaxMetaspaceSize=1024m",
                            "reactNativeDevServerPort": "7500"
                        }
                    }
                }
            ]
        ],
        extra: {
            eas: {
                projectId: validatedEnv.EAS_PROJECT_ID,
                channelName: validatedEnv.APP_VARIANT,
            },
            APP_VARIANT: validatedEnv.APP_VARIANT,
        },
    };
};
