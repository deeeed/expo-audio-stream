import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const getStyles = () => {
    return StyleSheet.create({
        container: {},
    })
}

export interface TestProps {
    label: string
}
export const Test = ({ label }: TestProps) => {
    const styles = useMemo(() => getStyles(), [])

    return (
        <View style={styles.container}>
            <Text>{label}</Text>
        </View>
    )
}
