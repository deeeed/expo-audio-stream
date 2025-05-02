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
    arrayContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    arrayValue: {
        padding: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    emptyText: {
        fontStyle: 'italic',
        opacity: 0.5,
    },
})

interface TonalFeaturesProps {
    chromagram?: number[]
    pitch?: number
    tonnetz?: number[]
}

export function TonalFeatures({ chromagram, pitch, tonnetz }: TonalFeaturesProps) {
    const theme = useTheme()
    const styles = getStyles()

    // If no tonal features are available or all arrays are empty, don't render
    if (!pitch && (!chromagram?.length) && (!tonnetz?.length)) {
        return null
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={styles.label}>Tonal Features</Text>
            
            {pitch !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Pitch:</Text>
                    <Text style={styles.value}>{pitch.toFixed(2)} Hz</Text>
                </View>
            )}

            {chromagram && (
                <View>
                    <Text style={styles.label}>Chromagram:</Text>
                    <View style={styles.arrayContainer}>
                        {chromagram.length > 0 ? (
                            chromagram.map((value, index) => (
                                <View key={index} style={styles.arrayValue}>
                                    <Text style={styles.value}>{value.toFixed(2)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No chromagram data</Text>
                        )}
                    </View>
                </View>
            )}

            {tonnetz && (
                <View>
                    <Text style={styles.label}>Tonnetz:</Text>
                    <View style={styles.arrayContainer}>
                        {tonnetz.length > 0 ? (
                            tonnetz.map((value, index) => (
                                <View key={index} style={styles.arrayValue}>
                                    <Text style={styles.value}>{value.toFixed(2)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No tonnetz data</Text>
                        )}
                    </View>
                </View>
            )}
        </View>
    )
} 