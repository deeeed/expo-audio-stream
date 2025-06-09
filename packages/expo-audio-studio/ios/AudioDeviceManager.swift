//
//  AudioDeviceManager.swift
//  Pods
//
//  Created by Arthur on 4/29/25.
//

import Foundation
import AVFoundation
import ExpoModulesCore

// MARK: - Delegate Protocol
protocol AudioDeviceManagerDelegate: AnyObject {
    func audioDeviceManager(_ manager: AudioDeviceManager, didDetectDisconnectionOfDevice deviceId: String)
    // Future delegate methods can be added here
}

/// Manages audio device detection, selection and capabilities
class AudioDeviceManager {
    // MARK: - Properties
    weak var delegate: AudioDeviceManagerDelegate? // Add delegate property

    // MARK: - Device Type Constants
    
    // Constants for device types - standardized across platforms
    private let deviceTypeBuiltinMic = "builtin_mic"
    private let deviceTypeBluetooth = "bluetooth"
    private let deviceTypeUSB = "usb"
    private let deviceTypeWiredHeadset = "wired_headset"
    private let deviceTypeWiredHeadphones = "wired_headphones"
    private let deviceTypeSpeaker = "speaker"
    private let deviceTypeUnknown = "unknown"
    
    // Flag to prevent infinite loops
    private static var isAudioSessionPrepared = false
    private static var lastPreparationTime: TimeInterval = 0

    // Observer handle
    private var routeChangeObserver: Any?

    // MARK: - Initialization and Deinitialization
    init() {
        // Start monitoring route changes on initialization
        startMonitoringDeviceChanges()
    }

    deinit {
        // Stop monitoring when the instance is deallocated
        stopMonitoringDeviceChanges()
    }

    // MARK: - Public Methods
    
    /// Maps AVAudioSession port types to standardized device types
    func mapDeviceType(_ portType: AVAudioSession.Port) -> String {
        Logger.debug("AudioDeviceManager", "Mapping device type for port: \(portType.rawValue)")
        switch portType {
        case .builtInMic:
            return deviceTypeBuiltinMic
        case .bluetoothHFP, .bluetoothA2DP, .bluetoothLE:
            return deviceTypeBluetooth
        case .headphones:
            return deviceTypeWiredHeadphones
        case .headsetMic:
            return deviceTypeWiredHeadset
        case .usbAudio:
            return deviceTypeUSB
        case .builtInSpeaker:
            return deviceTypeSpeaker
        default:
            return deviceTypeUnknown
        }
    }
    
    /// Prepares the audio session to detect all available devices, including Bluetooth
    private func prepareAudioSession(force: Bool = false) -> Bool {
        // Skip preparation if already prepared and not forcing
        let now = Date().timeIntervalSince1970
        let timeSinceLastPreparation = now - AudioDeviceManager.lastPreparationTime
        
        if AudioDeviceManager.isAudioSessionPrepared && !force && timeSinceLastPreparation < 5.0 {
            Logger.debug("AudioDeviceManager", "Audio session already prepared, skipping")
            return true
        }
        
        Logger.debug("AudioDeviceManager", "Preparing audio session for device detection")
        do {
            let session = AVAudioSession.sharedInstance()
            
            // Configure with options needed for Bluetooth detection
            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .allowBluetoothA2DP, .mixWithOthers])
            
            // Activate the session
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            
            // Give the system a moment to detect Bluetooth devices if needed
            // Minimal delay that still allows devices to be detected
            Thread.sleep(forTimeInterval: 0.1)
            
            // Mark as prepared
            AudioDeviceManager.isAudioSessionPrepared = true
            AudioDeviceManager.lastPreparationTime = now
            
