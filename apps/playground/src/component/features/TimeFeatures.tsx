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

interface TimeFeaturesProps {
    energy?: number
    rms?: number
    zcr?: number
    tempo?: number
}

export function TimeFeatures({ energy, rms, zcr, tempo }: TimeFeaturesProps) {
    const theme = useTheme()
    const styles = getStyles()

    // If no time features are available, don't render the component
    if (!energy && !rms && !zcr && !tempo) {
        return null
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={styles.label}>Time Domain Features</Text>
            
            {energy !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Energy:</Text>
                    <Text style={styles.value}>{energy.toFixed(2)}</Text>
                </View>
            )}

            {rms !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>RMS:</Text>
                    <Text style={styles.value}>{rms.toFixed(2)}</Text>
                </View>
            )}

            {zcr !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Zero Crossing Rate:</Text>
                    <Text style={styles.value}>{zcr.toFixed(2)}</Text>
                </View>
            )}

            {tempo !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Tempo (BPM):</Text>
                    <Text style={styles.value}>{Math.round(tempo)}</Text>
                </View>
            )}
        </View>
    )
} 