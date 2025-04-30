import { EventEmitter } from 'expo-modules-core'
import { Platform } from 'react-native'

import {
    AudioDevice,
    AudioDeviceCapabilities,
    DeviceDisconnectionBehavior,
    ConsoleLike,
} from './ExpoAudioStream.types'
import ExpoAudioStreamModule from './ExpoAudioStreamModule'

// Default device fallback for web and unsupported platforms
const DEFAULT_DEVICE: AudioDevice = {
    id: 'default',
    name: 'Default Microphone',
    type: 'builtin_mic',
    isDefault: true,
    isAvailable: true,
    capabilities: {
        sampleRates: [16000, 44100, 48000],
        channelCounts: [1, 2],
        bitDepths: [16, 24, 32],
        hasEchoCancellation: true,
        hasNoiseSuppression: true,
        hasAutomaticGainControl: true,
    },
}

// Helper function to map raw object to AudioDevice interface
// This handles potential inconsistencies from the native module
function mapRawDeviceToAudioDevice(rawDevice: any): AudioDevice {
    const capabilities = rawDevice.capabilities || {}
    return {
        id: rawDevice.id || 'unknown',
        name: rawDevice.name || 'Unknown Device',
        type: rawDevice.type || 'unknown',
        isDefault: rawDevice.isDefault || false,
        isAvailable:
            rawDevice.isAvailable !== undefined ? rawDevice.isAvailable : true, // Default to true if undefined
        capabilities: {
            sampleRates: capabilities.sampleRates || [16000, 44100, 48000], // Provide defaults
            channelCounts: capabilities.channelCounts || [1, 2],
            bitDepths: capabilities.bitDepths || [16, 24, 32],
            hasEchoCancellation: capabilities.hasEchoCancellation,
            hasNoiseSuppression: capabilities.hasNoiseSuppression,
            hasAutomaticGainControl: capabilities.hasAutomaticGainControl,
        },
    }
}

/**
 * Class that provides a cross-platform API for managing audio input devices
 */
export class AudioDeviceManager {
    private eventEmitter: InstanceType<typeof EventEmitter>
    private currentDeviceId: string | null = null
    private availableDevices: AudioDevice[] = []
    private deviceChangeListeners: Set<(devices: AudioDevice[]) => void> =
        new Set()
    private deviceListeners: Set<() => void> = new Set()
    private lastRefreshTime: number = 0
    private refreshInProgress: boolean = false
    private refreshDebounceMs: number = 500 // Minimum 500ms between refreshes
    private logger?: ConsoleLike

    constructor(options?: { logger?: ConsoleLike }) {
        this.eventEmitter = new EventEmitter(ExpoAudioStreamModule)
        this.logger = options?.logger

        // Listen for device change events from native modules if not on web
        if (Platform.OS !== 'web') {
            // Store the last event type to avoid duplicates
            let lastEventType: string | null = null
            let lastEventTime = 0

            this.eventEmitter.addListener(
                'deviceChangedEvent',
                (event: any) => {
                    // Skip processing duplicate events that occur too close together
                    const now = Date.now()
                    const isSimilarEvent =
                        lastEventType === event.type &&
                        now - lastEventTime < this.refreshDebounceMs

                    if (isSimilarEvent) {
                        this.logger?.debug(
                            `Skipping similar device event (${event.type}) received too soon`
                        )
                        return
                    }

                    // Update the last event tracking
                    lastEventType = event.type
                    lastEventTime = now

                    // Only refresh on meaningful events
                    if (
                        event.type === 'deviceConnected' ||
                        event.type === 'deviceDisconnected' ||
                        event.type === 'routeChanged'
                    ) {
                        this.logger?.debug(
                            `Processing device event: ${event.type}`
                        )
                        // Refresh devices and notify listeners regardless of the direct return value
                        this.refreshDevices()
                    }
                }
            )
        }
    }

    /**
     * Initialize the device manager with a logger
     * @param logger A logger instance that implements the ConsoleLike interface
     * @returns The manager instance for chaining
     */
    initWithLogger(logger: ConsoleLike): AudioDeviceManager {
        this.setLogger(logger)
        return this
    }

    /**
     * Set the logger instance
     * @param logger A logger instance that implements the ConsoleLike interface
     */
    setLogger(logger: ConsoleLike) {
        this.logger = logger
    }

