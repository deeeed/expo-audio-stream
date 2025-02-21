import { AppTheme, LabelSwitch, useTheme, Button } from '@siteed/design-system'
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
        buttonContainer: {
            flexDirection: 'row',
            gap: theme.padding.s,
            marginBottom: theme.padding.m,
        },
    })

interface FeatureSelectionProps {
    features: AudioFeaturesOptions
    onChange: (features: AudioFeaturesOptions) => void
}

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

export function FeatureSelection({ features, onChange }: FeatureSelectionProps) {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    const handleFeatureChange = useCallback(
        (feature: keyof AudioFeaturesOptions, value: boolean) => {
            onChange({ ...features, [feature]: value })
        },
        [onChange, features]
    )

    const handleSelectAll = useCallback(() => {
        const allSelected = featuresList.reduce(
            (acc, { key }) => ({ ...acc, [key]: true }),
            {} as AudioFeaturesOptions
        )
        onChange(allSelected)
    }, [onChange])

    const handleUnselectAll = useCallback(() => {
        const allUnselected = featuresList.reduce(
            (acc, { key }) => ({ ...acc, [key]: false }),
            {} as AudioFeaturesOptions
        )
        onChange(allUnselected)
    }, [onChange])



    return (
        <View style={styles.container}>
            <View style={styles.buttonContainer}>
                <Button 
                    mode="contained-tonal" 
                    onPress={handleSelectAll}
                >
                    Select All
                </Button>
                <Button 
                    mode="contained-tonal" 
                    onPress={handleUnselectAll}
                >
                    Unselect All
                </Button>
            </View>
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