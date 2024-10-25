import {
    ConfigPlugin,
    withAndroidManifest,
    withInfoPlist,
} from '@expo/config-plugins'

const MICROPHONE_USAGE = 'Allow $(PRODUCT_NAME) to access your microphone'

const withRecordingPermission: ConfigPlugin = (config) => {
    // iOS Configuration
    config = withInfoPlist(config, (config) => {
        config.modResults['NSMicrophoneUsageDescription'] =
            config.modResults['NSMicrophoneUsageDescription'] ||
            MICROPHONE_USAGE

        // Add 'audio' to UIBackgroundModes to allow background audio recording
        const existingBackgroundModes =
            config.modResults.UIBackgroundModes || []
        if (!existingBackgroundModes.includes('audio')) {
            existingBackgroundModes.push('audio')
        }
        config.modResults.UIBackgroundModes = existingBackgroundModes

        return config
    })

    // Android Configuration
    config = withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults
        if (!androidManifest.manifest) {
            console.warn(
                'withRecordingPermission: androidManifest.manifest is null'
            )
            return config
        }

        // Ensure 'uses-permission' is an array
        if (!androidManifest.manifest['uses-permission']) {
            androidManifest.manifest['uses-permission'] = []
        }

        const usesPermissions = androidManifest.manifest[
            'uses-permission'
        ] as any[]

        const permissionsToAdd = [
            'android.permission.RECORD_AUDIO',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.WAKE_LOCK',
            'android.permission.POST_NOTIFICATIONS', // Add this permission
        ]

        permissionsToAdd.forEach((permission) => {
            const permissionAlreadyAdded = usesPermissions.some(
                (perm: any) => perm.$?.['android:name'] === permission
            )
            if (!permissionAlreadyAdded) {
                usesPermissions.push({
                    $: { 'android:name': permission },
                })
            }
        })

        return config
    })

    return config
}

export default withRecordingPermission