    /**
     * Get all available audio input devices
     * @param options Optional settings to force refresh the device list. Can include a refresh flag.
     * @returns Promise resolving to an array of audio devices conforming to AudioDevice interface
     */
    async getAvailableDevices(options?: {
        refresh?: boolean
    }): Promise<AudioDevice[]> {
        try {
            if (Platform.OS === 'web') {
                this.availableDevices = await this.getWebAudioDevices()
            } else if (ExpoAudioStreamModule.getAvailableInputDevices) {
                // Expecting an array of raw device objects from native
                const rawDevices: any[] =
                    await ExpoAudioStreamModule.getAvailableInputDevices(
                        options
                    )
                // Map raw objects to the AudioDevice interface
                this.availableDevices = rawDevices.map(
                    mapRawDeviceToAudioDevice
                )
            } else {
                // Fallback for unsupported platforms
                this.availableDevices = [DEFAULT_DEVICE]
            }
            return this.availableDevices
        } catch (error) {
            this.logger?.error('Failed to get available devices:', error)
            this.availableDevices = [DEFAULT_DEVICE] // Ensure state is updated on error
            return this.availableDevices
        }
    }

    /**
     * Get the currently selected audio input device
     * @returns Promise resolving to the current device (conforming to AudioDevice) or null
     */
    async getCurrentDevice(): Promise<AudioDevice | null> {
        try {
            if (Platform.OS === 'web') {
                if (!this.currentDeviceId) {
                    // On web, return the typed default device if nothing is selected
                    return DEFAULT_DEVICE
                }
                // Refresh web devices to ensure the current one is up-to-date
                const webDevices = await this.getWebAudioDevices()
                return (
                    webDevices.find((d) => d.id === this.currentDeviceId) ||
                    DEFAULT_DEVICE // Fallback to default if current ID not found
                )
            } else if (ExpoAudioStreamModule.getCurrentInputDevice) {
                // Expecting a single raw device object or null from native
                const rawDevice: any | null =
                    await ExpoAudioStreamModule.getCurrentInputDevice()
                // Map to AudioDevice interface if not null
                return rawDevice ? mapRawDeviceToAudioDevice(rawDevice) : null
            } else {
                // Fallback for unsupported platforms
                return DEFAULT_DEVICE
            }
        } catch (error) {
            this.logger?.error('Failed to get current device:', error)
            return DEFAULT_DEVICE // Return default on error
        }
    }

    /**
     * Select a specific audio input device for recording
     * @param deviceId The ID of the device to select
     * @returns Promise resolving to a boolean indicating success
     */
    async selectDevice(deviceId: string): Promise<boolean> {
        try {
            let success = false
            if (Platform.OS === 'web') {
                // Check if the device exists before setting it
                const devices = await this.getWebAudioDevices()
                if (devices.some((d) => d.id === deviceId)) {
                    this.currentDeviceId = deviceId
                    success = true
                } else {
                    this.logger?.warn(
                        `Web: Device with ID ${deviceId} not found.`
                    )
                    success = false
                }
            } else if (ExpoAudioStreamModule.selectInputDevice) {
                success =
                    await ExpoAudioStreamModule.selectInputDevice(deviceId)
                if (success) {
                    this.currentDeviceId = deviceId
                }
            }
            // Refresh devices after selection attempt to update state
            await this.refreshDevices()
            return success
        } catch (error) {
            this.logger?.error('Failed to select device:', error)
            await this.refreshDevices() // Refresh even on error
            return false
        }
    }

    /**
     * Reset to the default audio input device
     * @returns Promise resolving to a boolean indicating success
     */
    async resetToDefaultDevice(): Promise<boolean> {
        try {
            let success = false
            if (Platform.OS === 'web') {
                this.currentDeviceId = 'default'
                success = true
            } else if (ExpoAudioStreamModule.resetToDefaultDevice) {
                success = await ExpoAudioStreamModule.resetToDefaultDevice()
                if (success) {
                    this.currentDeviceId = null
                }
            }
            // Refresh devices after reset attempt
            await this.refreshDevices()
            return success
        } catch (error) {
            this.logger?.error('Failed to reset to default device:', error)
            await this.refreshDevices() // Refresh even on error
            return false
        }
    }

    /**
     * Register a listener for device changes
     * @param listener Function to call when devices change (receives AudioDevice[])
     * @returns Function to remove the listener
     */
    addDeviceChangeListener(
        listener: (devices: AudioDevice[]) => void
    ): () => void {
        this.deviceChangeListeners.add(listener)

        // Immediately call listener with current devices if available
        if (this.availableDevices.length > 0) {
            listener([...this.availableDevices])
        }

        // Return a function to remove the listener
        return () => {
            this.deviceChangeListeners.delete(listener)
        }
    }

