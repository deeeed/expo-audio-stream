import { AppTheme, useTheme } from '@siteed/design-system'
import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ProgressBar } from 'react-native-paper'

import { ProgressItem } from '../hooks/useTranscriber'

const getStyles = (_: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            padding: 16,
        },
        itemContainer: {
            marginBottom: 16,
        },
        itemName: {
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 4,
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
                    <Text style={styles.itemName}>{item.name}</Text>
                    <ProgressBar
                        progress={item.progress}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                    />
                    {/* <Text style={styles.itemStatus}>{item.status}</Text> */}
                </View>
            ))}
        </View>
    )
}
