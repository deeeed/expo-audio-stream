import { AppTheme, LabelSwitch, useTheme } from '@siteed/design-system'
import { AudioFeaturesOptions } from '@siteed/expo-audio-stream'
import React, { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

const getStyles = ({ theme }: { theme: AppTheme }) => 
    StyleSheet.create({
        container: {
            padding: theme.padding.s,
        },
        labelContainer: {
            margin: 0,
        },
    })

interface FeatureSelectionProps {
    features: AudioFeaturesOptions
    onChange: (features: AudioFeaturesOptions) => void
}

export function FeatureSelection({ features, onChange }: FeatureSelectionProps) {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleFeatureChange = useCallback(
        (feature: keyof AudioFeaturesOptions, value: boolean) => {
            onChange({ ...features, [feature]: value })
        },
        [onChange, features]
    )

    const featuresList: { key: keyof AudioFeaturesOptions; label: string }[] = [
        { key: 'mfcc', label: 'MFCC' },
        { key: 'energy', label: 'Energy' },
        { key: 'zcr', label: 'Zero Crossing Rate' },
        { key: 'spectralCentroid', label: 'Spectral Centroid' },
        { key: 'spectralFlatness', label: 'Spectral Flatness' },
        { key: 'spectralRolloff', label: 'Spectral Rolloff' },
        { key: 'spectralBandwidth', label: 'Spectral Bandwidth' },
        { key: 'chromagram', label: 'Chromagram' },
        { key: 'tempo', label: 'Tempo' },
        { key: 'hnr', label: 'HNR' },
        { key: 'melSpectrogram', label: 'Mel Spectrogram' },
        { key: 'spectralContrast', label: 'Spectral Contrast' },
        { key: 'tonnetz', label: 'Tonnetz' },
        { key: 'pitch', label: 'Pitch' },
    ]

    return (
        <View style={styles.container}>
            {featuresList.map(({ key, label }) => (
                <LabelSwitch
                    key={key}
                    label={label}
                    onValueChange={(value) => handleFeatureChange(key, value)}
                    value={features[key] ?? false}
                    containerStyle={styles.labelContainer}
                />
            ))}
        </View>
    )
} 