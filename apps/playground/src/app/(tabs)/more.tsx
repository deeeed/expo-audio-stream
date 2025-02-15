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
import { Image, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

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
                subLabel="Debug console logs"
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
            {!isWeb && (
                <ListItem
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: 0,
                    }}
                    label="Native Whisper"
                    subLabel="Native Whisper"
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
