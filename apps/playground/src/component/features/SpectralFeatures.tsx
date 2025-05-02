import React from 'react'

import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useTheme } from '@siteed/design-system'

const getStyles = () => StyleSheet.create({
    container: {
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        opacity: 0.7,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
    },
})

interface SpectralFeaturesProps {
    spectralCentroid?: number
    spectralFlatness?: number
    spectralRolloff?: number
    spectralBandwidth?: number
    hnr?: number
}

export function SpectralFeatures({ 
    spectralCentroid,
    spectralFlatness,
    spectralRolloff,
    spectralBandwidth,
    hnr,
}: SpectralFeaturesProps) {
    const theme = useTheme()
    const styles = getStyles()

    // If no spectral features are available, don't render the component
    if (!spectralCentroid && !spectralFlatness && !spectralRolloff && 
        !spectralBandwidth && !hnr) {
        return null
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={styles.label}>Spectral Features</Text>
            
            {spectralCentroid !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Centroid:</Text>
                    <Text style={styles.value}>{spectralCentroid.toFixed(2)} Hz</Text>
                </View>
            )}

            {spectralFlatness !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Flatness:</Text>
                    <Text style={styles.value}>{spectralFlatness.toFixed(2)}</Text>
                </View>
            )}

            {spectralRolloff !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Rolloff:</Text>
                    <Text style={styles.value}>{spectralRolloff.toFixed(2)} Hz</Text>
                </View>
            )}

            {spectralBandwidth !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Bandwidth:</Text>
                    <Text style={styles.value}>{spectralBandwidth.toFixed(2)} Hz</Text>
                </View>
            )}

            {hnr !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>HNR:</Text>
                    <Text style={styles.value}>{hnr.toFixed(2)} dB</Text>
                </View>
            )}
        </View>
    )
} 