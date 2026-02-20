// playground/src/app/_layout.tsx
import { useEffect } from 'react'

import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import Constants from 'expo-constants'
import { Stack } from 'expo-router/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SystemBars } from 'react-native-edge-to-edge'

import { useTheme } from '@siteed/design-system'
import { AudioRecorderProvider } from '@siteed/expo-audio-studio'
import { getLogger } from '@siteed/react-native-logger'

import { ApplicationContextProvider } from '../context/ApplicationProvider'
import { AudioFilesProvider } from '../context/AudioFilesProvider'
import { TranscriptionProvider } from '../context/TranscriptionProvider'
import { WebAppBanner } from '../components/WebAppBanner'
import { AgenticBridgeSync } from '../components/AgenticBridgeSync'

// Install the __AGENTIC__ bridge on globalThis in dev mode
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (__DEV__) require('../agentic-bridge')

const logger = getLogger('RootLayout')

export default function RootLayout() {
    const baseUrl = Constants.expoConfig?.experiments?.baseUrl ?? ''
    const theme = useTheme()

    // No longer checking for updates on app startup
    useEffect(() => {
        logger.log(`Base URL: ${baseUrl}`)
    }, [baseUrl])

    // Create a merged theme that properly combines DefaultTheme with our custom theme
    const navigationTheme = {
        ...DefaultTheme,
        ...theme,
        colors: {
            ...DefaultTheme.colors,
            ...theme.colors,
        },
        fonts: DefaultTheme.fonts,
    }

    return (
        <SafeAreaProvider>
            <ApplicationContextProvider debugMode>
                <TranscriptionProvider>
                    <AudioRecorderProvider
                        config={{
                            logger: getLogger('AudioRecorderProvider'),
                            // audioWorkletUrl: config.audioWorkletUrl,
                            // featuresExtratorUrl: config.featuresExtratorUrl,
                        }}
                    >
                        <AudioFilesProvider>
                            <ThemeProvider value={navigationTheme}>
                                {/* Use SystemBars to manage system bars styling */}
                                <SystemBars style={theme.dark ? 'light' : 'dark'} />
                                
                                {/* WebAppBanner appears above all content on web platform */}
                                <WebAppBanner />
                                <AgenticBridgeSync />

                                <Stack
                                    screenOptions={{
                                        headerBackButtonMenuEnabled: false,
                                        headerStyle: {
                                            backgroundColor: theme.colors.background,
                                        },
                                        headerTintColor: theme.colors.text,
                                        // Configure for proper edge-to-edge display
                                        contentStyle: {
                                            backgroundColor: theme.colors.background,
                                        },
                                    }}
                                >
                                    <Stack.Screen
                                        name="(tabs)"
                                        options={{ headerShown: false }}
                                    />
                                    {/* <Stack.Screen name="playbug" /> */}
                                </Stack>
                            </ThemeProvider>
                        </AudioFilesProvider>
                    </AudioRecorderProvider>
                </TranscriptionProvider>
            </ApplicationContextProvider>
        </SafeAreaProvider>
    )
}
