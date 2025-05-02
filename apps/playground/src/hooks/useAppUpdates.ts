import { useCallback, useState } from 'react'

import * as Updates from 'expo-updates'

import { useToast } from '@siteed/design-system'

import { baseLogger } from '../config'

const logger = baseLogger.extend('useAppUpdates')

export const useAppUpdates = () => {
  const { show } = useToast()
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const {
    currentlyRunning,
    isChecking: isCheckingUpdate,
    isDownloading: isDownloadingUpdate,
    isUpdateAvailable,
    downloadedUpdate,
  } = Updates.useUpdates()

  const canUpdate = Boolean(downloadedUpdate)

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

  const checkUpdates = useCallback(
    async (silentCheck?: boolean) => {
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

        if (result.isAvailable) {
          logger.log(`Update available, starting download...`)
          setDownloading(true)
          await Updates.fetchUpdateAsync()
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
  }
}
