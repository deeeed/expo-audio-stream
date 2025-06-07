import React, { useState, useMemo } from 'react'

import { Platform, StyleSheet, View, Text } from 'react-native'

import type { AppTheme } from '@siteed/design-system'
import { EditableInfoCard, useModal, useTheme } from '@siteed/design-system'
import type { RecordingConfig } from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'

import { AndroidSettingsConfigForm } from './AndroidSettingsConfigForm'

const logger = getLogger('AndroidSettingsConfig')

interface AndroidSettingsConfigProps {
    config?: RecordingConfig['android']
    onConfigChange: (config: RecordingConfig['android']) => void
}

export const AndroidSettingsConfig = ({
    config,
    onConfigChange,
}: AndroidSettingsConfigProps) => {
    const { openDrawer } = useModal()
    const [localConfig, setLocalConfig] = useState(config)
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleEditConfig = async () => {
        try {
            const result = await openDrawer({
                initialData: localConfig ?? { audioFocusStrategy: undefined },
                containerType: 'scrollview',
                title: 'Android Audio Settings',
                footerType: 'confirm_cancel',
                render: ({ state, onChange }) => (
                    <AndroidSettingsConfigForm
                        config={state.data || {}}
                        onConfigChange={(newConfig) => {
                            onChange(newConfig || {})
                            setLocalConfig(newConfig)
                        }}
                    />
                ),
            })

            if (result) {
                logger.debug(`New Android config`, result)
                onConfigChange(result)
            }
        } catch (error) {
            logger.error(`Failed to change Android config`, error)
        }
    }

    // Only show on Android
    if (Platform.OS !== 'android') {
        return null
    }

    const renderConfigValue = () => {
        if (!localConfig?.audioFocusStrategy) {
            return <Text style={styles.configValue}>Default behavior</Text>
        }

        const strategyLabels = {
            'background': 'Background Recording',
            'interactive': 'Interactive Audio',
            'communication': 'Communication/Calls',
            'none': 'No Focus Management'
        }

        return (
            <View>
                <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Audio Focus Strategy:</Text>
                    <Text style={styles.configValue}>
                        {strategyLabels[localConfig.audioFocusStrategy as keyof typeof strategyLabels] || localConfig.audioFocusStrategy}
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <EditableInfoCard
                label="Android Audio Settings"
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
        },
    })
}