import React from 'react'

import { StyleSheet, View } from 'react-native'

import { useTheme, Text } from '@siteed/design-system'
import type { AppTheme } from '@siteed/design-system'

const getStyles = (theme: AppTheme) => StyleSheet.create({
    featureSection: {
        marginVertical: 8,
        padding: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    coefficientsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    coefficient: {
        marginRight: 8,
        marginBottom: 4,
    },
})

interface MFCCFeaturesProps {
    mfcc?: number[]
}

export function MFCCFeatures({ mfcc }: MFCCFeaturesProps) {
    const theme = useTheme()
    const styles = getStyles(theme)

    if (!mfcc || mfcc.length === 0) {
        return null
    }

    return (
        <View style={styles.featureSection}>
            <Text style={styles.sectionTitle}>MFCC Features</Text>
            <View style={styles.coefficientsContainer}>
                {mfcc.map((coef, index) => (
                    <Text key={index} style={styles.coefficient}>
                        {`${index}: ${coef.toFixed(2)}`}
                    </Text>
                ))}
            </View>
        </View>
    )
} 