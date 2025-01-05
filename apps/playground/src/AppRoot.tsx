import 'intl-pluralrules'
// Keep polyfills at the top

import { UIProvider, useThemePreferences } from '@siteed/design-system'
import { setLoggerConfig } from '@siteed/react-native-logger'
import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native-paper'

import { useReanimatedWebHack } from './hooks/useReanimatedWebHack'

setLoggerConfig({
    namespaces: '*',
    maxLogs: 20,
})

export const WithUIProvider = ({ children }: { children: React.ReactNode }) => {
    const { darkMode, isReady: isThemeReady } = useThemePreferences()
    const [ready, setReady] = useState(false)

    const { handleHackToggle, isReady: isReanimatedReady } =
        useReanimatedWebHack()

    useEffect(() => {
        handleHackToggle(true)
    }, [handleHackToggle])

    useEffect(() => {
        const timeout = setTimeout(() => setReady(true), 1000)
        return () => clearTimeout(timeout)
    }, [])

    if (!isThemeReady || !ready || !isReanimatedReady) {
        return <ActivityIndicator />
    }

    return (
        <>
            <StatusBar style={darkMode ? 'light' : 'dark'} />
            {children}
        </>
    )
}

export const AppRoot = () => {
    return (
        <UIProvider
            portalName="audio-portal"
            toastProviderProps={{
                styleOverrides: {
                    snackbarStyle: { marginBottom: 40 },
                },
            }}
        >
            <WithUIProvider>
                <ExpoRouterApp />
            </WithUIProvider>
        </UIProvider>
    )
}
