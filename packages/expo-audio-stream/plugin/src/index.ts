import {
    AndroidConfig,
    ConfigPlugin,
    withAndroidManifest,
    withInfoPlist,
} from '@expo/config-plugins'

const MICROPHONE_USAGE = 'Allow $(PRODUCT_NAME) to access your microphone'

const withRecordingPermission: ConfigPlugin<{
    microphonePermission: string
}> = (config, existingPerms) => {
    if (!existingPerms) {
        console.warn('No previous permissions provided')
    }
    config = withInfoPlist(config, (config) => {
        config.modResults['NSMicrophoneUsageDescription'] = MICROPHONE_USAGE

        // Add audio to UIBackgroundModes to allow background audio recording
        const existingBackgroundModes =
            config.modResults.UIBackgroundModes || []
        if (!existingBackgroundModes.includes('audio')) {
            existingBackgroundModes.push('audio')
        }
        config.modResults.UIBackgroundModes = existingBackgroundModes

        return config
    })

    config = withAndroidManifest(config, (config) => {
        const androidManifest = config.modResults
        const mainApplication =
            AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)

        // Add RECORD_AUDIO permission
        AndroidConfig.Manifest.addMetaDataItemToMainApplication(
            mainApplication,
            'android.permission.RECORD_AUDIO',
            MICROPHONE_USAGE
        )

        // Add FOREGROUND_SERVICE permission
        AndroidConfig.Manifest.addMetaDataItemToMainApplication(
            mainApplication,
            'android.permission.FOREGROUND_SERVICE',
            'This apps needs access to the foreground service to record audio in the background'
        )

        // Add WAKE_LOCK permission using the uses-permission tag
        if (
            !androidManifest.manifest ||
            !Array.isArray(androidManifest.manifest)
        ) {
            return config
        }

        const manifest = androidManifest.manifest[0]
        if (!manifest['uses-permission']) {
            manifest['uses-permission'] = []
        }

        const hasWakeLock = manifest['uses-permission'].some(
            (perm: { $: { [key: string]: string } }) =>
                perm.$['android:name'] === 'android.permission.WAKE_LOCK'
        )

        if (!hasWakeLock) {
            manifest['uses-permission'].push({
                $: {
                    'android:name': 'android.permission.WAKE_LOCK',
                },
            })
        }

        return config
    })

    return config
}

export default withRecordingPermission
