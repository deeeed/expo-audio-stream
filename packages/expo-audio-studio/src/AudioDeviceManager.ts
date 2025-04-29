import { EventEmitter } from 'expo-modules-core'
import { Platform } from 'react-native'

import {
    AudioDevice,
    DeviceDisconnectionBehavior,
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
    },
}

/**
 * AudioDeviceManager provides a cross-platform API for managing audio input devices
 */
export class AudioDeviceManager {
    private eventEmitter: InstanceType<typeof EventEmitter>
    private currentDeviceId: string | null = null
    private availableDevices: AudioDevice[] = []
    private deviceChangeListeners: Set<(devices: AudioDevice[]) => void> =
        new Set()
    private deviceListeners: Set<() => void> = new Set()

    constructor() {
        this.eventEmitter = new EventEmitter(ExpoAudioStreamModule)

        // Listen for device change events from native modules if not on web
        if (Platform.OS !== 'web') {
            this.eventEmitter.addListener(
                'deviceChangedEvent',
                (event: any) => {
                    this.refreshDevices().then(() => {
                        this.notifyListeners()
                    })
                }
            )
        }
    }

    /**
     * Get all available audio input devices
     * @returns Promise resolving to an array of audio devices
     */
    async getAvailableDevices(): Promise<AudioDevice[]> {
        try {
            if (Platform.OS === 'web') {
                return await this.getWebAudioDevices()
            } else if (ExpoAudioStreamModule.getAvailableInputDevices) {
                const devices =
                    await ExpoAudioStreamModule.getAvailableInputDevices()
                this.availableDevices = devices
                return devices
            }

            // Fallback for unsupported platforms
            return [DEFAULT_DEVICE]
        } catch (error) {
            console.error('Failed to get available devices:', error)
            return [DEFAULT_DEVICE]
        }
    }

    /**
     * Get the currently selected audio input device
     * @returns Promise resolving to the current device or null if none selected
     */
    async getCurrentDevice(): Promise<AudioDevice | null> {
        try {
            if (Platform.OS === 'web') {
                if (!this.currentDeviceId) {
                    // On web, we might not have a device selected yet
                    return DEFAULT_DEVICE
                }

                const devices = await this.getWebAudioDevices()
                return (
                    devices.find((d) => d.id === this.currentDeviceId) ||
                    DEFAULT_DEVICE
                )
            } else if (ExpoAudioStreamModule.getCurrentInputDevice) {
                return await ExpoAudioStreamModule.getCurrentInputDevice()
            }

            return DEFAULT_DEVICE
        } catch (error) {
            console.error('Failed to get current device:', error)
            return DEFAULT_DEVICE
        }
    }

    /**
     * Select a specific audio input device for recording
     * @param deviceId The ID of the device to select
     * @returns Promise resolving to a boolean indicating success
     */
    async selectDevice(deviceId: string): Promise<boolean> {
        try {
            if (Platform.OS === 'web') {
                this.currentDeviceId = deviceId
                return true
            } else if (ExpoAudioStreamModule.selectInputDevice) {
                const success =
                    await ExpoAudioStreamModule.selectInputDevice(deviceId)
                if (success) {
                    this.currentDeviceId = deviceId
                }
                return success
            }

            return false
        } catch (error) {
            console.error('Failed to select device:', error)
            return false
        }
    }

    /**
     * Reset to the default audio input device
     * @returns Promise resolving to a boolean indicating success
     */
    async resetToDefaultDevice(): Promise<boolean> {
        try {
            if (Platform.OS === 'web') {
                this.currentDeviceId = 'default'
                return true
            } else if (ExpoAudioStreamModule.resetToDefaultDevice) {
                const success =
                    await ExpoAudioStreamModule.resetToDefaultDevice()
                if (success) {
                    this.currentDeviceId = null
                }
                return success
            }

            return false
        } catch (error) {
            console.error('Failed to reset to default device:', error)
            return false
        }
    }

    /**
     * Register a listener for device changes
     * @param listener Function to call when devices change
     * @returns Function to remove the listener
     */
    addDeviceChangeListener(
        listener: (devices: AudioDevice[]) => void
    ): () => void {
        this.deviceChangeListeners.add(listener)

        // Return a function to remove the listener
        return () => {
            this.deviceChangeListeners.delete(listener)
        }
    }

    /**
     * Refresh the list of available devices
     * @returns Promise resolving to the updated device list
     */
    async refreshDevices(): Promise<AudioDevice[]> {
        const devices = await this.getAvailableDevices()
        this.notifyListeners()
        return devices
    }

