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

interface AudioStreamPluginOptions {
    enablePhoneStateHandling?: boolean
    enableNotifications?: boolean
    enableBackgroundAudio?: boolean
}

const withRecordingPermission: ConfigPlugin<AudioStreamPluginOptions> = (
    config: ExpoConfig,
    props: AudioStreamPluginOptions | void
) => {
    // Default options if pluginOptions is undefined (void)
    const options: AudioStreamPluginOptions = {
        enablePhoneStateHandling: true,
        enableNotifications: true,
        enableBackgroundAudio: true,
        ...(props || {}),
    }

    const {
        enablePhoneStateHandling,
        enableNotifications,
        enableBackgroundAudio,
    } = options

    debugLog('📱 Configuring Recording Permissions Plugin...', options)

    // Rest of the code remains the same...
    // iOS Configuration
    config = withInfoPlist(config as any, (config) => {
        // Base microphone permission (always required)
        config.modResults['NSMicrophoneUsageDescription'] =
            config.modResults['NSMicrophoneUsageDescription'] ||
            MICROPHONE_USAGE

        if (enableNotifications) {
            config.modResults['NSUserNotificationsUsageDescription'] =
                NOTIFICATION_USAGE
            config.modResults['NSUserNotificationAlertStyle'] = 'alert'
        }

        const existingBackgroundModes =
            config.modResults.UIBackgroundModes || []

        if (
            enableBackgroundAudio &&
            !existingBackgroundModes.includes('audio')
        ) {
            existingBackgroundModes.push('audio')
        }

        if (enablePhoneStateHandling) {
            if (!existingBackgroundModes.includes('voip')) {
                existingBackgroundModes.push('voip')
            }
            const existingCapabilities = (config.modResults
                .UIRequiredDeviceCapabilities || []) as string[]
            if (!existingCapabilities.includes('telephony')) {
                existingCapabilities.push('telephony')
            }
            config.modResults.UIRequiredDeviceCapabilities =
                existingCapabilities
        }

        config.modResults.UIBackgroundModes = existingBackgroundModes
        return config
    })

    // Android Configuration
    config = withAndroidManifest(config as any, (config) => {
        const basePermissions = [
            'android.permission.RECORD_AUDIO',
            'android.permission.WAKE_LOCK',
        ]

        const optionalPermissions = [
            enableNotifications && 'android.permission.POST_NOTIFICATIONS',
            enablePhoneStateHandling && 'android.permission.READ_PHONE_STATE',
            enableBackgroundAudio && 'android.permission.FOREGROUND_SERVICE',
            enableBackgroundAudio &&
                'android.permission.FOREGROUND_SERVICE_MICROPHONE',
        ].filter(Boolean) as string[]

        const permissionsToAdd = [...basePermissions, ...optionalPermissions]

        debugLog(
            '📋 Existing Android permissions:',
            config.modResults.manifest['uses-permission']?.map(
                (p) => p.$?.['android:name']
            ) || []
        )

        debugLog('➕ Adding Android permissions:', permissionsToAdd)

        const { addPermission } = AndroidConfig.Permissions

        // Add each permission only if it doesn't exist
        permissionsToAdd.forEach((permission) => {
            const existingPermission = config.modResults.manifest[
                'uses-permission'
            ]?.find((p) => p.$?.['android:name'] === permission)
            if (!existingPermission) {
                addPermission(config.modResults, permission)
            }
        })

        // Get the main application node
        const mainApplication = config.modResults.manifest.application?.[0]
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
            console.error(
                `${LOG_PREFIX} ❌ Main application node not found in Android Manifest`
            )
        }

        return config
    })

    debugLog('✨ Recording Permissions Plugin configuration completed')
    return config as any
}

export default withRecordingPermission
