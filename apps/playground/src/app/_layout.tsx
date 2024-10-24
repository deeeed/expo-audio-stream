// playground/src/app/_layout.tsx
import { ThemeProvider } from '@react-navigation/native'
import { useTheme } from '@siteed/design-system'
import { AudioRecorderProvider } from '@siteed/expo-audio-stream'
import { enabled, getLogger } from '@siteed/react-native-logger'
import Constants from 'expo-constants'
import { Stack } from 'expo-router/stack'
import { useEffect } from 'react'

import { config } from '../config'
import { ApplicationContextProvider } from '../context/ApplicationProvider'
import { AudioFilesProvider } from '../context/AudioFilesProvider'
import { TranscriptionProvider } from '../context/TranscriptionProvider'
const logger = getLogger('RootLayout')

export default function RootLayout() {
    const baseUrl = Constants.expoConfig?.experiments?.baseUrl ?? ''
    const theme = useTheme()

    useEffect(() => {
        logger.debug(`Base URL: ${baseUrl}`)
        console.log(`Base URL: ${baseUrl}`)
        console.debug(`logger`, logger)
        console.debug(`enabled()`, enabled('RootLayout'))
    }, [baseUrl])

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
                        <ThemeProvider value={theme}>
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
