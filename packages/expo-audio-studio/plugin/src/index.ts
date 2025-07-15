import {
    ConfigPlugin,
    withAndroidManifest,
    withInfoPlist,
    AndroidConfig,
} from '@expo/config-plugins'
import { ExpoConfig } from '@expo/config-types'

const MICROPHONE_USAGE = 'Allow $(PRODUCT_NAME) to access your microphone'
const NOTIFICATION_USAGE = 'Show recording notifications and controls'
const LOG_PREFIX = '[@siteed/expo-audio-studio]'

function debugLog(message: string, ...args: unknown[]): void {
    if (process.env.EXPO_DEBUG) {
        console.log(`${LOG_PREFIX} ${message}`, ...args)
    }
}

interface AudioStreamPluginOptions {
    enablePhoneStateHandling?: boolean // Controls READ_PHONE_STATE permission
    enableNotifications?: boolean
    enableBackgroundAudio?: boolean
    enableDeviceDetection?: boolean // Controls Bluetooth and USB permissions for device change detection
    iosBackgroundModes?: {
        useVoIP?: boolean
        useAudio?: boolean
        useProcessing?: boolean
        useLocation?: boolean
        useExternalAccessory?: boolean
    }
    iosConfig?: {
        allowBackgroundAudioControls?: boolean
        backgroundProcessingTitle?: string
        microphoneUsageDescription?: string
        notificationUsageDescription?: string
    }
}

const withRecordingPermission: ConfigPlugin<AudioStreamPluginOptions> = (
    config: ExpoConfig,
    props: AudioStreamPluginOptions | void
) => {
    const options: AudioStreamPluginOptions = {
        enablePhoneStateHandling: true, // Default to true for backward compatibility
        enableNotifications: true,
        enableBackgroundAudio: true,
        enableDeviceDetection: true, // Default to true for backward compatibility
        iosBackgroundModes: {
            useVoIP: false,
            useAudio: false,
            useProcessing: false,
            useLocation: false,
            useExternalAccessory: false,
        },
        iosConfig: {
            microphoneUsageDescription: MICROPHONE_USAGE,
            notificationUsageDescription: NOTIFICATION_USAGE,
        },
        ...(props || {}),
    }

    const {
        enablePhoneStateHandling,
        enableNotifications,
        enableBackgroundAudio,
        enableDeviceDetection,
    } = options

    debugLog('📱 Configuring Recording Permissions Plugin...', options)

    // iOS Configuration
    config = withInfoPlist(config as any, (config) => {
        // Always set the microphone usage description from options first
        config.modResults['NSMicrophoneUsageDescription'] =
            options.iosConfig?.microphoneUsageDescription ||
            config.modResults['NSMicrophoneUsageDescription'] ||
            MICROPHONE_USAGE

        if (enableNotifications) {
            config.modResults['NSUserNotificationsUsageDescription'] =
                options.iosConfig?.notificationUsageDescription ||
                config.modResults['NSUserNotificationsUsageDescription'] ||
                NOTIFICATION_USAGE
            config.modResults['NSUserNotificationAlertStyle'] = 'alert'
        }

        const existingBackgroundModes =
            config.modResults.UIBackgroundModes || []

        // If background audio is enabled with useAudio, add the audio background mode
        if (
            options.iosBackgroundModes?.useAudio === true &&
            enableBackgroundAudio === true &&
            !existingBackgroundModes.includes('audio')
        ) {
            // Add 'audio' background mode - REQUIRED for background recording
            existingBackgroundModes.push('audio')
            debugLog(
                '✅ Added audio background mode for iOS background recording'
            )

            // Also ensure processing mode is recommended
            if (options.iosBackgroundModes?.useProcessing !== true) {
                console.warn(
                    `${LOG_PREFIX} Warning: Background audio recording works best with both 'audio' and 'processing' background modes. Consider enabling 'useProcessing' in iosBackgroundModes.`
                )
            }
        }

        if (
            options.iosBackgroundModes?.useVoIP === true &&
            enablePhoneStateHandling === true
        ) {
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

        // Add additional background modes only if explicitly set to true
        if (options.iosBackgroundModes?.useProcessing === true) {
            if (!existingBackgroundModes.includes('processing')) {
                existingBackgroundModes.push('processing')
            }
            // Add processing info if enabled
            // Note: We keep the 'audiostream' namespace for native modules to maintain compatibility
            config.modResults.BGTaskSchedulerPermittedIdentifiers = [
                'com.siteed.audiostream.processing',
            ]
        }

        if (options.iosBackgroundModes?.useLocation === true) {
            if (!existingBackgroundModes.includes('location')) {
                existingBackgroundModes.push('location')
            }
        }

        if (options.iosBackgroundModes?.useExternalAccessory === true) {
            if (!existingBackgroundModes.includes('external-accessory')) {
                existingBackgroundModes.push('external-accessory')
            }
        }

        // Configure background processing info if enabled
        if (options.iosConfig?.backgroundProcessingTitle) {
            config.modResults.BGProcessingTaskTitle =
                options.iosConfig.backgroundProcessingTitle
        }

        // Configure audio session behavior
        if (options.iosConfig?.allowBackgroundAudioControls) {
            config.modResults.UIBackgroundModes = [
                ...existingBackgroundModes,
                'remote-notification',
            ]
            config.modResults.MPNowPlayingInfoPropertyPlaybackRate = true
        }

        config.modResults.UIBackgroundModes = existingBackgroundModes
        return config
    })

    // Android Configuration
    config = withAndroidManifest(config as any, (config) => {
        const basePermissions = ['android.permission.RECORD_AUDIO']

        const optionalPermissions = [
            enableNotifications && 'android.permission.POST_NOTIFICATIONS',
            enablePhoneStateHandling && 'android.permission.READ_PHONE_STATE', // Only add if enabled
            enableBackgroundAudio && 'android.permission.FOREGROUND_SERVICE',
            enableBackgroundAudio &&
                'android.permission.FOREGROUND_SERVICE_MICROPHONE',
            enableBackgroundAudio && 'android.permission.WAKE_LOCK', // Keep device awake during background recording
            // Device detection permissions (only if enabled)
            enableDeviceDetection && 'android.permission.BLUETOOTH',
            enableDeviceDetection && 'android.permission.BLUETOOTH_ADMIN',
            enableDeviceDetection && 'android.permission.BLUETOOTH_CONNECT',
            enableDeviceDetection && 'android.permission.USB_PERMISSION',
        ].filter(Boolean) as string[]

        const permissionsToAdd = [...basePermissions, ...optionalPermissions]

        debugLog(
            '📋 Existing Android permissions:',
            config.modResults.manifest['uses-permission']?.map(
                (p) => p.$?.['android:name']
            ) || []
        )

        debugLog('➕ Adding Android permissions:', permissionsToAdd)

        // Add each permission only if it doesn't exist
        permissionsToAdd.forEach((permission) => {
            AndroidConfig.Permissions.addPermission(
                config.modResults,
                permission
            )
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

// Export as default
export default withRecordingPermission
