import React, { useMemo } from 'react'

import { StyleSheet, Text, View } from 'react-native'
import { ProgressBar } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useTheme } from '@siteed/design-system'

import type { ProgressItem } from '../context/TranscriptionProvider.types'

const getStyles = (_: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            padding: 16,
            gap: 5,
        },
        itemContainer: {
            marginBottom: 16,
        },
        itemName: {
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 4,
        },
        labelContainer: {
            gap: 5,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
        },
        progressBar: {
            height: 8,
            borderRadius: 4,
        },
        itemStatus: {
            fontSize: 12,
            color: 'gray',
            marginTop: 4,
        },
    })
}

export interface ProgressItemsProps {
    items: ProgressItem[]
}
export const ProgressItems = ({ items }: ProgressItemsProps) => {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])

    return (
        <View style={styles.container}>
            {items.map((item, index) => (
                <View key={index} style={styles.itemContainer}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text>( {item.file} )</Text>
                    </View>
                    <ProgressBar
                        progress={item.progress / 100}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                    />
                    {/* <Text style={styles.itemStatus}>{item.status}</Text> */}
                </View>
            ))}
        </View>
    )
}
