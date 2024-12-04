// playground/src/app/_layout.tsx
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useTheme } from '@siteed/design-system'
import { AudioRecorderProvider } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'
import { useGlobalSearchParams } from 'expo-router'
import { Stack } from 'expo-router/stack'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { config } from '../config'
import { ApplicationContextProvider } from '../context/ApplicationProvider'
import { AudioFilesProvider } from '../context/AudioFilesProvider'
import { TranscriptionProvider } from '../context/TranscriptionProvider'
const logger = getLogger('RootLayout')

export default function RootLayout() {
    const baseUrl = Constants.expoConfig?.experiments?.baseUrl ?? ''
    const theme = useTheme()
    const { hack } = useGlobalSearchParams()

    useEffect(() => {
        logger.log(`Base URL: ${baseUrl}`)

        // FIXME: should be removed once react-native-reanimated is fixed https://github.com/software-mansion/react-native-reanimated/issues/6740
        // Apply the reanimated hack based on URL parameter
        if (Platform.OS === 'web') {
            const shouldApplyHack = hack !== 'false'
            logger.log(`hack: ${hack} --> shouldApplyHack: ${shouldApplyHack}`)
            if (shouldApplyHack) {
                global._WORKLET = false
                // @ts-expect-error
                global._log = console.log
                // @ts-expect-error
                global._getAnimationTimestamp = () => performance.now()
                logger.debug('Applied reanimated web hack')
            } else {
                // Remove the hack by deleting the global values
                delete global._WORKLET
                // @ts-expect-error
                delete global._log
                // @ts-expect-error
                delete global._getAnimationTimestamp
                logger.debug('Removed reanimated web hack')
            }
        }
    }, [baseUrl, hack])

    return (
        <ApplicationContextProvider debugMode>
            <TranscriptionProvider>
                <AudioRecorderProvider
                    config={{
                        debug: true,
                        audioWorkletUrl: config.audioWorkletUrl,
                        featuresExtratorUrl: config.featuresExtratorUrl,
                    }}
                >
                    <AudioFilesProvider>
                        <ThemeProvider
                            value={{
                                ...theme,
                                fonts: DefaultTheme.fonts,
                            }}
                        >
                            <Stack
                                screenOptions={{
                                    headerBackButtonMenuEnabled: false,
                                }}
                            >
                                <Stack.Screen
                                    name="(tabs)"
                                    options={{ headerShown: false }}
                                />
                                <Stack.Screen name="playbug" />
                            </Stack>
                        </ThemeProvider>
                    </AudioFilesProvider>
                </AudioRecorderProvider>
            </TranscriptionProvider>
        </ApplicationContextProvider>
    )
}
