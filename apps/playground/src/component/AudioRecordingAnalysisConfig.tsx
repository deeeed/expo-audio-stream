import { AppTheme, LabelSwitch, useTheme } from '@siteed/design-system'
import {
    AudioFeaturesOptions,
    RecordingConfig,
} from '@siteed/expo-audio-stream'
import React, { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

const getStyles = ({theme}: {theme: AppTheme}) => {
    return StyleSheet.create({
        container: {
            padding: theme.padding.s,
        },
        actionContainer: {
            flexDirection: 'row',
            marginTop: 20,
            gap: 20,
        },
        actionButton: {
            flex: 1,
        },
        labelContainerStyle: {
            margin: 0,
        },
        segmentedButton: {
            padding: 0,
            margin: 0,
        },
        topActionsContainer: {
            gap: 10,
            marginBottom: 20,
        },
    })
}

export interface SelectedAnalysisConfig {
    segmentDurationMs: number
    features: AudioFeaturesOptions
}

export interface AudioRecordingAnalysisConfigProps {
    config: SelectedAnalysisConfig
    onChange?: (config: SelectedAnalysisConfig) => void
}

export const AudioRecordingAnalysisConfig = ({
    config,
    onChange,
}: AudioRecordingAnalysisConfigProps) => {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({theme}), [theme])

    const handleChange = useCallback(
        (
            key: keyof SelectedAnalysisConfig,
            value: number | boolean | string
        ) => {
            onChange?.({ ...config, [key]: value })
        },
        [onChange, config]
    )

    const handleFeatureChange = useCallback(
        (feature: keyof AudioFeaturesOptions, value: boolean) => {
            onChange?.({ ...config, features: { ...config.features, [feature]: value } })
        },
        [onChange, config]
    )

    return (
        <View style={styles.container}>
            <LabelSwitch
                label="mfcc"
                onValueChange={(value) => {
                    handleFeatureChange('mfcc', value)
                }}
                value={config.features.mfcc ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Energy"
                onValueChange={(value) => {
                    handleFeatureChange('energy', value)
                }}
                value={config.features.energy ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Zero Crossing Rate"
                onValueChange={(value) => {
                    handleFeatureChange('zcr', value)
                }}
                value={config.features.zcr ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Spectral Centroid"
                onValueChange={(value) => {
                    handleFeatureChange('spectralCentroid', value)
                }}
                value={config.features.spectralCentroid ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Spectral Flatness"
                onValueChange={(value) => {
                    handleFeatureChange('spectralFlatness', value)
                }}
                value={config.features.spectralFlatness ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="spectral Rolloff"
                onValueChange={(value) => {
                    handleFeatureChange('spectralRolloff', value)
                }}
                value={config.features.spectralRolloff ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="spectral Bandwidth"
                onValueChange={(value) => {
                    handleFeatureChange('spectralBandwidth', value)
                }}
                value={config.features.spectralBandwidth ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="chromagram"
                onValueChange={(value) => {
                    handleFeatureChange('chromagram', value)
                }}
                value={config.features.chromagram ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="tempo"
                onValueChange={(value) => {
                    handleFeatureChange('tempo', value)
                }}
                value={config.features.tempo ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="hnr"
                onValueChange={(value) => {
                    handleFeatureChange('hnr', value)
                }}
                value={config.features.hnr ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Mel Spectrogram"
                onValueChange={(value) => {
                    handleFeatureChange('melSpectrogram', value)
                }}
                value={config.features.melSpectrogram ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Spectral Contrast"
                onValueChange={(value) => {
                    handleFeatureChange('spectralContrast', value)
                }}
                value={config.features.spectralContrast ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Tonnetz"
                onValueChange={(value) => {
                    handleFeatureChange('tonnetz', value)
                }}
                value={config.features.tonnetz ?? false}
                containerStyle={styles.labelContainerStyle}
            />
            <LabelSwitch
                label="Pitch"
                onValueChange={(value) => {
                    handleFeatureChange('pitch', value)
                }}
                value={config.features.pitch ?? false}
                containerStyle={styles.labelContainerStyle}
            />
        </View>
    )
}