    /**
     * Refresh the list of available devices with debouncing and notify listeners.
     * @returns Promise resolving to the updated device list (AudioDevice[])
     */
    async refreshDevices(): Promise<AudioDevice[]> {
        const now = Date.now()

        if (this.refreshInProgress) {
            this.logger?.debug('Refresh already in progress, skipping')
            return this.availableDevices
        }

        // Always allow refresh if forced by native event or longer than 2s debounce
        const timeSinceLastRefresh = now - this.lastRefreshTime
        const shouldDebounce =
            timeSinceLastRefresh < this.refreshDebounceMs &&
            timeSinceLastRefresh < 2000

        if (shouldDebounce) {
            this.logger?.debug(
                `Refresh debounced, skipping (last refresh was ${timeSinceLastRefresh}ms ago)`
            )
            return this.availableDevices
        }

        this.logger?.debug('Refreshing devices...')
        this.refreshInProgress = true
        try {
            // Fetch the latest devices; getAvailableDevices handles mapping now
            const devices = await this.getAvailableDevices({ refresh: true })
            // availableDevices state is updated within getAvailableDevices
            this.notifyListeners() // Notify listeners with the updated list
            this.lastRefreshTime = Date.now()
            return devices // Return the fetched & mapped list
        } catch (error) {
            this.logger?.error('Error during refreshDevices:', error)
            return this.availableDevices // Return potentially stale list on error
        } finally {
            this.refreshInProgress = false
            this.logger?.debug('Refresh finished.')
        }
    }

    /**
     * Get audio input devices using the Web Audio API
     * @returns Promise resolving to an array of AudioDevice objects
     */
    private async getWebAudioDevices(): Promise<AudioDevice[]> {
        if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.enumerateDevices
        ) {
            return [DEFAULT_DEVICE]
        }

