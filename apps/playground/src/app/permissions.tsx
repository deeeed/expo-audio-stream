// playground/src/app/(tabs)/play.tsx
import React, { useCallback, useEffect, useState } from 'react'

import { Alert, Linking, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { ScreenWrapper, useTheme } from '@siteed/design-system'
import { ExpoAudioStreamModule } from '@siteed/expo-audio-studio'

import { baseLogger } from '../config'
import { useScreenHeader } from '../hooks/useScreenHeader'

interface PermissionStatus {
    status: string
    granted: boolean
    expires: string
    canAskAgain?: boolean
}

const logger = baseLogger.extend('PermissionsPage')

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            padding: 16,
            gap: 24,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        titleContainer: {
            flex: 1,
        },
        title: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.colors.onSurface,
        },
        subtitle: {
            fontSize: 14,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
        },
        statusContainer: {
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            padding: 16,
            gap: 8,
            elevation: 2,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        buttonContainer: {
            gap: 12,
            marginTop: 16,
        },
        button: {
            marginBottom: 8,
        },
        buttonContent: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 4,
        },
        buttonText: {
            fontSize: 16,
            fontWeight: '500',
        },
        statusItem: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            paddingVertical: 4,
        },
        statusLabel: {
            fontWeight: 'bold',
            color: theme.colors.secondary,
            minWidth: 80,
            flexShrink: 0,
        },
        statusValue: {
            color: theme.colors.onSurface,
            flex: 1,
            flexWrap: 'wrap',
        },
        helpText: {
            marginTop: 12,
            color: theme.colors.error,
            fontSize: 14,
            backgroundColor: theme.colors.errorContainer,
            padding: 12,
            borderRadius: 8,
            lineHeight: 20,
        },
        infoCard: {
            backgroundColor: theme.colors.tertiaryContainer,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
        },
        infoText: {
            color: theme.colors.onTertiaryContainer,
        },
    })
}

export const PermissionsPage = () => {
    const theme = useTheme()
    const styles = getStyles({ theme })
    
    useScreenHeader({
      title: 'Audio Permissions',
      backBehavior: { fallbackUrl: '/more' },
    })

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
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Audio Permissions</Text>
                        <Text style={styles.subtitle}>
                            Manage microphone access for recording
                        </Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        This app requires microphone access to record audio. Please ensure 
                        permissions are granted for full functionality.
                    </Text>
                </View>

                <View style={styles.statusContainer}>
                    <Text variant="titleMedium" style={{ marginBottom: 8 }}>Current Status</Text>
                    
                    {permissions && (
                        <>
                            <View style={styles.statusItem}>
                                <Text style={styles.statusLabel}>Status:</Text>
                                <Text style={styles.statusValue}>{permissions.status}</Text>
                            </View>
                            
                            <View style={styles.statusItem}>
                                <Text style={styles.statusLabel}>Granted:</Text>
                                <Text style={styles.statusValue}>
                                    {permissions.granted ? 'Yes' : 'No'}
                                </Text>
                            </View>
                            
                            <View style={styles.statusItem}>
                                <Text style={styles.statusLabel}>Expires:</Text>
                                <Text style={styles.statusValue}>{permissions.expires}</Text>
                            </View>
                            
                            {permissions.canAskAgain !== undefined && (
                                <View style={styles.statusItem}>
                                    <Text style={styles.statusLabel}>Can Ask Again:</Text>
                                    <Text style={styles.statusValue}>
                                        {permissions.canAskAgain ? 'Yes' : 'No'}
                                    </Text>
                                </View>
                            )}
                            
                            {!permissions.granted && (
                                <Text style={styles.helpText}>
                                    Microphone access required. Grant permission to use audio features.
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
                        contentStyle={styles.buttonContent}
                        icon="refresh"
                        labelStyle={styles.buttonText}
                    >
                        Check Permissions
                    </Button>
                    

                    
                    {!permissions?.granted && (
                        <Button
                            mode="contained-tonal"
                            onPress={requestPermissions}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            icon="microphone"
                            labelStyle={styles.buttonText}
                        >
                            Request Permissions
                        </Button>
                    )}
                    
                    {(!permissions?.granted && permissions?.canAskAgain === false) && (
                        <Button
                            mode="outlined"
                            onPress={() => Linking.openSettings()}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            icon="cog"
                            labelStyle={styles.buttonText}
                        >
                            Open Settings
                        </Button>
                    )}
                </View>
            </View>
        </ScreenWrapper>
    )
}

export default PermissionsPage
