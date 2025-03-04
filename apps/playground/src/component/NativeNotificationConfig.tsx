import {
    AppTheme,
    EditableInfoCard,
    LabelSwitch,
    useModal,
    useTheme,
} from '@siteed/design-system'
import { NotificationConfig } from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'
import React, { useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'

import { NotificationConfigForm } from './NotificationConfigForm'
import { Text } from 'react-native-paper'

const logger = getLogger('NativeNotificationConfig')

interface NativeNotificationConfigProps {
    enabled: boolean
    onEnabledChange: (enabled: boolean) => void
    config: NotificationConfig
    onConfigChange: (config: NotificationConfig) => void
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            gap: 16,
        },
        configItem: {
            marginBottom: 4,
        },
        configLabel: {
            fontWeight: 'bold',
            color: theme.colors.primary,
        },
        configValue: {
            color: theme.colors.onSurface,
        },
        configSection: {
            marginTop: 8,
            paddingLeft: 8,
            borderLeftWidth: 2,
            borderLeftColor: theme.colors.primaryContainer,
        }
    })
}

export const NativeNotificationConfig = ({
    enabled,
    onEnabledChange,
    config,
    onConfigChange,
}: NativeNotificationConfigProps) => {
    const { openDrawer } = useModal()
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleEditConfig = async () => {
        try {
            const newConfig = await openDrawer({
                initialData: config,
                containerType: 'scrollview',
                title: 'Native Notifications',
                footerType: 'confirm_cancel',
                render: ({ state, onChange }) => (
                    <NotificationConfigForm
                        config={state.data}
                        onConfigChange={(newConfig) => {
                            onChange(newConfig)
                        }}
                    />
                ),
            })

            if (!newConfig) {
                // canceled
                return
            }

            logger.debug(`new config `, newConfig)
            onConfigChange(newConfig)
        } catch (error) {
            logger.error(`Failed to change config`, error)
        }
    }

    // Only show on native platforms
    if (Platform.OS === 'web') {
        return null
    }

    const renderConfigValue = () => {
        return (
            <View>
                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Title:</Text>
                    <Text style={styles.configValue}>{config.title || 'Not set'}</Text>
                </View>
                
                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Text:</Text>
                    <Text style={styles.configValue}>{config.text || 'Not set'}</Text>
                </View>
                
                {Platform.OS === 'android' && config.android && (
                    <View style={styles.configSection}>
                        <Text style={styles.configLabel}>Android Settings:</Text>
                        <View style={styles.configItem}>
                            <Text style={styles.configValue}>
                                Channel: {config.android.channelName || 'Default'}
                            </Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.configValue}>
                                Priority: {config.android.priority || 'Default'}
                            </Text>
                        </View>
                        <View style={styles.configItem}>
                            <Text style={styles.configValue}>
                                Waveform: {config.android.waveform ? 'Enabled' : 'Disabled'}
                            </Text>
                        </View>
                    </View>
                )}
                
                {Platform.OS === 'ios' && config.ios && (
                    <View style={styles.configSection}>
                        <Text style={styles.configLabel}>iOS Settings:</Text>
                        <View style={styles.configItem}>
                            <Text style={styles.configValue}>
                                Category: {config.ios.categoryIdentifier || 'None'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <LabelSwitch
                label="Show Notification"
                value={enabled}
                onValueChange={onEnabledChange}
            />

            {enabled && (
                <EditableInfoCard
                    label="Notification Config"
                    containerStyle={{
                        margin: 0,
                        backgroundColor: theme.colors.surface,
                    }}
                    renderValue={renderConfigValue}
                    editable
                    onEdit={handleEditConfig}
                />
            )}
        </View>
    )
}
