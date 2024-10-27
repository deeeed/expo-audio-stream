import { TextInput, LabelSwitch } from '@siteed/design-system'
import { NotificationConfig } from '@siteed/expo-audio-stream'
import React, { useCallback, useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'

const getStyles = () => {
    return StyleSheet.create({
        container: {
            gap: 10,
            padding: 20,
        },
        labelContainerStyle: {
            margin: 0,
        },
    })
}

export interface NotificationConfigFormProps {
    config: NotificationConfig
    onConfigChange: (config: NotificationConfig) => void
}

export const NotificationConfigForm = ({
    config,
    onConfigChange,
}: NotificationConfigFormProps) => {
    const styles = useMemo(() => getStyles(), [])

    const handleChange = useCallback(
        <K extends keyof NotificationConfig>(
            key: K,
            value: NotificationConfig[K]
        ) => {
            onConfigChange({
                ...config,
                [key]: value,
            })
        },
        [config, onConfigChange]
    )

    const handleAndroidChange = useCallback(
        (value: Partial<NotificationConfig['android']>) => {
            onConfigChange({
                ...config,
                android: {
                    ...(config.android || {}),
                    ...value,
                },
            })
        },
        [config, onConfigChange]
    )

    return (
        <View style={styles.container}>
            <TextInput
                label="Notification Title"
                value={config.title || ''}
                onChangeText={(value) => handleChange('title', value)}
                placeholder="Recording in progress..."
            />

            <TextInput
                label="Notification Text"
                value={config.text || ''}
                onChangeText={(value) => handleChange('text', value)}
                placeholder="Tap to view recording details"
            />

            <TextInput
                label="Icon Resource Name"
                value={config.icon || ''}
                onChangeText={(value) => handleChange('icon', value)}
                placeholder="ic_recording"
            />

            {Platform.OS === 'android' && (
                <>
                    <LabelSwitch
                        label="Show Waveform"
                        value={!!config.android?.waveform}
                        onValueChange={(value) =>
                            handleAndroidChange({
                                waveform: value
                                    ? {
                                          /* default waveform settings */
                                      }
                                    : undefined,
                            })
                        }
                    />
                </>
            )}
        </View>
    )
}
