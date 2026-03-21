import { useCallback, useState } from 'react'
import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import { baseLogger } from '../config'

const logger = baseLogger.extend('AppUpdates')

export interface UpdateDetails {
  updateId?: string;
  message?: string;
  createdAt?: Date;
}

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

const extractUpdateDetails = (update: UpdateWithManifest): UpdateDetails => {
  return {
    updateId: update.manifest?.id,
    message: update.manifest?.extra?.releaseMessage || 'New update available',
    createdAt: update.manifest?.createdAt
      ? new Date(update.manifest.createdAt)
      : undefined,
  }
}

export const useAppUpdates = () => {
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const {
    currentlyRunning,
    isChecking: isCheckingUpdate,
    isDownloading: isDownloadingUpdate,
    isUpdateAvailable,
    downloadedUpdate,
  } = Updates.useUpdates()

  const canUpdate = Boolean(downloadedUpdate)
  const runtimeVersion = Constants.expoConfig?.runtimeVersion || 'unknown'
  const appVersion = Constants.expoConfig?.version || 'unknown'

  const checkUpdates = useCallback(
    async (silentCheck = false) => {
      if (__DEV__) {
        if (!silentCheck) {
          setError('Update check skipped in dev mode')
        }
        return
      }

      if (checking || downloading) return

      logger.info('Checking for updates...')
      try {
        setChecking(true)
        setError(null)
        const result = await Updates.checkForUpdateAsync()
        setLastChecked(new Date())

        if (result.isAvailable) {
          logger.info('Update available, downloading...')
          setDownloading(true)
          const update = await Updates.fetchUpdateAsync()
          if (update) {
            const details = extractUpdateDetails(update)
            setUpdateDetails(details)
            logger.info(`Update downloaded: ${details.updateId || 'unknown'}`)
          }
        } else {
          logger.info('No update available')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        logger.warn(`Update check failed: ${msg}`)
      } finally {
        setChecking(false)
        setDownloading(false)
      }
    },
    [checking, downloading],
  )

  const doUpdate = useCallback(async () => {
    if (!downloadedUpdate) return
    logger.info('Applying downloaded update...')
    try {
      await Updates.reloadAsync()
    } catch (err) {
      logger.warn(`Failed to reload with update: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [downloadedUpdate])

  return {
    checkUpdates,
    checking: checking || isCheckingUpdate,
    downloading: downloading || isDownloadingUpdate,
    doUpdate,
    canUpdate,
    isUpdateAvailable,
    currentVersion: currentlyRunning?.updateId,
    isEmbedded: currentlyRunning?.isEmbeddedLaunch,
    runtimeVersion,
    appVersion,
    lastChecked,
    updateDetails,
    error,
  }
}
