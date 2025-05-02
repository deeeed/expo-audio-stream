import React, { useMemo } from 'react'

import { Platform, StyleSheet, View } from 'react-native'
import { SegmentedButtons, Text } from 'react-native-paper'

import type {
    AppTheme } from '@siteed/design-system'
import {
    ColorPicker,
    LabelSwitch,
    NumberAdjuster,
    TextInput,
    useTheme,
} from '@siteed/design-system'
import type { NotificationConfig, WaveformConfig } from '@siteed/expo-audio-studio'

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap,
        },
        sectionHeader: {
            marginTop: 8,
        },
        sectionHeaderText: {
            fontSize: 18,
            fontWeight: 'bold',
        },
        waveformContainer: {
            gap: 16,
            marginLeft: 16,
        },
    })
}

interface NotificationConfigFormProps {
    config: NotificationConfig
    onConfigChange: (config: NotificationConfig) => void
}

export const NotificationConfigForm = ({
    config,
    onConfigChange,
}: NotificationConfigFormProps) => {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleChange = (key: keyof NotificationConfig, value: string | number | boolean | undefined) => {
        onConfigChange({ ...config, [key]: value })
    }

    const handleAndroidChange = (
        key: keyof NonNullable<NotificationConfig['android']>,
        value: string | number | boolean | undefined | WaveformConfig
    ) => {
        onConfigChange({
            ...config,
            android: {
                ...config.android,
                [key]: value,
            },
        })
    }

    const handleWaveformChange = (
        key: keyof WaveformConfig,
        value: string | number | boolean
    ) => {
        onConfigChange({
            ...config,
            android: {
                ...config.android,
                waveform: {
                    ...config.android?.waveform,
                    [key]: value,
                },
            },
        })
    }

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>
                    Notifications
                </Text>
            </View>
            <TextInput
                label="Title"
                value={config.title}
                onChangeText={(value) => handleChange('title', value)}
            />
            <TextInput
                label="Text"
                value={config.text}
                onChangeText={(value) => handleChange('text', value)}
            />
            <TextInput
                label="Icon"
                value={config.icon}
                onChangeText={(value) => handleChange('icon', value)}
            />

            {Platform.OS === 'android' && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>
                            Android Configuration
                        </Text>
                    </View>
                    <TextInput
                        label="Channel ID"
                        value={config.android?.channelId}
                        onChangeText={(value) =>
                            handleAndroidChange('channelId', value)
                        }
                    />
                    <TextInput
                        label="Channel Name"
                        value={config.android?.channelName}
                        onChangeText={(value) =>
                            handleAndroidChange('channelName', value)
                        }
                    />
                    <TextInput
                        label="Channel Description"
                        value={config.android?.channelDescription}
                        onChangeText={(value) =>
                            handleAndroidChange('channelDescription', value)
                        }
                    />
                    <ColorPicker
                        label="Light Color"
                        color={config.android?.lightColor ?? '#FF0000'}
                        colorOptions={[
                            '#FF0000',
                            '#00FF00',
                            '#0000FF',
                            '#FFFF00',
                            '#FF00FF',
                            '#00FFFF',
                        ]}
                        onChange={(value) =>
                            handleAndroidChange('lightColor', value)
                        }
                    />
                    <SegmentedButtons
                        value={config.android?.priority ?? 'default'}
                        onValueChange={(value) =>
                            handleAndroidChange('priority', value)
                        }
                        buttons={[
                            { value: 'min', label: 'Min' },
                            { value: 'low', label: 'Low' },
                            { value: 'default', label: 'Default' },
                            { value: 'high', label: 'High' },
                            { value: 'max', label: 'Max' },
                        ]}
                    />
                    <ColorPicker
                        label="Accent Color"
                        color={config.android?.accentColor ?? '#000000'}
                        colorOptions={[
                            '#000000',
                            '#FFFFFF',
                            '#FF0000',
                            '#00FF00',
                            '#0000FF',
                        ]}
                        onChange={(value) =>
                            handleAndroidChange('accentColor', value)
                        }
                    />
                    <NumberAdjuster
                        label="Notification ID"
                        value={config.android?.notificationId ?? 1}
                        onChange={(value) =>
                            handleAndroidChange('notificationId', value)
                        }
                        min={1}
                    />

                    <LabelSwitch
                        label="Show Waveform"
                        value={!!config.android?.waveform}
                        onValueChange={(value) =>
                            handleAndroidChange(
                                'waveform',
                                value ? {} : undefined
                            )
                        }
                    />

                    {config.android?.waveform && (
                        <View style={styles.waveformContainer}>
                            <ColorPicker
                                label="Waveform Color"
                                color={
                                    config.android.waveform.color ?? '#FFFFFF'
                                }
                                colorOptions={[
                                    '#FFFFFF',
                                    '#000000',
                                    '#FF0000',
                                    '#00FF00',
                                    '#0000FF',
                                ]}
                                onChange={(value) =>
                                    handleWaveformChange('color', value)
                                }
                            />
                            <NumberAdjuster
                                label="Opacity"
                                value={config.android.waveform.opacity ?? 1}
                                onChange={(value) =>
                                    handleWaveformChange('opacity', value)
                                }
                                step={0.1}
                                min={0}
                                max={1}
                            />
                            <NumberAdjuster
                                label="Stroke Width"
                                value={
                                    config.android.waveform.strokeWidth ?? 1.5
                                }
                                onChange={(value) =>
                                    handleWaveformChange('strokeWidth', value)
                                }
                                step={0.5}
                                min={0.5}
                            />
                            <SegmentedButtons
                                value={
                                    config.android.waveform.style ?? 'stroke'
                                }
                                onValueChange={(value) =>
                                    handleWaveformChange('style', value)
                                }
                                buttons={[
                                    { value: 'stroke', label: 'Stroke' },
                                    { value: 'fill', label: 'Fill' },
                                ]}
                            />
                            <LabelSwitch
                                label="Mirror"
                                value={config.android.waveform.mirror ?? true}
                                onValueChange={(value) =>
                                    handleWaveformChange('mirror', value)
                                }
                            />
                            <NumberAdjuster
                                label="Height"
                                value={config.android.waveform.height ?? 64}
                                onChange={(value) =>
                                    handleWaveformChange('height', value)
                                }
                                step={1}
                                min={32}
                                max={128}
                            />
                        </View>
                    )}
                </>
            )}

            {Platform.OS === 'ios' && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>
                            iOS Configuration
                        </Text>
                    </View>
                    <TextInput
                        label="Category Identifier"
                        value={config.ios?.categoryIdentifier}
                        onChangeText={(value) =>
                            onConfigChange({
                                ...config,
                                ios: {
                                    ...config.ios,
                                    categoryIdentifier: value,
                                },
                            })
                        }
                    />
                </>
            )}
        </View>
    )
}
