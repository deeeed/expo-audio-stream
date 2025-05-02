import React from 'react'

import { View, StyleSheet } from 'react-native'
import { Text, ActivityIndicator } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useTheme } from '@siteed/design-system'
import type { TranscriberData } from '@siteed/expo-audio-studio/src/ExpoAudioStream.types'

import Transcript from '../component/Transcript'

interface TranscriptionResultsProps {
  transcriptionData?: TranscriberData;
  isLoading: boolean;
  error?: string;
  isProcessing: boolean;
}

export function TranscriptionResults({ 
  transcriptionData,
  isLoading,
  error,
  isProcessing, 
}: TranscriptionResultsProps) {
  const theme = useTheme()
  const styles = getStyles(theme)

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading transcription model...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.processingText}>Processing audio...</Text>
        </View>
      ) : (
        <Transcript
          transcribedData={transcriptionData}
          showActions={false}
          isBusy={isProcessing}
        />
      )}
    </View>
  )
}

const getStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    padding: theme.padding.m,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.padding.m,
    gap: theme.spacing.gap,
  },
  loadingText: {
    color: theme.colors.onSurface,
    marginTop: theme.margin.s,
  },
  errorText: {
    color: theme.colors.error,
  },
  processingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.padding.s,
    borderRadius: theme.roundness,
    marginBottom: theme.margin.s,
    gap: theme.spacing.gap,
  },
  processingText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
  },
}) 