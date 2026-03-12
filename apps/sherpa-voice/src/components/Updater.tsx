import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useTheme, type AppTheme } from '@siteed/design-system'

export interface UpdaterProps {
  isUpdateAvailable: boolean;
  checking: boolean;
  downloading: boolean;
  onUpdate: () => void;
  onCheck: () => void;
  canUpdate: boolean;
  lastChecked?: Date | null;
  error?: string | null;
}

const getStyles = ({ theme }: { theme: AppTheme }) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    lastCheckedText: {
      fontSize: 11,
      color: theme.colors.outline,
      marginTop: 4,
    },
    errorText: {
      fontSize: 11,
      color: theme.colors.error,
      marginTop: 4,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
    },
  })

export const Updater: React.FC<UpdaterProps> = ({
  isUpdateAvailable,
  checking,
  downloading,
  onUpdate,
  onCheck,
  canUpdate,
  lastChecked,
  error,
}) => {
  const theme = useTheme()
  const styles = useMemo(() => getStyles({ theme }), [theme])

  const formatLastChecked = () => {
    if (!lastChecked) return 'Never checked'
    const now = new Date()
    if (now.toDateString() === lastChecked.toDateString()) {
      return `Last checked: ${lastChecked.toLocaleTimeString()}`
    }
    return `Last checked: ${lastChecked.toLocaleDateString()}`
  }

  return (
    <View style={styles.container}>
      {isUpdateAvailable ? (
        <>
          <Text variant="bodyMedium">
            {downloading
              ? 'Downloading update...'
              : canUpdate
                ? 'Update ready to install'
                : 'A new version is available'}
          </Text>
          <View style={styles.buttonsRow}>
            {canUpdate ? (
              <Button
                mode="contained"
                loading={checking}
                disabled={checking}
                icon="restart"
                onPress={onUpdate}
              >
                Update Now
              </Button>
            ) : (
              <Button
                mode="contained"
                loading={downloading}
                disabled={downloading}
                icon="download"
                onPress={onCheck}
              >
                Download
              </Button>
            )}
          </View>
        </>
      ) : (
        <>
          <Button
            mode="outlined"
            loading={checking}
            disabled={checking}
            icon="update"
            onPress={onCheck}
          >
            Check for updates
          </Button>
          {lastChecked && (
            <Text style={styles.lastCheckedText}>{formatLastChecked()}</Text>
          )}
        </>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}
