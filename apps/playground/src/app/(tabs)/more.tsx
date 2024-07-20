import {
    AppTheme,
    LabelSwitch,
    ListItem,
    ScreenWrapper,
    useThemePreferences,
} from '@siteed/design-system'
import { useLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {},
        iconContainer: {
            alignItems: 'center',
        },
        link: {
            padding: 10,
        },
        text: {
            color: theme.colors.text,
        },
        version: {
            fontSize: 12,
            paddingTop: 5,
            color: 'lightgrey',
        },
    })
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require('@assets/icon.png')
export interface MoreScreenProps {}
export const MoreScreen = (_: MoreScreenProps) => {
    const router = useRouter()
    const { toggleDarkMode, darkMode, theme } = useThemePreferences()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const { logger } = useLogger('more-screen')
    const appVersion = Constants.expoConfig?.version

    useEffect(() => {
        logger.info('More screen loaded')
    }, [logger])

    return (
        <ScreenWrapper withScrollView useInsets>
            <View style={styles.iconContainer}>
                <Image
                    source={logoSource}
                    style={{ width: 100, height: 100 }}
                />
                <Text>Audio PlayGround</Text>
                <Text style={styles.version}>v{appVersion}</Text>
            </View>
            <LabelSwitch
                label="Dark Mode"
                onValueChange={toggleDarkMode}
                value={darkMode}
            />
            <ListItem
                label="Logs"
                subLabel="Debug console logs"
                onPress={() => {
                    router.navigate('/logs')
                }}
            />
            <ListItem
                label="Infinite Canvas"
                subLabel="Minimal implementation for infinite canvas"
                onPress={() => {
                    router.navigate('/minimal')
                }}
            />
        </ScreenWrapper>
    )
}

export default MoreScreen
