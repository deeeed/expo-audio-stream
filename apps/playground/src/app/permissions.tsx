// playground/src/app/(tabs)/play.tsx
import { ScreenWrapper } from '@siteed/design-system'
import { ExpoAudioStreamModule } from '@siteed/expo-audio-stream'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import { baseLogger } from '../config'

interface PermissionStatus {
    status: string
    granted: boolean
    expires: string
    canAskAgain?: boolean
}

const logger = baseLogger.extend('PermissionsPage')

export const PermissionsPage = () => {
    const [permissions, setPermissions] = useState<PermissionStatus | null>(
        null
    )

    const checkPermissions = useCallback(async () => {
        try {
            const status = await ExpoAudioStreamModule.getPermissionsAsync()
            logger.info('[checkPermissions] Permissions status', { status })
            setPermissions(status)
        } catch (error) {
            console.error('Error checking permissions:', error)
        }
    }, [])

    const requestPermissions = useCallback(async () => {
        try {
            const status = await ExpoAudioStreamModule.requestPermissionsAsync()
            logger.info('[requestPermissions] Permissions status', { status })
            setPermissions(status)

            // If permission is denied but can ask again, show settings alert
            if (!status.granted && status.status === 'denied' && status.canAskAgain) {
                Alert.alert(
                    'Microphone Permission Required',
                    'Please enable microphone access in your device settings to use audio features.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings(),
                        },
                    ]
                )
            }
        } catch (error) {
            console.error('Error requesting permissions:', error)
        }
    }, [])

    useEffect(() => {
        checkPermissions()
    }, [checkPermissions])

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text variant="headlineMedium">Audio Permissions</Text>

                <View style={styles.statusContainer}>
                    <Text variant="titleMedium">Current Status:</Text>
                    {permissions && (
                        <>
                            <Text>Status: {permissions.status}</Text>
                            <Text>
                                Granted: {permissions.granted ? 'Yes' : 'No'}
                            </Text>
                            <Text>Expires: {permissions.expires}</Text>
                            {permissions.canAskAgain !== undefined && (
                                <Text>
                                    Can Ask Again:{' '}
                                    {permissions.canAskAgain ? 'Yes' : 'No'}
                                </Text>
                            )}
                            {!permissions.granted && (
                                <Text style={styles.helpText}>
                                    To enable microphone access, please go to Settings and grant permission for this app.
                                </Text>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        mode="contained"
                        onPress={checkPermissions}
                        style={styles.button}
                    >
                        Check Permissions
                    </Button>
                    {(!permissions?.granted && permissions?.canAskAgain) && (
                        <Button
                            mode="contained"
                            onPress={requestPermissions}
                            style={styles.button}
                        >
                            Request Permissions
                        </Button>
                    )}
                    {(!permissions?.granted && !permissions?.canAskAgain) && (
                        <Button
                            mode="contained"
                            onPress={() => Linking.openSettings()}
                            style={styles.button}
                        >
                            Open Settings
                        </Button>
                    )}
                </View>
            </View>
        </ScreenWrapper>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 24,
    },
    statusContainer: {
        gap: 8,
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        alignSelf: 'flex-start',
    },
    helpText: {
        marginTop: 8,
        color: 'red',
        fontSize: 14,
    },
})

export default PermissionsPage
