import {
    ConfigPlugin,
    withAndroidManifest,
    withInfoPlist,
    AndroidConfig,
} from '@expo/config-plugins'
import { ExpoConfig } from '@expo/config-types'

const MICROPHONE_USAGE = 'Allow $(PRODUCT_NAME) to access your microphone'
const NOTIFICATION_USAGE = 'Show recording notifications and controls'
const LOG_PREFIX = '[@siteed/expo-audio-stream]'

function debugLog(message: string, ...args: unknown[]): void {
    if (process.env.EXPO_DEBUG) {
        console.log(`${LOG_PREFIX} ${message}`, ...args)
    }
}

const withRecordingPermission: ConfigPlugin = (config: ExpoConfig) => {
    debugLog('📱 Configuring Recording Permissions Plugin...')

    // iOS Configuration
    config = withInfoPlist(config as any, (config) => {
        debugLog('🍎 Configuring iOS permissions and capabilities...')

        // Existing microphone permission
        config.modResults['NSMicrophoneUsageDescription'] =
            config.modResults['NSMicrophoneUsageDescription'] ||
            MICROPHONE_USAGE

        // Add notification permissions
        config.modResults['NSUserNotificationsUsageDescription'] =
            NOTIFICATION_USAGE

        // Add notification style
        config.modResults['NSUserNotificationAlertStyle'] = 'alert'

        // Background modes
        const existingBackgroundModes =
            config.modResults.UIBackgroundModes || []
        if (!existingBackgroundModes.includes('audio')) {
            existingBackgroundModes.push('audio')
        }
        if (!existingBackgroundModes.includes('remote-notification')) {
            existingBackgroundModes.push('remote-notification')
        }
        config.modResults.UIBackgroundModes = existingBackgroundModes

        debugLog('iOS Background Modes:', config.modResults.UIBackgroundModes)

        return config
    })

    // Android Configuration
    config = withAndroidManifest(config as any, (config) => {
        debugLog('🤖 Configuring Android Manifest...')

        const androidManifest = config.modResults
        if (!androidManifest.manifest) {
            console.error(`${LOG_PREFIX} ❌ Android Manifest is null - plugin cannot continue`)
            return config
        }

        // Add xmlns:android attribute to manifest
        androidManifest.manifest.$ = {
            ...androidManifest.manifest.$,
            'xmlns:android': 'http://schemas.android.com/apk/res/android',
        }

        // Ensure permissions array exists
        if (!androidManifest.manifest['uses-permission']) {
            androidManifest.manifest['uses-permission'] = []
        }

        const { addPermission } = AndroidConfig.Permissions

        debugLog('📋 Existing Android permissions:', 
            androidManifest.manifest['uses-permission']?.map(p => p.$?.['android:name']) || [])

        const permissionsToAdd = [
            'android.permission.RECORD_AUDIO',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_MICROPHONE',
            'android.permission.WAKE_LOCK',
            'android.permission.POST_NOTIFICATIONS',
        ]

        debugLog('➕ Adding Android permissions:', permissionsToAdd)

        // Add each permission only if it doesn't exist
        permissionsToAdd.forEach((permission) => {
            const existingPermission = androidManifest.manifest[
                'uses-permission'
            ]?.find((p) => p.$?.['android:name'] === permission)
            if (!existingPermission) {
                addPermission(androidManifest, permission)
            }
        })

        // Get the main application node
        const mainApplication = androidManifest.manifest.application?.[0]
        if (mainApplication) {
            debugLog('📱 Configuring Android application components...')

            // Add RecordingActionReceiver
            if (!mainApplication.receiver) {
                mainApplication.receiver = []
            }

            const receiverConfig = {
                $: {
                    'android:name': '.RecordingActionReceiver',
                    'android:exported': 'false' as const,
                },
                'intent-filter': [
                    {
                        action: [
                            { $: { 'android:name': 'PAUSE_RECORDING' } },
                            { $: { 'android:name': 'RESUME_RECORDING' } },
                            { $: { 'android:name': 'STOP_RECORDING' } },
                        ],
                    },
                ],
            }

            const receiverIndex = mainApplication.receiver.findIndex(
                (receiver: any) =>
                    receiver.$?.['android:name'] === '.RecordingActionReceiver'
            )

            if (receiverIndex >= 0) {
                mainApplication.receiver[receiverIndex] = receiverConfig
            } else {
                mainApplication.receiver.push(receiverConfig)
            }

            debugLog('✅ RecordingActionReceiver configured')

            // Add AudioRecordingService
            if (!mainApplication.service) {
                mainApplication.service = []
            }

            const serviceConfig = {
                $: {
                    'android:name': '.AudioRecordingService',
                    'android:enabled': 'true' as const,
                    'android:exported': 'false' as const,
                    'android:foregroundServiceType': 'microphone',
                },
            }

            const serviceIndex = mainApplication.service.findIndex(
                (service: any) =>
                    service.$?.['android:name'] === '.AudioRecordingService'
            )

            if (serviceIndex >= 0) {
                mainApplication.service[serviceIndex] = serviceConfig
            } else {
                mainApplication.service.push(serviceConfig)
            }

            debugLog('✅ AudioRecordingService configured')
        } else {
            console.error(`${LOG_PREFIX} ❌ Main application node not found in Android Manifest`)
        }

        return config
    })

    debugLog('✨ Recording Permissions Plugin configuration completed')
    return config as any
}

export default withRecordingPermission
