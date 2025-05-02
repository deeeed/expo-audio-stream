import React, { useCallback, useMemo, useState } from 'react'

import { MaterialIcons } from '@expo/vector-icons'
import * as Application from 'expo-application'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { useFocusEffect } from 'expo-router'
import { FlatList, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import type {
  AppTheme } from '@siteed/design-system'
import {
  Button,
  RefreshControl,
  useTheme,
  useToast,
} from '@siteed/design-system'
import { clearLogs, getLogs } from '@siteed/react-native-logger'

import { HeaderIcon } from '../component/HeaderIcon'
import { useScreenHeader } from '../hooks/useScreenHeader'
import { isWeb } from '../utils/utils'

import type { ListRenderItemInfo } from 'react-native'

type SystemInfo = {
  deviceName: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  buildVersion: string;
  runtimeVersion: string;
  appVariant: string;
};

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

  const getSystemInfo = useCallback(async (): Promise<SystemInfo> => {
    const runtimeVersion =
      typeof Constants.expoConfig?.runtimeVersion === 'string'
        ? Constants.expoConfig.runtimeVersion
        : 'unknown'
    const appVariant = Constants.expoConfig?.name.includes('_')
      ? Constants.expoConfig.name.split('_')[0]
      : 'production'

    return {
      deviceName: Device.deviceName ?? 'Unknown',
      osName: Device.osName ?? 'Unknown',
      osVersion: Device.osVersion ?? 'Unknown',
      appVersion: Application.nativeApplicationVersion ?? 'Unknown',
      buildVersion: Application.nativeBuildVersion ?? 'Unknown',
      runtimeVersion,
      appVariant,
    }
  }, [])

  const handleCopyWithSystemInfo = useCallback(async () => {
    try {
      const systemInfo = await getSystemInfo()
      const systemInfoText = Object.entries(systemInfo)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')

      const logsText = logs
        .map((log) => `${log.timestamp} ${log.namespace} ${log.message}`)
        .join('\n')

      const fullText = `System Information:\n${systemInfoText}\n\nLogs:\n${logsText}`
      await Clipboard.setStringAsync(fullText)
      show({
        iconVisible: true,
        message: 'Logs and system info copied to clipboard',
      })
    } catch (_err) {
      show({
        iconVisible: true,
        message: 'Failed to copy information',
        type: 'error',
      })
    }
  }, [logs, show, getSystemInfo])

  const handleCopyLogs = useCallback(() => {
    try {
      const logsText = logs
        .map((log) => `${log.timestamp} ${log.namespace} ${log.message}`)
        .join('\n')

      Clipboard.setStringAsync(logsText)
      show({
        iconVisible: true,
        message: 'Logs copied to clipboard',
      })
    } catch (_err) {
      show({
        iconVisible: true,
        message: 'Failed to copy logs',
        type: 'error',
      })
    }
  }, [logs, show])

  const renderHeaderIcons = useCallback(() => {
    return (
      <HeaderIcon
        IconComponent={MaterialIcons}
        name="delete"
        onPress={handleClear}
        activeColor={theme.colors.primary}
        inactiveColor={theme.colors.text}
        tooltip="Clear Logs"
      />
    )
  }, [handleClear, theme.colors])

  useScreenHeader({
    title: 'Logs',
    backBehavior: {
      fallbackUrl: '/more',
    },
    rightElements: renderHeaderIcons,
  })

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
        <Button
          mode="contained"
          onPress={handleCopyLogs}
          style={styles.copyButton}
        >
          Copy Logs
        </Button>
        {!isWeb && (
          <Button
            mode="contained"
            onPress={handleCopyWithSystemInfo}
            style={styles.copyButton}
          >
            Copy with System Info
          </Button>
        )}
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
  })

export default LogViewer
