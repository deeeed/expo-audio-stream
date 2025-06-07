import React from 'react'

import { StyleSheet, View } from 'react-native'
import { SegmentedButtons } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useTheme, Text } from '@siteed/design-system'
import type { RecordingConfig } from '@siteed/expo-audio-studio'

interface AndroidSettingsConfigFormProps {
    config: NonNullable<RecordingConfig['android']>
    onConfigChange: (config: RecordingConfig['android']) => void
}

export const AndroidSettingsConfigForm = ({
    config,
    onConfigChange,
}: AndroidSettingsConfigFormProps) => {
    const theme = useTheme()
    const styles = getStyles(theme)

    const audioFocusOptions = [
        { value: undefined, label: 'Default' },
        { value: 'background', label: 'Background' },
        { value: 'interactive', label: 'Interactive' },
        { value: 'communication', label: 'Communication' },
        { value: 'none', label: 'None' },
    ]

    const handleAudioFocusStrategyChange = (value: string) => {
        const strategy = value === 'undefined' ? undefined : value as 'background' | 'interactive' | 'communication' | 'none'
        onConfigChange({
            ...config,
            audioFocusStrategy: strategy,
        })
    }

    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Audio Focus Strategy
                </Text>
                <Text variant="bodyMedium" style={styles.description}>
                    Controls how the app handles audio focus when switching between apps:
                </Text>
                
                <View style={styles.optionDescriptions}>
                    <Text style={styles.optionDescription}>
                        • <Text style={styles.optionLabel}>Default:</Text> Smart defaults based on keepAwake setting
                    </Text>
                    <Text style={styles.optionDescription}>
                        • <Text style={styles.optionLabel}>Background:</Text> Continue recording when app loses focus (voice recorders)
                    </Text>
                    <Text style={styles.optionDescription}>
                        • <Text style={styles.optionLabel}>Interactive:</Text> Pause when losing focus, resume when gaining (music apps)
                    </Text>
                    <Text style={styles.optionDescription}>
                        • <Text style={styles.optionLabel}>Communication:</Text> Maintain priority for real-time communication (calls)
                    </Text>
                    <Text style={styles.optionDescription}>
                        • <Text style={styles.optionLabel}>None:</Text> No automatic audio focus management (custom handling)
                    </Text>
                </View>

                <SegmentedButtons
                    value={config?.audioFocusStrategy || 'undefined'}
                    onValueChange={handleAudioFocusStrategyChange}
                    buttons={audioFocusOptions.map(option => ({
                        value: option.value || 'undefined',
                        label: option.label,
                    }))}
                    style={styles.segmentedButtons}
                />
            </View>
        </View>
    )
}

const getStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        gap: 24,
        padding: 16,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        color: theme.colors.onSurface,
        fontWeight: 'bold',
    },
    description: {
        color: theme.colors.onSurfaceVariant,
        lineHeight: 20,
    },
    optionDescriptions: {
        gap: 4,
        marginTop: 8,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.primaryContainer,
    },
    optionDescription: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 13,
        lineHeight: 18,
    },
    optionLabel: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    segmentedButtons: {
        marginTop: 8,
    },
})