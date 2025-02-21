import { useTheme } from '@siteed/design-system'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

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
        fontFamily: 'monospace',
        fontWeight: '500',
    },
    checksumValue: {
        fontSize: 12,
        fontFamily: 'monospace',
    }
})

interface DebugFeaturesProps {
    minAmplitude?: number
    maxAmplitude?: number
    dataChecksum?: number
}

function formatAmplitude(value: number | undefined): string {
    if (value === undefined) return 'N/A'
    if (!Number.isFinite(value)) return '0.000'
    return value.toFixed(3)
}

export function DebugFeatures({ minAmplitude, maxAmplitude, dataChecksum }: DebugFeaturesProps) {
    const theme = useTheme()
    const styles = getStyles()

    if (!minAmplitude && !maxAmplitude && !dataChecksum) {
        return null
    }

    const formattedMin = formatAmplitude(minAmplitude)
    const formattedMax = formatAmplitude(maxAmplitude)

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={styles.label}>Debug Information</Text>
            
            {(minAmplitude !== undefined && maxAmplitude !== undefined) && (
                <View style={styles.row}>
                    <Text style={styles.label}>Amplitude Range:</Text>
                    <Text style={styles.value}>
                        [{formattedMin}, {formattedMax}]
                    </Text>
                </View>
            )}

            {dataChecksum !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Data Checksum:</Text>
                    <Text style={styles.checksumValue}>
                        {`0x${dataChecksum.toString(16).padStart(8, '0')}`}
                    </Text>
                </View>
            )}
        </View>
    )
} 