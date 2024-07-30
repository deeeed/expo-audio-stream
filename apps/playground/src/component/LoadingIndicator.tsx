import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'

const getStyles = () => {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
        },
    })
}

export interface LoadingIndicatorProps {
    label: string
}
export const LoadingIndicator = ({ label }: LoadingIndicatorProps) => {
    const styles = useMemo(() => getStyles(), [])

    return (
        <View style={styles.container}>
            <ActivityIndicator />
            <Text>{label}</Text>
        </View>
    )
}
