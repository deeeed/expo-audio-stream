import {
    AppTheme,
    LabelSwitch,
    ListItem,
    ScreenWrapper,
    useThemePreferences,
} from '@siteed/design-system'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useMemo, useState, useCallback, memo } from 'react'
import { Image, StyleSheet, View, Pressable } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from "@expo/vector-icons"
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated"

import { useReanimatedWebHack } from '../../hooks/useReanimatedWebHack'
import { isWeb } from '../../utils/utils'
import { Updater } from '../../component/Updater'
import { useAppUpdates } from '../../hooks/useAppUpdates'

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            gap: 10,
        },
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

/* eslint-disable-next-line @typescript-eslint/no-var-requires, global-require */
const logoSource = require('@assets/icon.png')

const AppInfoBanner = memo(function AppInfoBanner({
    theme,
}: {
    theme: AppTheme
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const animatedHeight = useSharedValue(56)
    const EXPANDED_HEIGHT = 200

    const animatedStyle = useAnimatedStyle(() => ({
        height: animatedHeight.value,
    }))

    const toggleExpanded = useCallback(() => {
        setIsExpanded((prev) => {
            const newIsExpanded = !prev
            animatedHeight.value = withTiming(newIsExpanded ? EXPANDED_HEIGHT : 56, {
                duration: 300,
            })
            return newIsExpanded
        })
    }, [])

    return (
        <Pressable onPress={toggleExpanded}>
            <Animated.View
                style={[
                    {
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                        overflow: "hidden",
                        backgroundColor: theme.colors.tertiaryContainer,
                    },
                    animatedStyle,
                ]}
            >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        <Text style={{ color: theme.colors.onTertiaryContainer }}>
                            About Audio Playground
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color={theme.colors.onTertiaryContainer}
                    />
                </View>

                {isExpanded && (
                    <Text
                        style={{
                            marginTop: 16,
                            color: theme.colors.onTertiaryContainer,
                        }}
                    >
                        Audio Playground is a professional audio recording application featuring advanced 
                        real-time waveform visualization. It demonstrates high-quality audio processing 
                        capabilities including live recording, playback, and visual representation of 
                        audio signals. Perfect for developers and audio enthusiasts looking to understand 
                        audio processing in mobile applications.
                    </Text>
                )}
            </Animated.View>
        </Pressable>
    )
})

export const MoreScreen = () => {
    const router = useRouter()
    const { toggleDarkMode, darkMode, theme } = useThemePreferences()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    const appVersion = Constants.expoConfig?.version
    const { isHackEnabled, handleHackToggle } = useReanimatedWebHack()
    const {
        checking,
        downloading,
        doUpdate,
        isUpdateAvailable,
        checkUpdates,
        canUpdate,
      } = useAppUpdates();

    return (
        <ScreenWrapper withScrollView useInsets contentContainerStyle={styles.container}>
            <View style={styles.iconContainer}>
                <Image
                    source={logoSource}
                    style={{ width: 100, height: 100 }}
                />
                <Text>Audio PlayGround</Text>
                <Text style={styles.version}>v{appVersion}</Text>
            </View>
            
            <AppInfoBanner theme={theme} />
            
            <LabelSwitch
                label="Dark Mode"
                containerStyle={{
                    backgroundColor: theme.colors.surface,
                }}
                onValueChange={toggleDarkMode}
                value={darkMode}
            />
            {!isWeb && (
                    <Updater
                        isUpdateAvailable={isUpdateAvailable}
                        checking={checking}
                        downloading={downloading}
                        onUpdate={doUpdate}
                onCheck={() => checkUpdates(false)}
                canUpdate={canUpdate}
                />
            )}

            {isWeb && (
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
                    margin: 0,
                }}
                label="Logs"
                subLabel="Console logs"
                onPress={() => {
                    router.navigate('/logs')
                }}
            />
            {isWeb && (
                <ListItem
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: 0,
                    }}
                label="Transcriber Config"
                subLabel="Configure model and AI parameters for transcription"
                    onPress={() => {
                        router.navigate('/transcription-config')
                    }}
                />
            )}
            <ListItem
                contentContainerStyle={{
                    backgroundColor: theme.colors.surface,
                    margin: 0,
                }}
                label="Permissions"
                subLabel="Check and request permissions"
                onPress={() => {
                    router.navigate('/permissions')
                }}
            />
            {!isWeb && __DEV__ && (
                <ListItem
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: 0,
                    }}
                    label="Native Whisper"
                    subLabel="Native Whisper (Dev Only)"
                    onPress={() => {
                        router.navigate('/nativewhisper')
                    }}
                />
            )}
            {/* <ListItem
                contentContainerStyle={{
                    backgroundColor: theme.colors.surface,
                    margin: 0,
                }}
                label="Infinite Canvas"
                subLabel="Minimal implementation for infinite canvas"
                onPress={() => {
                    router.navigate('/minimal')
                }}
            /> */}
        </ScreenWrapper>
    )
}

export default MoreScreen
