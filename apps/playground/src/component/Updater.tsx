import React, { useMemo, useState } from 'react'

import { StyleSheet, View } from 'react-native'
import { Button, Text, Dialog, Portal } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useTheme } from '@siteed/design-system'

export interface UpdaterProps {
  isUpdateAvailable: boolean;
  checking: boolean;
  downloading: boolean;
  onUpdate: () => void;
  onCheck: () => void;
  canUpdate: boolean;
  runtimeVersion?: string;
  lastChecked?: Date | null;
  updateDetails?: {
    message?: string;
    updateId?: string;
  };
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      gap: 12,
    },
    infoText: {
      fontSize: 12,
      color: theme.colors.outline,
      marginTop: 4,
    },
    lastCheckedText: {
      fontSize: 11,
      color: theme.colors.outline,
      marginTop: 8,
      alignSelf: 'center',
    },
    dialogContent: {
      padding: 8,
    },
    dialogTitle: {
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 8,
    },
    dialogMessage: {
      marginBottom: 16,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 8,
    },
    buttonSpacer: {
      width: 8,
    },
  })
}

export const Updater: React.FC<UpdaterProps> = ({
  isUpdateAvailable,
  checking,
  downloading,
  onUpdate,
  onCheck,
  canUpdate,
  runtimeVersion,
  lastChecked,
  updateDetails,
}) => {
  const theme = useTheme()
  const styles = useMemo(() => getStyles({ theme }), [theme])
  const [detailsVisible, setDetailsVisible] = useState(false)

  const formatLastChecked = () => {
    if (!lastChecked) return 'Never checked'
    
    // If checked today, show time
    const now = new Date()
    const today = now.toDateString()
    const checkedDate = lastChecked.toDateString()
    
    if (today === checkedDate) {
      return `Last checked: ${lastChecked.toLocaleTimeString()}`
    }
    
    // Otherwise show date
    return `Last checked: ${lastChecked.toLocaleDateString()}`
  }

  const showUpdateDetails = () => {
    setDetailsVisible(true)
  }

  const hideUpdateDetails = () => {
    setDetailsVisible(false)
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
          
          {canUpdate ? (
            <View style={styles.buttonsRow}>
              <Button
                mode="contained"
                loading={checking}
                disabled={checking}
                icon="restart"
                onPress={onUpdate}
              >
                Update Now
              </Button>
              
              {updateDetails && (
                <>
                  <View style={styles.buttonSpacer} />
                  <Button
                    mode="outlined"
                    disabled={checking}
                    icon="information-outline"
                    onPress={showUpdateDetails}
                  >
                    Details
                  </Button>
                </>
              )}
            </View>
          ) : (
            <View style={styles.buttonsRow}>
              <Button
                mode="contained"
                loading={downloading}
                disabled={downloading}
                icon="download"
                onPress={onCheck}
              >
                Download
              </Button>
            </View>
          )}
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
            <Text style={styles.lastCheckedText}>
              {formatLastChecked()}
            </Text>
          )}
        </>
      )}
      
      <Portal>
        <Dialog visible={detailsVisible} onDismiss={hideUpdateDetails}>
          <Dialog.Title>Update Details</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {updateDetails?.message && (
              <Text style={styles.dialogMessage}>
                {updateDetails.message}
              </Text>
            )}
            {updateDetails?.updateId && (
              <Text style={styles.infoText}>
                Update ID: {updateDetails.updateId}
              </Text>
            )}
            {runtimeVersion && (
              <Text style={styles.infoText}>
                Runtime Version: {typeof runtimeVersion === 'string' ? runtimeVersion : 'Unknown'}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideUpdateDetails}>Close</Button>
            <Button mode="contained" onPress={() => {
              hideUpdateDetails();
              onUpdate();
            }}>
              Install
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}
