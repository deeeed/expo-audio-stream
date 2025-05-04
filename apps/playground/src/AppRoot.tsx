import 'intl-pluralrules'
// Keep polyfills at the top

import React, { useEffect, useState } from 'react'

import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'
import { StatusBar } from 'expo-status-bar'
import { View, useColorScheme } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'
import { en, registerTranslation } from 'react-native-paper-dates'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import { UIProvider, useTheme, useThemePreferences } from '@siteed/design-system'
import { setLoggerConfig } from '@siteed/react-native-logger'

import { baseLogger } from './config'
import { useReanimatedWebHack } from './hooks/useReanimatedWebHack'
import { persistor, setThemePreferences, store, useAppDispatch, useAppSelector } from './store'

registerTranslation('en', en)
setLoggerConfig({
    namespaces: '*',
    maxLogs: 20,
})

const logger = baseLogger.extend('AppRoot')

export const WithUIProvider = ({ children }: { children: React.ReactNode }) => {
    const { darkMode, isReady: isThemeReady } = useThemePreferences()
    const theme = useTheme()
    const [ready, setReady] = useState(false)
    const { handleHackToggle, isReady: isReanimatedReady } = useReanimatedWebHack()

    useEffect(() => {
        handleHackToggle(true)
    }, [handleHackToggle])

    useEffect(() => {
        const timeout = setTimeout(() => setReady(true), 1000)
        return () => clearTimeout(timeout)
    }, [])

    if (!isThemeReady || !ready || !isReanimatedReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkMode ? theme.colors.background : '#FFFFFF' }}>
                <ActivityIndicator color={darkMode ? theme.colors.primary : undefined} />
            </View>
        )
    }

    return (
        <>
            <StatusBar style={darkMode ? 'light' : 'dark'} />
            {children}
        </>
    )
}

const AppContent = () => {
    const { themePreferences } = useAppSelector((state) => state.preferences)
    const dispatch = useAppDispatch()

    return (
        <UIProvider
            portalName="audio-portal"
            preferences={themePreferences}
            actions={{
                savePreferences: async (newPreferences) => {
                    logger.info('Saving preferences', newPreferences)
                    dispatch(setThemePreferences(newPreferences))
                },
            }}
            toastProviderProps={{
                isStackable: false,
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

// Simple loading screen that doesn't rely on theme hooks
const SimpleLoadingScreen = () => {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'
    
    return (
        <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: isDark ? '#121212' : '#FFFFFF' 
        }}>
            <ActivityIndicator color={isDark ? '#BB86FC' : undefined} />
        </View>
    )
}

export const AppRoot = () => {
    return (
        <Provider store={store}>
            <PersistGate loading={<SimpleLoadingScreen />} persistor={persistor}>
            <AppContent />
            </PersistGate>
        </Provider>
    )
}
