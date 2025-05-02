import React from 'react'

import { ScrollView, StyleSheet } from 'react-native'

import { useTheme } from '@siteed/design-system'

import { useScreenHeader } from '../hooks/useScreenHeader'
import { AudioDeviceTest } from '../tests/AudioDeviceTest'

export default function AudioDeviceTestScreen() {
  const theme = useTheme()

  useScreenHeader({
    title: 'Audio Device Test',
    backBehavior: {
      fallbackUrl: '/more',
    },
  })

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  })

  return (
    <ScrollView style={styles.container}>
      <AudioDeviceTest />
    </ScrollView>
  )
} 