            Logger.debug("AudioDeviceManager", "Audio session prepared for device detection")
            return true
        } catch {
            Logger.debug("AudioDeviceManager", "Failed to prepare audio session: \(error.localizedDescription)")
            return false
        }
    }
    
    /// Force a refresh of the audio session preparation
    public func forceRefreshAudioSession() -> Bool {
        // Only allow force refresh once every second to prevent excessive refreshes
        let now = Date().timeIntervalSince1970
        let timeSinceLastPreparation = now - AudioDeviceManager.lastPreparationTime
        
        if timeSinceLastPreparation < 1.0 {
            Logger.debug("AudioDeviceManager", "Skipping force refresh - too soon since last preparation (\(timeSinceLastPreparation) seconds)")
            return false
        }
        
        return prepareAudioSession(force: true)
    }
    
    /// Gets capabilities for an audio input device
    func getDeviceCapabilities(_ port: AVAudioSessionPortDescription) -> [String: Any] {
        Logger.debug("AudioDeviceManager", "Getting capabilities for device: \(port.portName) (ID: \(port.uid))")
        let session = AVAudioSession.sharedInstance()
        
        // Test standard sample rates for support
        let sampleRates = [8000, 16000, 22050, 44100, 48000, 96000].filter { rate in
            let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: Double(rate), channels: 1, interleaved: false)
            return session.isInputAvailable && format != nil
        }
        
        return [
            "sampleRates": sampleRates,
            "channelCounts": [1, 2], // Most iOS devices support mono and stereo
            "bitDepths": [16, 24],   // Common bit depths on iOS
            "hasEchoCancellation": true, // iOS doesn't expose this per-device, set to true as it's generally available
            "hasNoiseSuppression": true, // iOS doesn't expose this per-device, set to true as it's generally available
            "hasAutomaticGainControl": true // iOS doesn't expose this per-device, set to true as it's generally available
        ]
    }
    
    /// Gets a list of available audio input devices
    func getAvailableInputDevices(promise: Promise) {
        Logger.debug("AudioDeviceManager", "Getting available input devices")
        
        // Prepare audio session if needed
        let prepared = prepareAudioSession()
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, device list may be incomplete")
        }
        
        do {
            let session = AVAudioSession.sharedInstance()
            
            // We should have already activated the session in prepareAudioSession
            // But ensure it's active just in case
            try session.setActive(true)
            
            let currentPreferredInput = session.preferredInput
            
            var devices = [[String: Any]]()
            
            // First add current route devices as they're definitely available
            for input in session.currentRoute.inputs {
                let deviceType = mapDeviceType(input.portType)
                let isDefault = currentPreferredInput == nil ?
                    (input.portType == .builtInMic) : // Default is usually built-in mic
                    (input.uid == currentPreferredInput?.uid)
                
                let deviceId = normalizeBluetoothDeviceId(input.uid)
                
                Logger.debug("AudioDeviceManager", "Current route device: \(input.portName) (type: \(deviceType), ID: \(deviceId))")
                
                devices.append([
                    "id": deviceId,
                    "name": input.portName,
                    "type": deviceType,
                    "isDefault": isDefault,
                    "capabilities": getDeviceCapabilities(input),
                    "isAvailable": true,
                    "source": "currentRoute"
                ])
            }
            
            // Then add from availableInputs
            if let availableInputs = session.availableInputs {
                for port in availableInputs {
                    let deviceType = mapDeviceType(port.portType)
                    let isDefault = currentPreferredInput == nil ?
                        (port.portType == .builtInMic) : // Default is usually built-in mic
                        (port.uid == currentPreferredInput?.uid)
                    
                    let deviceId = normalizeBluetoothDeviceId(port.uid)
                    
                    // Skip if already in our list
                    if !devices.contains(where: { ($0["id"] as? String) == deviceId }) {
                        Logger.debug("AudioDeviceManager", "Available input: \(port.portName) (type: \(deviceType), ID: \(deviceId))")
                        
                        devices.append([
                            "id": deviceId,
                            "name": port.portName,
                            "type": deviceType,
                            "isDefault": isDefault,
                            "capabilities": getDeviceCapabilities(port),
                            "isAvailable": true,
                            "source": "availableInputs"
                        ])
                    }
                }
            }
            
            Logger.debug("AudioDeviceManager", "Found \(devices.count) available input devices")
            promise.resolve(devices)
        } catch {
            Logger.debug("AudioDeviceManager", "Error getting available input devices: \(error.localizedDescription)")
            promise.reject("DEVICE_DETECTION_ERROR", "Failed to get available audio devices: \(error.localizedDescription)")
        }
    }
    
    /// Gets the currently selected audio input device
    func getCurrentInputDevice(promise: Promise) {
        Logger.debug("AudioDeviceManager", "Getting current input device")
        
        // Prepare audio session if needed
        let prepared = prepareAudioSession()
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, current device may not be correctly detected")
        }
        
        do {
            let session = AVAudioSession.sharedInstance()
            
            // We should have already activated the session in prepareAudioSession
            // But ensure it's active just in case
            try session.setActive(true)
            
            // Check current route first
            if let currentPort = session.currentRoute.inputs.first {
                let deviceType = mapDeviceType(currentPort.portType)
                let isDefault = session.preferredInput == nil || session.preferredInput?.portType == currentPort.portType
                let deviceId = normalizeBluetoothDeviceId(currentPort.uid)
                
                Logger.debug("AudioDeviceManager", "Current input device: \(currentPort.portName) (ID: \(deviceId), type: \(deviceType))")
                
                let device: [String: Any] = [
                    "id": deviceId,
                    "name": currentPort.portName,
                    "type": deviceType,
                    "isDefault": isDefault,
                    "capabilities": getDeviceCapabilities(currentPort),
                    "isAvailable": true,
                    "source": "currentRoute"
                ]
                
                promise.resolve(device)
                return
            }
            
            // Fallback to preferred input
            if let preferredInput = session.preferredInput {
                let deviceType = mapDeviceType(preferredInput.portType)
                let deviceId = normalizeBluetoothDeviceId(preferredInput.uid)
                
                Logger.debug("AudioDeviceManager", "Current input from preferred: \(preferredInput.portName) (ID: \(deviceId), type: \(deviceType))")
                
                let device: [String: Any] = [
                    "id": deviceId,
                    "name": preferredInput.portName,
                    "type": deviceType,
                    "isDefault": true,
                    "capabilities": getDeviceCapabilities(preferredInput),
                    "isAvailable": true,
                    "source": "preferredInput"
                ]
                
                promise.resolve(device)
                return
            }
            
            // No input device is currently selected
            Logger.debug("AudioDeviceManager", "No current input device found")
            promise.resolve(nil)
        } catch {
            Logger.debug("AudioDeviceManager", "Error getting current input device: \(error.localizedDescription)")
            promise.reject("DEVICE_DETECTION_ERROR", "Failed to get current audio device: \(error.localizedDescription)")
        }
    }
    
    /// Gets the default audio input device (usually built-in mic)
    /// This is an async version useful for fallback logic.
    func getDefaultInputDevice() async -> AudioDevice? {
        Logger.debug("AudioDeviceManager", "Getting default input device")

        let prepared = prepareAudioSession()
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, default device detection may be inaccurate")
        }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setActive(true) // Ensure session is active

            // Find the built-in microphone port, which is typically the default fallback
            if let defaultPort = session.availableInputs?.first(where: { $0.portType == .builtInMic }) {
                let deviceType = mapDeviceType(defaultPort.portType)
                let deviceId = normalizeBluetoothDeviceId(defaultPort.uid)
                let capabilities = getDeviceCapabilities(defaultPort)

                 Logger.debug("AudioDeviceManager", "Found default device: \(defaultPort.portName) (ID: \(deviceId), Type: \(deviceType))")

                // Convert capabilities dictionary to Capabilities struct/object if needed
                 let audioCapabilities = AudioDeviceCapabilities(
                     sampleRates: capabilities["sampleRates"] as? [Int] ?? [],
                     channelCounts: capabilities["channelCounts"] as? [Int] ?? [],
                     bitDepths: capabilities["bitDepths"] as? [Int] ?? []
                     // Add boolean flags if available in your dictionary
                 )

                 return AudioDevice(
                     id: deviceId,
                     name: defaultPort.portName,
                     type: deviceType,
                     isDefault: true, // Assume it's the default we're looking for
                     capabilities: audioCapabilities,
                     isAvailable: true // It's available if found here
                 )
            } else {
                Logger.debug("AudioDeviceManager", "Could not find built-in mic as default device.")
                return nil
            }
        } catch {
            Logger.debug("AudioDeviceManager", "Error getting default input device: \(error)")
            return nil
        }
    }
    
    /// Selects a specific audio input device for recording
    func selectInputDevice(_ deviceId: String, promise: Promise) {
        Logger.debug("AudioDeviceManager", "Attempting to select input device with ID: \(deviceId)")
        
        // Prepare audio session - use force: true for device selection to ensure we get the latest devices
        let prepared = prepareAudioSession(force: true)
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, device selection may not work correctly")
        }
        
        do {
            let session = AVAudioSession.sharedInstance()
            
            // Ensure the session is active
            try session.setActive(true)
            
            // For Bluetooth devices, normalize and match by prefix
            let normalizedRequestedId = normalizeBluetoothDeviceId(deviceId)
            let isBluetoothDevice = deviceId.contains(":")
            
            Logger.debug("AudioDeviceManager", "Selecting \(isBluetoothDevice ? "Bluetooth" : "non-Bluetooth") device with normalized ID: \(normalizedRequestedId)")
            
            // Find the device with the specified ID
            let selectedPort: AVAudioSessionPortDescription?
            
            if isBluetoothDevice {
                // For Bluetooth devices, match by normalized ID
                selectedPort = session.availableInputs?.first { port in
                    let portNormalizedId = normalizeBluetoothDeviceId(port.uid)
                    let matches = portNormalizedId == normalizedRequestedId
                    Logger.debug("AudioDeviceManager", "Checking device \(port.portName) (ID: \(port.uid), Normalized: \(portNormalizedId)) - Matches: \(matches)")
                    return matches
                }
            } else {
                // For non-Bluetooth devices, direct match
                selectedPort = session.availableInputs?.first { port in
                    let matches = port.uid == deviceId
                    Logger.debug("AudioDeviceManager", "Checking device \(port.portName) (ID: \(port.uid)) - Matches: \(matches)")
                    return matches
                }
            }
            
            guard let selectedPort = selectedPort else {
                Logger.debug("AudioDeviceManager", "Device not found with ID \(deviceId)")
                
                // Log all available devices to help debugging
                if let availableInputs = session.availableInputs {
                    Logger.debug("AudioDeviceManager", "Available devices:")
                    for (index, device) in availableInputs.enumerated() {
                        Logger.debug("AudioDeviceManager", "\(index+1). \(device.portName) (ID: \(device.uid), Normalized: \(normalizeBluetoothDeviceId(device.uid)))")
                    }
                } else {
                    Logger.debug("AudioDeviceManager", "No available devices found")
                }
                
                promise.reject("DEVICE_NOT_FOUND", "The selected audio device is not available")
                return
            }
            
            // Set the preferred input device
            Logger.debug("AudioDeviceManager", "Setting preferred input to: \(selectedPort.portName) (ID: \(selectedPort.uid))")
            try session.setPreferredInput(selectedPort)
            
            // Verify selection
            if let currentInput = session.currentRoute.inputs.first {
                let succeeded = (currentInput.uid == selectedPort.uid || 
                                normalizeBluetoothDeviceId(currentInput.uid) == normalizeBluetoothDeviceId(selectedPort.uid))
                Logger.debug("AudioDeviceManager", "Device selection \(succeeded ? "succeeded" : "failed") - Current device: \(currentInput.portName) (ID: \(currentInput.uid))")
            }
            
            Logger.debug("AudioDeviceManager", "Device selected successfully")
            promise.resolve(true)
        } catch {
            Logger.debug("AudioDeviceManager", "Failed to select device: \(error.localizedDescription)")
            promise.reject("DEVICE_SELECTION_FAILED", "Failed to select audio device: \(error.localizedDescription)")
        }
    }
    
    /// Selects a specific audio input device asynchronously (useful for internal calls)
    func selectDevice(_ deviceId: String) async -> Bool {
        Logger.debug("AudioDeviceManager", "Attempting to select input device with ID: \(deviceId) (async)")

        let prepared = prepareAudioSession(force: true)
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, device selection may not work correctly")
            return false
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(true)

            let normalizedRequestedId = normalizeBluetoothDeviceId(deviceId)
            let isBluetoothDevice = deviceId.contains(":")

            Logger.debug("AudioDeviceManager", "Selecting \(isBluetoothDevice ? "Bluetooth" : "non-Bluetooth") device with normalized ID: \(normalizedRequestedId)")

            let selectedPort: AVAudioSessionPortDescription?
            if isBluetoothDevice {
                selectedPort = session.availableInputs?.first { port in
                    normalizeBluetoothDeviceId(port.uid) == normalizedRequestedId
                }
            } else {
                selectedPort = session.availableInputs?.first { $0.uid == deviceId }
            }

            guard let portToSet = selectedPort else {
                Logger.debug("AudioDeviceManager", "Device not found with ID \(deviceId) for async selection")
                return false
            }

            Logger.debug("AudioDeviceManager", "Setting preferred input to: \(portToSet.portName) (ID: \(portToSet.uid)) (async)")
            try session.setPreferredInput(portToSet)
             // Add a small delay hoping the system applies the change before potential next operations
            try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds

            // Optional: Verify selection succeeded (might be less reliable immediately after setting)
            if let currentInput = session.currentRoute.inputs.first {
                 let succeeded = (currentInput.uid == portToSet.uid || normalizeBluetoothDeviceId(currentInput.uid) == normalizedRequestedId)
                 Logger.debug("AudioDeviceManager", "Async selection verification: \(succeeded ? "succeeded" : "failed")")
                 return succeeded
             } else {
                 // If no current input after setting, assume failure
                 return false
             }

        } catch {
            Logger.debug("AudioDeviceManager", "Failed to select device asynchronously: \(error.localizedDescription)")
            return false
        }
    }
    
    /// Determines if a device is still available
    func isDeviceAvailable(_ deviceId: String) -> Bool {
        Logger.debug("AudioDeviceManager", "Checking availability for device ID: \(deviceId)")
        
        // Prepare audio session if needed
        let prepared = prepareAudioSession()
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, device availability check may not be accurate")
        }
        
        let session = AVAudioSession.sharedInstance()
        
        // Handle Bluetooth devices with multiple profiles (SCO, A2DP, etc.)
        let isBluetoothDevice = deviceId.contains(":")  // Most Bluetooth devices have MAC addresses with colons
        
        if isBluetoothDevice {
            // For Bluetooth devices, check if any device with the same MAC address prefix is available
            let baseDeviceId = deviceId.split(separator: "-").first ?? Substring(deviceId)
            
            // Log all available inputs for debugging
            Logger.debug("AudioDeviceManager", "Available devices to check against:")
            if let availableInputs = session.availableInputs {
                for (index, device) in availableInputs.enumerated() {
                    let normalizedId = normalizeBluetoothDeviceId(device.uid)
                    let matches = device.uid.starts(with: String(baseDeviceId))
                    Logger.debug("AudioDeviceManager", "\(index+1). \(device.portName) (ID: \(device.uid), Normalized: \(normalizedId)) - Matches: \(matches)")
                }
            } else {
                Logger.debug("AudioDeviceManager", "No available devices found")
            }
            
            // Also check current route
            for (index, input) in session.currentRoute.inputs.enumerated() {
                let normalizedId = normalizeBluetoothDeviceId(input.uid)
                let matches = input.uid.starts(with: String(baseDeviceId))
                Logger.debug("AudioDeviceManager", "Current route input \(index+1): \(input.portName) (ID: \(input.uid), Normalized: \(normalizedId)) - Matches: \(matches)")
            }
            
            let result = session.availableInputs?.contains { $0.uid.starts(with: String(baseDeviceId)) } ?? false
            Logger.debug("AudioDeviceManager", "Bluetooth device \(deviceId) with base ID \(baseDeviceId) available: \(result)")
            return result
        } else {
            // Standard device ID check for non-Bluetooth devices
            return session.availableInputs?.contains { $0.uid == deviceId } ?? false
        }
    }
    
    /// Resets the selected device to system default (usually built-in mic)
    /// - Parameter completion: Callback with success (Bool) and optional error
    func resetToDefaultDevice(completion: @escaping (Bool, Error?) -> Void) {
        Logger.debug("AudioDeviceManager", "Attempting to reset to default input device")
        
        // Prepare audio session if needed
        let prepared = prepareAudioSession()
        if !prepared {
            Logger.debug("AudioDeviceManager", "Warning: Audio session preparation failed, device reset may not work correctly")
        }
        
        do {
            let session = AVAudioSession.sharedInstance()
            
            // Log current device before reset
            if let currentDevice = session.currentRoute.inputs.first {
                Logger.debug("AudioDeviceManager", "Current device before reset: \(currentDevice.portName) (ID: \(currentDevice.uid))")
            } else {
                Logger.debug("AudioDeviceManager", "No current device before reset")
            }
            
            // Setting preferred input to nil lets the system choose the default
            try session.setPreferredInput(nil)
            
            // Log the device after reset
            if let newDevice = session.currentRoute.inputs.first {
                Logger.debug("AudioDeviceManager", "Reset to default device: \(newDevice.portName) (ID: \(newDevice.uid))")
                
                // Check if it's actually the built-in mic (which is the typical default)
                let isBuiltIn = newDevice.portType == .builtInMic
                Logger.debug("AudioDeviceManager", "Reset device is built-in mic: \(isBuiltIn)")
            } else {
                Logger.debug("AudioDeviceManager", "No device found after reset")
            }
            
            completion(true, nil)
        } catch {
            Logger.debug("AudioDeviceManager", "Failed to reset to default device: \(error.localizedDescription)")
            completion(false, error)
        }
    }
    
    /// Starts monitoring device connection/disconnection events
    private func startMonitoringDeviceChanges() {
        // Ensure we don't add multiple observers
        stopMonitoringDeviceChanges()

        Logger.debug("AudioDeviceManager", "Starting device change monitoring")
        routeChangeObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main // Process on main queue to avoid threading issues with delegate calls
        ) { [weak self] notification in
            self?.handleRouteChange(notification)
        }
    }

    /// Stops monitoring device changes
    private func stopMonitoringDeviceChanges() {
        if let observer = routeChangeObserver {
            Logger.debug("AudioDeviceManager", "Stopping device change monitoring")
            NotificationCenter.default.removeObserver(observer)
            routeChangeObserver = nil
        }
    }

    /// Handles route change notifications to detect device connections and disconnections
    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

         Logger.debug("AudioDeviceManager", "Route change detected, reason: \(reason.rawValue)")

        // Only proceed if a device was potentially removed or added or the route changed significantly
        guard reason == .oldDeviceUnavailable || reason == .newDeviceAvailable || reason == .override || reason == .routeConfigurationChange else {
             Logger.debug("AudioDeviceManager", "Ignoring route change reason: \(reason.rawValue)")
            return
        }

        // Get the *previous* route description
        guard let previousRoute = userInfo[AVAudioSessionRouteChangePreviousRouteKey] as? AVAudioSessionRouteDescription else {
            Logger.debug("AudioDeviceManager", "No previous route info found for device change check.")
            return
        }

        // Get the *current* available input devices
        let currentInputs = AVAudioSession.sharedInstance().availableInputs ?? []
        let currentInputIds = Set(currentInputs.map { normalizeBluetoothDeviceId($0.uid) })
        let previousInputIds = Set(previousRoute.inputs.map { normalizeBluetoothDeviceId($0.uid) })

                // Check for DISCONNECTED devices (were in previous route but not in current available)
        for previousInputPort in previousRoute.inputs {
            let normalizedPreviousId = normalizeBluetoothDeviceId(previousInputPort.uid)
            if !currentInputIds.contains(normalizedPreviousId) {
                 Logger.debug("AudioDeviceManager", "Detected disconnection of device: \(previousInputPort.portName) (Normalized ID: \(normalizedPreviousId))")
                 // Keep existing disconnection delegate method unchanged
                 delegate?.audioDeviceManager(self, didDetectDisconnectionOfDevice: normalizedPreviousId)
            }
        }

        // Check for CONNECTED devices (are in current available but were not in previous route)
        for currentInput in currentInputs {
            let normalizedCurrentId = normalizeBluetoothDeviceId(currentInput.uid)
            if !previousInputIds.contains(normalizedCurrentId) {
                Logger.debug("AudioDeviceManager", "Detected connection of device: \(currentInput.portName) (Normalized ID: \(normalizedCurrentId))")
                // Emit connection event via notification
                NotificationCenter.default.post(
                    name: NSNotification.Name("DeviceConnected"),
                    object: nil,
                    userInfo: ["deviceId": normalizedCurrentId]
                )
            }
        }
    }
    
    /// Normalizes Bluetooth device IDs by removing profile suffixes
    public func normalizeBluetoothDeviceId(_ deviceId: String) -> String {
        // For Bluetooth devices with MAC addresses and profile suffixes (like -tsco)
        if deviceId.contains(":") && deviceId.contains("-") {
            // Split by the hyphen and take the first part (the MAC address)
            return deviceId.split(separator: "-").first.map(String.init) ?? deviceId
        }
        return deviceId
    }
}

// Add structure for AudioDeviceCapabilities if not defined elsewhere
struct AudioDeviceCapabilities {
    let sampleRates: [Int]
    let channelCounts: [Int]
    let bitDepths: [Int]
    // Add boolean flags if needed
}

// Add structure for AudioDevice if not defined elsewhere
struct AudioDevice {
    let id: String
    let name: String
    let type: String
    let isDefault: Bool
    let capabilities: AudioDeviceCapabilities
    let isAvailable: Bool
}
