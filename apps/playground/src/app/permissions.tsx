// playground/src/app/(tabs)/play.tsx
import { ScreenWrapper, useTheme, AppTheme } from '@siteed/design-system'
import { ExpoAudioStreamModule } from '@siteed/expo-audio-studio'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { baseLogger } from '../config'

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
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 16,
        },
        button: {
            flex: 1,
            minWidth: 150,
        },
        iconButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        statusItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        statusLabel: {
            fontWeight: 'bold',
            color: theme.colors.secondary,
            width: 100,
        },
        statusValue: {
            color: theme.colors.text,
            flex: 1,
        },
        helpText: {
            marginTop: 12,
            color: theme.colors.error,
            fontSize: 14,
            backgroundColor: theme.colors.errorContainer,
            padding: 12,
            borderRadius: 8,
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
                        <View style={styles.iconButton}>
                            <MaterialCommunityIcons
                                name="refresh"
                                size={20}
                                color={theme.colors.onPrimary}
                            />
                            <Text>Check Permissions</Text>
                        </View>
                    </Button>
                    
                    {(!permissions?.granted && permissions?.canAskAgain) && (
                        <Button
                            mode="contained-tonal"
                            onPress={requestPermissions}
                            style={styles.button}
                        >
                            <View style={styles.iconButton}>
                                <MaterialCommunityIcons
                                    name="microphone"
                                    size={20}
                                    color={theme.colors.onSecondaryContainer}
                                />
                                <Text>Request Permissions</Text>
                            </View>
                        </Button>
                    )}
                    
                    {(!permissions?.granted && !permissions?.canAskAgain) && (
                        <Button
                            mode="outlined"
                            onPress={() => Linking.openSettings()}
                            style={styles.button}
                        >
                            <View style={styles.iconButton}>
                                <MaterialCommunityIcons
                                    name="cog"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                                <Text>Open Settings</Text>
                            </View>
                        </Button>
                    )}
                </View>
            </View>
        </ScreenWrapper>
    )
}

export default PermissionsPage
