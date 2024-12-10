import {
    ConfigPlugin,
    withAndroidManifest,
    withInfoPlist,
    AndroidConfig,
} from '@expo/config-plugins'
import { ExpoConfig } from '@expo/config-types'

const MICROPHONE_USAGE = 'Allow $(PRODUCT_NAME) to access your microphone'
const NOTIFICATION_USAGE = 'Show recording notifications and controls'

const withRecordingPermission: ConfigPlugin = (config: ExpoConfig) => {
    // iOS Configuration
    config = withInfoPlist(config as any, (config) => {
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

        return config
    })

    // Android Configuration
    config = withAndroidManifest(config as any, (config) => {
        const androidManifest = config.modResults
        if (!androidManifest.manifest) {
            console.warn(
                'withRecordingPermission: androidManifest.manifest is null'
            )
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

        // Required permissions
        const permissionsToAdd = [
            'android.permission.RECORD_AUDIO',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_MICROPHONE',
            'android.permission.WAKE_LOCK',
            'android.permission.POST_NOTIFICATIONS',
        ]

        // Add each permission
        permissionsToAdd.forEach((permission) => {
            addPermission(androidManifest, permission)
        })

        // Get the main application node
        const mainApplication = androidManifest.manifest.application?.[0]
        if (mainApplication) {
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
        }

        return config
    })

    return config as any // TODO: remove once types are fixed from expo
}

export default withRecordingPermission
