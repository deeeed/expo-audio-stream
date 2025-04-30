import { useCallback, useEffect, useState } from 'react'

import { audioDeviceManager } from '../AudioDeviceManager'
import { AudioDevice } from '../ExpoAudioStream.types'

/**
 * React hook for managing audio input devices
 */
export function useAudioDevices() {
    const [devices, setDevices] = useState<AudioDevice[]>([])
    const [currentDevice, setCurrentDevice] = useState<AudioDevice | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Load devices on mount
    useEffect(() => {
        let isMounted = true

        const loadDevices = async () => {
            try {
                setLoading(true)
                setError(null)

                // Load available devices
                const availableDevices =
                    await audioDeviceManager.getAvailableDevices()
                if (isMounted) setDevices(availableDevices)

                // Get current device
                const device = await audioDeviceManager.getCurrentDevice()
                if (isMounted) setCurrentDevice(device)
            } catch (err) {
                console.error('Failed to load audio devices:', err)
                if (isMounted)
                    setError(
                        err instanceof Error
                            ? err
                            : new Error('Failed to load audio devices')
                    )
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        loadDevices()

        // Set up device change listener
        const removeListener = audioDeviceManager.addDeviceChangeListener(
            (updatedDevices: AudioDevice[]) => {
                if (isMounted) {
                    setDevices(updatedDevices)

                    // If our current device is no longer available, update it
                    if (
                        currentDevice &&
                        !updatedDevices.some(
                            (d: AudioDevice) => d.id === currentDevice.id
                        )
                    ) {
                        audioDeviceManager
                            .getCurrentDevice()
                            .then((newDevice: AudioDevice | null) => {
                                if (isMounted) setCurrentDevice(newDevice)
                            })
                    }
                }
            }
        )

        return () => {
            isMounted = false
            removeListener()
        }
    }, [])

    /**
     * Select a specific audio input device
     * @param deviceId The ID of the device to select
     * @returns Promise resolving to a boolean indicating success
     */
    const selectDevice = useCallback(
        async (deviceId: string): Promise<boolean> => {
            try {
                setLoading(true)
                setError(null)

                const success = await audioDeviceManager.selectDevice(deviceId)

                if (success) {
                    // Get the updated current device after selection
                    const device = await audioDeviceManager.getCurrentDevice()
                    setCurrentDevice(device)
                }

                return success
            } catch (err) {
                console.error('Failed to select audio device:', err)
                setError(
                    err instanceof Error
                        ? err
                        : new Error('Failed to select audio device')
                )
                return false
            } finally {
                setLoading(false)
            }
        },
        []
    )

    /**
     * Reset to the default audio input device
     * @returns Promise resolving to a boolean indicating success
     */
    const resetToDefaultDevice = useCallback(async (): Promise<boolean> => {
        try {
            setLoading(true)
            setError(null)

            const success = await audioDeviceManager.resetToDefaultDevice()

            if (success) {
                // Get the updated current device after reset
                const device = await audioDeviceManager.getCurrentDevice()
                setCurrentDevice(device)
            }

            return success
        } catch (err) {
            console.error('Failed to reset to default audio device:', err)
            setError(
                err instanceof Error
                    ? err
                    : new Error('Failed to reset to default audio device')
            )
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * Refresh the list of available devices
     */
    const refreshDevices = useCallback(async (): Promise<AudioDevice[]> => {
        try {
            setLoading(true)
            setError(null)

            const updatedDevices = await audioDeviceManager.refreshDevices()
            setDevices(updatedDevices)

            // Also refresh the current device
            const device = await audioDeviceManager.getCurrentDevice()
            setCurrentDevice(device)

            return updatedDevices
        } catch (err) {
            console.error('Failed to refresh audio devices:', err)
            setError(
                err instanceof Error
                    ? err
                    : new Error('Failed to refresh audio devices')
            )
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        devices,
        currentDevice,
        loading,
        error,
        selectDevice,
        resetToDefaultDevice,
        refreshDevices,
    }
}