    /**
     * Get audio input devices using the Web Audio API
     * @returns Promise resolving to an array of audio devices
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
            // Check permission status first
            const permissionStatus = await this.checkMicrophonePermission()

            // If permission is denied, return early with appropriate device
            if (permissionStatus === 'denied') {
                return [
                    {
                        ...DEFAULT_DEVICE,
                        name: 'Microphone Access Denied',
                        isAvailable: false,
                    },
                ]
            }

            // Request permission if not already granted
            if (permissionStatus !== 'granted') {
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true })
                } catch (error) {
                    console.warn('Microphone permission request failed:', error)
                    return [
                        {
                            ...DEFAULT_DEVICE,
                            name: 'Microphone Access Required',
                            isAvailable: false,
                        },
                    ]
                }
            }

            // Get all media devices
            const devices = await navigator.mediaDevices.enumerateDevices()

            // Filter for audio input devices
            const audioInputDevices = devices
                .filter((device) => device.kind === 'audioinput')
                .map((device) => this.mapWebDeviceToAudioDevice(device))

            // Special case for Safari and privacy-restricted browsers
            // that return devices without labels
            const hasUnlabeledDevices = audioInputDevices.some(
                (device) =>
                    !device.name ||
                    device.name === 'Microphone' ||
                    device.name.startsWith('Microphone ')
            )

            if (hasUnlabeledDevices && this.isSafariOrIOS()) {
                // Create enhanced devices with better naming for Safari
                return this.enhanceDevicesForSafari(audioInputDevices)
            }

            if (audioInputDevices.length === 0) {
                return [DEFAULT_DEVICE]
            }

            // Set up device change listener for web
            this.setupWebDeviceChangeListener()

            this.availableDevices = audioInputDevices
            return audioInputDevices
        } catch (error) {
            console.error('Failed to enumerate web audio devices:', error)
            return [DEFAULT_DEVICE]
        }
    }

    /**
     * Check the current microphone permission status
     * @returns Permission state ('prompt', 'granted', or 'denied')
     */
    private async checkMicrophonePermission(): Promise<PermissionState> {
        if (!navigator.permissions || !navigator.permissions.query) {
            // Browsers that don't support permission API
            return 'prompt'
        }

        try {
            const permissionStatus = await navigator.permissions.query({
                name: 'microphone' as PermissionName,
            })

            // Set up listener for permission changes
            permissionStatus.onchange = () => {
                this.refreshDevices()
            }

            return permissionStatus.state
        } catch (error) {
            console.warn('Permission query not supported:', error)
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
            this.deviceListeners.size > 0
        ) {
            return
        }

        const handleDeviceChange = () => {
            this.refreshDevices()
        }

        navigator.mediaDevices.addEventListener(
            'devicechange',
            handleDeviceChange
        )
        this.deviceListeners.add(handleDeviceChange)
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
     */
    private enhanceDevicesForSafari(devices: AudioDevice[]): AudioDevice[] {
        // Find the default device
        const defaultDevice = devices.find((d) => d.isDefault)

        // If no devices or only one device, return a better version of the default
        if (devices.length <= 1) {
            return [
                {
                    id: defaultDevice?.id || 'default',
                    name: 'Microphone (Browser Managed)',
                    type: 'builtin_mic',
                    isDefault: true,
                    isAvailable: true,
                    capabilities: {
                        sampleRates: [16000, 44100, 48000],
                        channelCounts: [1, 2],
                        bitDepths: [16, 24, 32],
                        hasEchoCancellation: true,
                        hasNoiseSuppression: true,
                    },
                },
            ]
        }

        // For multiple unlabeled devices, provide more descriptive names
        return devices.map((device, index) => {
            if (
                !device.name ||
                device.name === 'Microphone' ||
                device.name.startsWith('Microphone ')
            ) {
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
     */
    private mapWebDeviceToAudioDevice(device: MediaDeviceInfo): AudioDevice {
        const isDefault = device.deviceId === 'default'
        const deviceType = this.inferDeviceType(device.label || '')

        return {
            id: device.deviceId,
            name:
                device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
            type: deviceType,
            isDefault,
            isAvailable: true,
            capabilities: {
                // We don't have detailed capabilities from web API, so use reasonable defaults
                // Most browsers support these sample rates
                sampleRates: [16000, 44100, 48000],
                channelCounts: [1, 2],
                // Web Audio API internally uses 32-bit float, but for PCM formats,
                // browsers commonly support 16-bit and 32-bit
                bitDepths: [16, 24, 32],
                // Add best guess for echo cancellation and noise suppression
                hasEchoCancellation: true,
                hasNoiseSuppression: true,
            },
        }
    }

    /**
     * Try to infer the device type from its name
     */
    private inferDeviceType(deviceName: string): string {
        const name = deviceName.toLowerCase()

        if (name.includes('bluetooth') || name.includes('airpods')) {
            return 'bluetooth'
        } else if (name.includes('usb')) {
            return 'usb'
        } else if (name.includes('headphone') || name.includes('headset')) {
            return name.includes('wired') ? 'wired_headset' : 'wired_headphones'
        } else if (name.includes('speaker')) {
            return 'speaker'
        }

        return 'builtin_mic'
    }

    /**
     * Notify all listeners about device changes
     */
    private notifyListeners(): void {
        this.deviceChangeListeners.forEach((listener) => {
            listener([...this.availableDevices])
        })
    }
}

// Create a singleton instance for convenience
export const audioDeviceManager = new AudioDeviceManager()

export { DeviceDisconnectionBehavior }
