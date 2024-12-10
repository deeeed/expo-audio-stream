// playground/src/app/(tabs)/play.tsx
import { ScreenWrapper } from '@siteed/design-system'
import { ExpoAudioStreamModule } from '@siteed/expo-audio-stream'
import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
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
                    <Button
                        mode="contained"
                        onPress={requestPermissions}
                        style={styles.button}
                        disabled={permissions?.granted}
                    >
                        Request Permissions
                    </Button>
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
})

export default PermissionsPage
