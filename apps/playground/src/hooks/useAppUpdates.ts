import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import * as Updates from 'expo-updates'
import Constants from 'expo-constants'

import { useToast } from '@siteed/design-system'

import { baseLogger } from '../config'
import { isWeb } from '../utils/utils'

const logger = baseLogger.extend('useAppUpdates')

// Storage keys
const UPDATE_LAST_CHECKED_KEY = 'app.updates.lastChecked'
const UPDATE_ENABLED_KEY = 'app.updates.enabled'
const UPDATE_CHECK_INTERVAL_KEY = 'app.updates.checkInterval'

// Default check interval in milliseconds (12 hours)
const DEFAULT_CHECK_INTERVAL = 12 * 60 * 60 * 1000

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
  const [updatesEnabled, setUpdatesEnabled] = useState(true)
  const [checkInterval, setCheckInterval] = useState(DEFAULT_CHECK_INTERVAL)
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | undefined>(undefined)
  
  // Track if initial check has been done to avoid duplicate checks
  const initialCheckRef = useRef(false)
  const backgroundTaskRef = useRef(false)

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

  // Load settings from storage
  useEffect(() => {
    if (isWeb) return
    
    const loadSettings = async () => {
      try {
        // Load last checked time
        const lastCheckedStr = await AsyncStorage.getItem(UPDATE_LAST_CHECKED_KEY)
        if (lastCheckedStr) {
          setLastChecked(new Date(lastCheckedStr))
        }
        
        // Load updates enabled setting
        const updatesEnabledStr = await AsyncStorage.getItem(UPDATE_ENABLED_KEY)
        if (updatesEnabledStr !== null) {
          setUpdatesEnabled(updatesEnabledStr === 'true')
        }
        
        // Load check interval
        const checkIntervalStr = await AsyncStorage.getItem(UPDATE_CHECK_INTERVAL_KEY)
        if (checkIntervalStr) {
          setCheckInterval(parseInt(checkIntervalStr, 10))
        }
      } catch (error) {
        logger.error('Failed to load update settings', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    
    loadSettings()
  }, [])

  // Register background tasks for updates
  useEffect(() => {
    // Skip for web platform, dev mode, or if already registered or updates disabled
    if (isWeb || backgroundTaskRef.current || __DEV__ || !updatesEnabled) return
    
    // Mark as registered immediately to prevent double registration attempts
    backgroundTaskRef.current = true
    
    // Dynamically import BackgroundUpdater to avoid issues on web
    import('../component/BackgroundUpdater')
      .then(async ({ registerUpdateTask }) => {
        try {
          await registerUpdateTask()
          logger.info('Background update task registered successfully from useAppUpdates')
        } catch (error) {
          logger.error('Failed to register background update task', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
        return null // Return value to satisfy linter
      })
      .catch(err => {
        logger.error('Error loading BackgroundUpdater module', { error: String(err) })
      })
  }, [updatesEnabled])

  // Save last checked time to storage
  const saveLastChecked = useCallback(async (date: Date) => {
    try {
      await AsyncStorage.setItem(UPDATE_LAST_CHECKED_KEY, date.toISOString())
    } catch (error) {
      logger.error('Failed to save last checked time', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  // Toggle updates enabled/disabled
  const toggleUpdatesEnabled = useCallback(async () => {
    const newValue = !updatesEnabled
    setUpdatesEnabled(newValue)
    
    try {
      await AsyncStorage.setItem(UPDATE_ENABLED_KEY, String(newValue))
      
      // If enabling, register background task if needed
      if (newValue && !backgroundTaskRef.current && !isWeb && !__DEV__) {
        import('../component/BackgroundUpdater')
          .then(async ({ registerUpdateTask }) => {
            try {
              await registerUpdateTask()
              backgroundTaskRef.current = true
              logger.info('Background update task registered after enabling updates')
            } catch (error) {
              logger.error('Failed to register background update task', {
                error: error instanceof Error ? error.message : String(error),
              })
            }
            return null
          })
          .catch(err => {
            logger.error('Error loading BackgroundUpdater module', { error: String(err) })
          })
      } else if (!newValue && backgroundTaskRef.current && !isWeb) {
        // If disabling, unregister background task
        import('../component/BackgroundUpdater')
          .then(async ({ unregisterUpdateTask }) => {
            try {
              await unregisterUpdateTask()
              backgroundTaskRef.current = false
              logger.info('Background update task unregistered after disabling updates')
            } catch (error) {
              logger.error('Failed to unregister background update task', {
                error: error instanceof Error ? error.message : String(error),
              })
            }
            return null
          })
          .catch(err => {
            logger.error('Error loading BackgroundUpdater module', { error: String(err) })
          })
      }
    } catch (error) {
      logger.error('Failed to save updates enabled setting', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [updatesEnabled])

  // Set check interval
  const setUpdateCheckInterval = useCallback(async (interval: number) => {
    setCheckInterval(interval)
    
    try {
      await AsyncStorage.setItem(UPDATE_CHECK_INTERVAL_KEY, String(interval))
    } catch (error) {
      logger.error('Failed to save check interval', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

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

      if (!updatesEnabled) {
        logger.info('Updates are disabled')
        if (!silentCheck) {
          show({
            message: 'Automatic updates are disabled',
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
        saveLastChecked(now)

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
    [checking, downloading, show, updatesEnabled, saveLastChecked],
  )

  // Periodic update checks (only set up once, not on every mount)
  useEffect(() => {
    if (__DEV__ || initialCheckRef.current || !updatesEnabled) return

    initialCheckRef.current = true
    
    // Only set up the interval, don't check on mount (layout will do that)
    const intervalId = setInterval(() => {
      checkUpdates(true)
    }, checkInterval)
    
    return () => clearInterval(intervalId)
  }, [checkUpdates, checkInterval, updatesEnabled])

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
    updatesEnabled,
    toggleUpdatesEnabled,
    checkInterval,
    setUpdateCheckInterval,
    updateDetails,
  }
}
