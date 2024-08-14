// playground/src/app/_layout.tsx
import { ThemeProvider } from '@react-navigation/native'
import { UIProvider, useTheme } from '@siteed/design-system'
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

const WithUI = (_: { children?: React.ReactNode }) => {
    const theme = useTheme()
    return (
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
                </Stack>
            </ThemeProvider>
        </AudioFilesProvider>
    )
}

export default function RootLayout() {
    const baseUrl = Constants.expoConfig?.experiments?.baseUrl ?? ''
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
                    <UIProvider
                        toastProviderProps={{
                            overrides: {
                                snackbarStyle: {
                                    marginBottom: 40,
                                },
                            },
                        }}
                    >
                        <WithUI />
                    </UIProvider>
                </AudioRecorderProvider>
            </TranscriptionProvider>
        </ApplicationContextProvider>
    )
}
