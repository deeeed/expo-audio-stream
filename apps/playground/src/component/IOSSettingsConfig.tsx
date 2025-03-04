import { AppTheme, EditableInfoCard, useModal, useTheme } from '@siteed/design-system'
import { RecordingConfig } from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'
import React, { useState, useMemo } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'

import { IOSSettingsConfigForm } from './IOSSettingsConfigForm'

const logger = getLogger('IOSSettingsConfig')

interface IOSSettingsConfigProps {
    config?: RecordingConfig['ios']
    onConfigChange: (config: RecordingConfig['ios']) => void
}

export const IOSSettingsConfig = ({
    config,
    onConfigChange,
}: IOSSettingsConfigProps) => {
    const { openDrawer } = useModal()
    const [localConfig, setLocalConfig] = useState(config)
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleEditConfig = async () => {
        try {
            const result = await openDrawer({
                initialData: localConfig ?? { audioSession: {} },
                containerType: 'scrollview',
                title: 'iOS Audio Settings',
                footerType: 'confirm_cancel',
                render: ({ state, onChange }) => (
                    <IOSSettingsConfigForm
                        config={state.data}
                        onConfigChange={(newConfig) => {
                            onChange(newConfig)
                            setLocalConfig(newConfig)
                        }}
                    />
                ),
            })

            if (result) {
                logger.debug(`New iOS config`, result)
                onConfigChange(result)
            }
        } catch (error) {
            logger.error(`Failed to change iOS config`, error)
        }
    }

    // Only show on iOS
    if (Platform.OS !== 'ios') {
        return null
    }

    const renderConfigValue = () => {
        if (!localConfig?.audioSession) {
            return <Text style={styles.configValue}>No configuration set</Text>
        }

        return (
            <View>
                {localConfig.audioSession.category && (
                    <View style={styles.configItem}>
                        <Text style={styles.configLabel}>Category:</Text>
                        <Text style={styles.configValue}>{localConfig.audioSession.category}</Text>
                    </View>
                )}
                
                {localConfig.audioSession.mode && (
                    <View style={styles.configItem}>
                        <Text style={styles.configLabel}>Mode:</Text>
                        <Text style={styles.configValue}>{localConfig.audioSession.mode}</Text>
                    </View>
                )}
                
                {localConfig.audioSession.categoryOptions && localConfig.audioSession.categoryOptions.length > 0 && (
                    <View style={styles.configSection}>
                        <Text style={styles.configLabel}>Category Options:</Text>
                        {localConfig.audioSession.categoryOptions.map((option, index) => (
                            <View key={index} style={styles.configItem}>
                                <Text style={styles.configValue}>{option}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <EditableInfoCard
                label="iOS Audio Settings"
                containerStyle={{ 
                    margin: 0,
                    backgroundColor: theme.colors.surface,
                }}
                renderValue={renderConfigValue}
                editable
                onEdit={handleEditConfig}
            />
        </View>
    )
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
