import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@siteed/design-system'

export const HEADER_HEIGHT = 56

interface CustomHeaderProps {
    title: string
    headerRight?: React.ReactNode
}

export function CustomHeader({ title, headerRight }: CustomHeaderProps) {
    const insets = useSafeAreaInsets()
    const { colors } = useTheme()

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    backgroundColor: colors.background,
                    borderBottomColor: colors.border,
                },
                Platform.OS === 'android' ? styles.elevationAndroid : styles.shadowIOS,
            ]}
        >
            <View style={styles.row}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {headerRight && <View style={styles.right}>{headerRight}</View>}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    row: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    right: {
        position: 'absolute',
        right: 16,
    },
    elevationAndroid: {
        elevation: 4,
    },
    shadowIOS: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
})