        try {
            const permissionStatus = await this.checkMicrophonePermission()

            if (permissionStatus === 'denied') {
                return [
                    {
                        ...DEFAULT_DEVICE,
                        name: 'Microphone Access Denied',
                        isAvailable: false,
                    },
                ]
            }

            if (permissionStatus !== 'granted') {
                try {
                    // Requesting stream often reveals device labels
                    await navigator.mediaDevices.getUserMedia({ audio: true })
                } catch (error) {
                    this.logger?.warn(
                        'Microphone permission request failed:',
                        error
                    )
                    return [
                        {
                            ...DEFAULT_DEVICE,
                            name: 'Microphone Access Required',
                            isAvailable: false,
                        },
                    ]
                }
            }

            const devices = await navigator.mediaDevices.enumerateDevices()
            const audioInputDevices = devices
                .filter((device) => device.kind === 'audioinput')
                .map((device) => this.mapWebDeviceToAudioDevice(device))

            const hasUnlabeledDevices = audioInputDevices.some(
                (device) =>
                    !device.name || device.name.startsWith('Microphone ')
            )

            let finalDevices = audioInputDevices
            if (hasUnlabeledDevices && this.isSafariOrIOS()) {
                finalDevices = this.enhanceDevicesForSafari(audioInputDevices)
            }

            if (finalDevices.length === 0) {
                finalDevices = [DEFAULT_DEVICE]
            }

            this.setupWebDeviceChangeListener()
            this.availableDevices = finalDevices // Update internal state
            return finalDevices
        } catch (error) {
            this.logger?.error('Failed to enumerate web audio devices:', error)
            this.availableDevices = [DEFAULT_DEVICE] // Update state on error
            return this.availableDevices
        }
    }

    /**
     * Check the current microphone permission status
     * @returns Permission state ('prompt', 'granted', or 'denied')
     */
    private async checkMicrophonePermission(): Promise<PermissionState> {
        if (!navigator.permissions || !navigator.permissions.query) {
            return 'prompt'
        }
        try {
            const permissionStatus = await navigator.permissions.query({
                name: 'microphone' as PermissionName,
            })
            permissionStatus.onchange = () => {
                // Refresh devices when permission changes
                this.refreshDevices()
            }
            return permissionStatus.state
        } catch (error) {
            this.logger?.warn('Permission query not supported:', error)
            return 'prompt'
        }
    }

    /**
     * Setup listener for device changes in web environment
     */
    private setupWebDeviceChangeListener() {
        if (
            typeof navigator === 'undefined' ||
            !navigator.mediaDevices ||
            this.deviceListeners.size > 0 // Avoid adding multiple listeners
        ) {
            return
        }

        const handleDeviceChange = () => {
            this.logger?.debug('Web device change detected.')
            // Refresh devices on change
            this.refreshDevices()
        }

        navigator.mediaDevices.addEventListener(
            'devicechange',
            handleDeviceChange
        )
        this.deviceListeners.add(handleDeviceChange)
        this.logger?.debug('Web device change listener added.')
    }

    /**
     * Check if the current browser is Safari or iOS WebKit
     */
    private isSafariOrIOS(): boolean {
        if (typeof navigator === 'undefined') return false
        const ua = navigator.userAgent
        return (
            /^((?!chrome|android).)*safari/i.test(ua) ||
            /iPad|iPhone|iPod/.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        )
    }

    /**
     * Create enhanced device information for Safari and privacy-restricted browsers
     * @param devices Array of AudioDevice objects, potentially unlabeled
     * @returns Array of enhanced AudioDevice objects
     */
    private enhanceDevicesForSafari(devices: AudioDevice[]): AudioDevice[] {
        const defaultDevice = devices.find((d) => d.isDefault)

        if (devices.length <= 1) {
            // Return a typed default device
            return [
                {
                    id: defaultDevice?.id || 'default',
                    name: 'Microphone (Browser Managed)',
                    type: 'builtin_mic',
                    isDefault: true,
                    isAvailable: true,
                    capabilities:
                        defaultDevice?.capabilities ||
                        DEFAULT_DEVICE.capabilities,
                },
            ]
        }

        // Provide more descriptive names for unlabeled devices
        return devices.map((device, index) => {
            if (!device.name || device.name.startsWith('Microphone ')) {
                const deviceTypes = [
                    'Built-in Microphone',
                    'External Microphone',
                    'Headset Microphone',
                ]
                const typeName = deviceTypes[index % deviceTypes.length]
                return {
                    ...device,
                    name: device.isDefault ? `${typeName} (Default)` : typeName,
                }
            }
            return device
        })
    }

    /**
     * Map a Web MediaDeviceInfo to our AudioDevice format
     * @param device The MediaDeviceInfo object from the browser
     * @returns An object conforming to the AudioDevice interface
     */
    private mapWebDeviceToAudioDevice(device: MediaDeviceInfo): AudioDevice {
        const isDefault = device.deviceId === 'default'
        const deviceType = this.inferDeviceType(device.label || '')

        // Provide reasonable default capabilities for web devices
        const defaultWebCapabilities: AudioDeviceCapabilities = {
            sampleRates: [16000, 44100, 48000],
            channelCounts: [1, 2],
            bitDepths: [16, 32], // Web Audio uses float32, common PCM might be 16/32
            hasEchoCancellation: true, // Often handled by browser
            hasNoiseSuppression: true, // Often handled by browser
            hasAutomaticGainControl: true, // Often handled by browser
        }

        return {
            id: device.deviceId,
            name:
                device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
            type: deviceType,
            isDefault,
            isAvailable: true, // Assume available if enumerated
            capabilities: defaultWebCapabilities,
        }
    }

    /**
     * Try to infer the device type from its name
     * @param deviceName The label of the device
     * @returns A string representing the inferred device type
     */
    private inferDeviceType(deviceName: string): string {
        const name = deviceName.toLowerCase()
        if (name.includes('bluetooth') || name.includes('airpods'))
            return 'bluetooth'
        if (name.includes('usb')) return 'usb'
        if (name.includes('headphone') || name.includes('headset')) {
            return name.includes('wired') ? 'wired_headset' : 'wired_headphones'
        }
        if (name.includes('speaker')) return 'speaker'
        return 'builtin_mic' // Default assumption
    }

    /**
     * Notify all registered listeners about device changes.
     */
    private notifyListeners(): void {
        // Pass a copy of the current devices array to listeners
        const devicesCopy = [...this.availableDevices]
        this.logger?.debug(
            `Notifying ${this.deviceChangeListeners.size} listeners with ${devicesCopy.length} devices.`
        )
        this.deviceChangeListeners.forEach((listener) => {
            try {
                listener(devicesCopy)
            } catch (error) {
                this.logger?.error('Error in device change listener:', error)
            }
        })
    }
}

// Create and export the singleton instance
export const audioDeviceManager = new AudioDeviceManager()

export { DeviceDisconnectionBehavior }
