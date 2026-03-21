import React, { useCallback, useMemo, useState } from 'react'

import { MaterialIcons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { Stack, useFocusEffect } from 'expo-router'
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { Button, RefreshControl, useTheme, useToast } from '@siteed/design-system'
import { clearLogs, getLogs } from '@siteed/react-native-logger'

import type { ListRenderItemInfo } from 'react-native'

export const LogViewer = () => {
  const { show } = useToast()
  const theme = useTheme()
  const styles = useMemo(() => getStyles({ theme }), [theme])
  const [logs, setLogs] = useState(getLogs())

  const handleRefresh = useCallback(() => {
    setLogs(getLogs())
  }, [])

  const handleClear = useCallback(() => {
    clearLogs()
    handleRefresh()
  }, [handleRefresh])

  const getSystemInfo = useCallback(() => {
    const runtimeVersion =
      typeof Constants.expoConfig?.runtimeVersion === 'string'
        ? Constants.expoConfig.runtimeVersion
        : 'unknown'
    const appVersion = Constants.expoConfig?.version ?? 'unknown'
    return { appVersion, runtimeVersion, platform: Platform.OS }
  }, [])

  const handleCopyWithSystemInfo = useCallback(async () => {
    try {
      const systemInfo = getSystemInfo()
      const systemInfoText = Object.entries(systemInfo)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')

      const logsText = logs
        .map((log) => `${log.timestamp} ${log.namespace} ${log.message}`)
        .join('\n')

      const fullText = `System Information:\n${systemInfoText}\n\nLogs:\n${logsText}`
      await Clipboard.setStringAsync(fullText)
      show({ iconVisible: true, message: 'Logs and system info copied to clipboard' })
    } catch {
      show({ iconVisible: true, message: 'Failed to copy information', type: 'error' })
    }
  }, [logs, show, getSystemInfo])

  const handleCopyLogs = useCallback(async () => {
    try {
      const logsText = logs
        .map((log) => `${log.timestamp} ${log.namespace} ${log.message}`)
        .join('\n')
      await Clipboard.setStringAsync(logsText)
      show({ iconVisible: true, message: 'Logs copied to clipboard' })
    } catch {
      show({ iconVisible: true, message: 'Failed to copy logs', type: 'error' })
    }
  }, [logs, show])

  useFocusEffect(
    useCallback(() => {
      handleRefresh()
    }, [handleRefresh]),
  )

  const renderItem = ({ item }: ListRenderItemInfo<(typeof logs)[0]>) => (
    <View style={styles.logEntry}>
      <View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
        <Text style={styles.context}>{item.namespace}</Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Logs',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Pressable onPress={handleClear} style={styles.headerButton}>
              <MaterialIcons name="delete" size={24} color={theme.colors.text} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${index}-${item.timestamp}`}
        style={styles.viewer}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
      />
      <View style={styles.mainButtonContainer}>
        <Button mode="contained" onPress={handleCopyLogs} style={styles.copyButton}>
          Copy Logs
        </Button>
        <Button mode="contained" onPress={handleCopyWithSystemInfo} style={styles.copyButton}>
          Copy with Info
        </Button>
      </View>
    </View>
  )
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      flex: 1,
      width: '100%',
      padding: 5,
    },
    context: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
    },
    logEntry: {},
    message: { fontSize: 10 },
    timestamp: { color: theme.colors.secondary, fontSize: 10 },
    viewer: {
      borderWidth: 1,
      flex: 1,
      minHeight: 100,
    },
    listContent: {
      paddingBottom: 16,
    },
    mainButtonContainer: {
      padding: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      flexDirection: 'row',
      gap: 8,
    },
    copyButton: {
      flex: 1,
    },
    headerButton: {
      padding: 4,
    },
  })

export default LogViewer
