import {
    AppTheme,
    LabelSwitch,
    ListItem,
    ScreenWrapper,
    useThemePreferences,
    useToast,
} from '@siteed/design-system'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Platform, StyleSheet, View } from 'react-native'
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
    const appVersion = Constants.expoConfig?.version
    const [isHackEnabled, setIsHackEnabled] = useState(true)
    const { show } = useToast()

    useEffect(() => {
        if (Platform.OS === 'web') {
            handleHackToggle(true)
        }
    }, [])

    const handleHackToggle = useCallback((value: boolean) => {
        setIsHackEnabled(value)
        if (Platform.OS === 'web') {
            if (value) {
                global._WORKLET = false
                // @ts-expect-error
                global._log = console.log
                // @ts-expect-error
                global._getAnimationTimestamp = () => performance.now()
                show({
                    type: 'success',
                    iconVisible: true,
                    message: 'Reanimated web hack enabled',
                })
            } else {
                delete global._WORKLET
                // @ts-expect-error
                delete global._log
                // @ts-expect-error
                delete global._getAnimationTimestamp
                show({
                    type: 'warning',
                    iconVisible: true,
                    message: 'Reanimated web hack disabled',
                })
            }
        }
    }, [])

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
