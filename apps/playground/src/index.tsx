import '@expo/metro-runtime'
import { registerRootComponent } from 'expo'
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'

const STORYBOOK_MODE = process.env.EXPO_PUBLIC_STORYBOOK === 'true'

// Wrapper component that handles async loading
const AppWrapper = () => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (STORYBOOK_MODE) {
      console.log('Storybook mode enabled')
      // Use dynamic import to prevent Metro from bundling when not needed
      import('../.rnstorybook/index').then((module) => {
        setComponent(() => module.default)
        return module.default;
      }).catch((error) => {
        console.error('Failed to load Storybook:', error)
        setError('Failed to load Storybook')
        // Fallback to main app if Storybook fails to load
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AppRoot } = require('./AppRoot')
        setComponent(() => AppRoot)
      })
    } else {
      // Load main app synchronously
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppRoot } = require('./AppRoot')
      setComponent(() => AppRoot)
    }
  }, [])

  // Show loading screen while component is being loaded
  if (!Component) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>
          {STORYBOOK_MODE ? 'Loading Storybook...' : 'Loading App...'}
        </Text>
        {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}
      </View>
    )
  }

  return <Component />
}

registerRootComponent(AppWrapper)
