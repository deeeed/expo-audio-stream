import { useCallback, useState } from 'react'
import * as Updates from 'expo-updates'
import Constants from 'expo-constants'

import { useToast } from '@siteed/design-system'

import { baseLogger } from '../config'

const logger = baseLogger.extend('useAppUpdates')

export interface UpdateDetails {
  updateId?: string;
  message?: string;
  createdAt?: Date;
}

// Define a more specific type for update manifests
interface UpdateManifest {
  id?: string;
  createdAt?: string | number;
  extra?: {
    releaseMessage?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface UpdateWithManifest {
  manifest?: UpdateManifest;
  [key: string]: unknown;
}

// Update the extractUpdateDetails function to safely handle manifest properties
const extractUpdateDetails = (update: UpdateWithManifest): UpdateDetails => {
  // Handle manifest properties safely since the manifest structure may vary
  return {
    updateId: update.manifest?.id,
    message: update.manifest?.extra?.releaseMessage || 'New update available',
    createdAt: update.manifest?.createdAt 
      ? new Date(update.manifest.createdAt) 
      : undefined,
  }
}

export const useAppUpdates = () => {
  const { show } = useToast()
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | undefined>(undefined)

  const {
    currentlyRunning,
    isChecking: isCheckingUpdate,
    isDownloading: isDownloadingUpdate,
    isUpdateAvailable,
    downloadedUpdate,
  } = Updates.useUpdates()

  const canUpdate = Boolean(downloadedUpdate)

  // Get the current runtime version from Constants
  const runtimeVersion = Constants.expoConfig?.runtimeVersion || 'unknown'
  
  // Get app version from Constants
  const appVersion = Constants.expoConfig?.version || 'unknown'

  const checkUpdates = useCallback(
    async (silentCheck = false) => {
      if (__DEV__) {
        logger.info(`Skipping update check in dev mode`)
        if (!silentCheck) {
          show({
            message: 'Skipping update check in dev mode',
            type: 'info',
            iconVisible: true,
          })
        }
        return
      }

      if (checking || downloading) {
        logger.info('Update check or download already in progress')
        return
      }

      try {
        setChecking(true)
        logger.log(`Checking for updates...`)
        const result = await Updates.checkForUpdateAsync()
        
        const now = new Date()
        setLastChecked(now)

        if (result.isAvailable) {
          logger.log(`Update available, starting download...`)
          setDownloading(true)
          const update = await Updates.fetchUpdateAsync()
          
          // Extract and store update details using the helper function
          if (update) {
            setUpdateDetails(extractUpdateDetails(update))
          }
          
          if (!silentCheck) {
            show({
              message: 'Update downloaded and ready to install',
              type: 'info',
              iconVisible: true,
            })
          }
        } else if (!silentCheck) {
          show({
            message: 'Already up to date',
            type: 'success',
            iconVisible: true,
          })
        }
      } catch (err) {
        logger.error(`Update check failed`, {
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined,
        })
        if (!silentCheck) {
          show({
            message: 'Error checking for updates',
            type: 'error',
            iconVisible: true,
          })
        }
      } finally {
        setChecking(false)
        setDownloading(false)
      }
    },
    [checking, downloading, show],
  )

  const doUpdate = useCallback(async () => {
    if (!downloadedUpdate) {
      logger.warn('No downloaded update available')
      show({
        message: 'No update ready to install',
        type: 'warning',
        iconVisible: true,
      })
      return
    }

    logger.log(`Starting update process now`)
    try {
      await Updates.reloadAsync()
    } catch (err) {
      logger.error(`Failed to reload app with update`, {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
      })
      show({
        message: 'Failed to install update',
        type: 'error',
        iconVisible: true,
      })
    }
  }, [downloadedUpdate, show])

  return {
    checkUpdates,
    checking: checking || isCheckingUpdate,
    downloading: downloading || isDownloadingUpdate,
    downloadProgress: isDownloadingUpdate
      ? currentlyRunning?.launchDuration ?? 0
      : 0,
    doUpdate,
    canUpdate,
    isUpdateAvailable,
    currentVersion: currentlyRunning?.updateId,
    isEmbedded: currentlyRunning?.isEmbeddedLaunch,
    runtimeVersion,
    appVersion,
    lastChecked,
    updateDetails,
  }
}