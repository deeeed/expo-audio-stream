// playground/src/app/_layout.tsx
import { UIProvider } from '@siteed/design-system'
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
                        <AudioFilesProvider>
                            <Stack
                                screenOptions={{
                                    headerBackButtonMenuEnabled: false,
                                    // headerLeft: ({ label, canGoBack, tintColor }) => {
                                    //   if (canGoBack) {
                                    //     return (
                                    //       <MaterialIcons
                                    //         name="arrow-back-ios"
                                    //         size={24}
                                    //         color={tintColor}
                                    //         onPress={() => router.back()}
                                    //         style={{ paddingRight: 10, paddingLeft: 10 }}
                                    //       />
                                    //     );
                                    //   } else {
                                    //     return (
                                    //       <MaterialIcons
                                    //         name="home"
                                    //         size={24}
                                    //         color={tintColor}
                                    //         onPress={() => router.navigate("/")}
                                    //         style={{ paddingRight: 10, paddingLeft: 10 }}
                                    //       />
                                    //     );
                                    //   }
                                    // },
                                }}
                            >
                                <Stack.Screen
                                    name="(tabs)"
                                    options={{ headerShown: false }}
                                />
                            </Stack>
                        </AudioFilesProvider>
                    </UIProvider>
                </AudioRecorderProvider>
            </TranscriptionProvider>
        </ApplicationContextProvider>
    )
}
