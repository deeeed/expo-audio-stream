import 'intl-pluralrules'
// Keep polyfills at the top

import { UIProvider, useThemePreferences } from '@siteed/design-system'
import { setLoggerConfig } from '@siteed/react-native-logger'
import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'

setLoggerConfig({
    namespaces: '*',
    maxLogs: 20,
    disableExtraParamsInConsole: Platform.OS !== 'web',
})

export const WithUIProvider = ({ children }: { children: React.ReactNode }) => {
    const { darkMode } = useThemePreferences()

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
                overrides: {
                    snackbarStyle: { marginBottom: 40 },
                },
            }}
        >
            <ExpoRouterApp />
        </UIProvider>
    )
}
