import {
    AppTheme,
    LabelSwitch,
    ListItem,
    ScreenWrapper,
    useThemePreferences,
} from '@siteed/design-system'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import { Image, Platform, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useReanimatedWebHack } from '../../hooks/useReanimatedWebHack'

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
    const appVersion = Constants.expoConfig?.version
    const { isHackEnabled, handleHackToggle } = useReanimatedWebHack()

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
                containerStyle={{
                    backgroundColor: theme.colors.surface,
                }}
                onValueChange={toggleDarkMode}
                value={darkMode}
            />
            {Platform.OS === 'web' && (
                <LabelSwitch
                    label="Reanimated Web Hack"
                    containerStyle={{
                        backgroundColor: theme.colors.surface,
                    }}
                    onValueChange={handleHackToggle}
                    value={isHackEnabled}
                />
            )}
            <ListItem
                contentContainerStyle={{
                    backgroundColor: theme.colors.surface,
                }}
                label="Logs"
                subLabel="Debug console logs"
                onPress={() => {
                    router.navigate('/logs')
                }}
            />
            <ListItem
                contentContainerStyle={{
                    backgroundColor: theme.colors.surface,
                }}
                label="Transcriber Config"
                subLabel="Configure model and AI parameters for transcription"
                onPress={() => {
                    router.navigate('/transcription-config')
                }}
            />
            <ListItem
                contentContainerStyle={{
                    backgroundColor: theme.colors.surface,
                }}
                label="Permissions"
                subLabel="Check and request permissions"
                onPress={() => {
                    router.navigate('/permissions')
                }}
            />
            <ListItem
                contentContainerStyle={{
                    backgroundColor: theme.colors.surface,
                }}
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
