import * as TaskManager from 'expo-task-manager'
import * as BackgroundTask from 'expo-background-task'
import * as Updates from 'expo-updates'
import { baseLogger } from '../config'

const logger = baseLogger.extend('BackgroundUpdater')
const BACKGROUND_TASK_NAME = 'check-for-updates'

/**
 * Background task that checks for and downloads updates
 * The update will be applied next time the app is launched
 */
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
        if (__DEV__) {
            logger.info('Skipping background update check in dev mode')
            return BackgroundTask.BackgroundTaskResult.Success
        }

        logger.info('Checking for updates in background...')
        const update = await Updates.checkForUpdateAsync()

        if (update.isAvailable) {
            logger.info('Update available, downloading...')
            await Updates.fetchUpdateAsync()
            logger.info('Update downloaded successfully')
        } else {
            logger.info('No updates available')
        }

        return BackgroundTask.BackgroundTaskResult.Success
    } catch (error) {
        logger.error('Background update check failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        })
        return BackgroundTask.BackgroundTaskResult.Failed
    }
})

/**
 * Registers the background update task
 * Call this function when your app starts
 */
export async function registerUpdateTask(): Promise<void> {
    try {
        await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
            minimumInterval: 3600, // Check once per hour when backgrounded (in seconds)
        })
        logger.info('Background update task registered successfully')
    } catch (error) {
        logger.error('Failed to register background update task', {
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * Unregisters the background update task
 * Call this if you need to disable background updates
 */
export async function unregisterUpdateTask(): Promise<void> {
    try {
        await TaskManager.unregisterTaskAsync(BACKGROUND_TASK_NAME)
        logger.info('Background update task unregistered successfully')
    } catch (error) {
        logger.error('Failed to unregister background update task', {
            error: error instanceof Error ? error.message : String(error),
        })
    }
} 